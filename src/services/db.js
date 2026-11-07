import pg from 'pg';
import { requireEnv } from '../config/env.js';
import { getDailyLimit } from '../utils/validation.js';

const { Pool } = pg;

let pool = null;

// Lazily construct the pool so importing this module never reads the
// environment at load time. Keeps the module safe to import in serverless cold
// starts and in tooling that only needs the pure helpers.
function getPool() {
  if (!pool) {
    const connectionString = requireEnv('DATABASE_URL');
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (error) => {
      console.error('Postgres pool error:', error.message);
    });
  }
  return pool;
}

const SCHEMA = [
  `create table if not exists sidi_users (
     telegram_id text primary key,
     data jsonb not null,
     username text generated always as (nullif(lower(data->>'username'), '')) stored,
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists sidi_users_username_idx on sidi_users (username)`,
  `create index if not exists sidi_users_referred_by_idx on sidi_users ((data->>'referred_by'))`,
  `create table if not exists sidi_stats (
     key text primary key,
     value numeric not null default 0
   )`,
  `create table if not exists sidi_leaderboard (
     telegram_id text primary key,
     balance numeric not null default 0,
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists sidi_leaderboard_balance_idx on sidi_leaderboard (balance desc)`,
  `create table if not exists sidi_rate_limits (
     key text primary key,
     count integer not null default 0,
     expires_at timestamptz not null
   )`,
  `create table if not exists sidi_locks (
     key text primary key,
     expires_at timestamptz not null
   )`,
  `create table if not exists sidi_pending_payments (
     reference text primary key,
     data jsonb not null,
     expires_at timestamptz not null
   )`,
  `create index if not exists sidi_pending_payments_expires_idx on sidi_pending_payments (expires_at)`,
];

let schemaPromise = null;

// Create the schema on first use. The promise is memoised so concurrent callers
// in a cold start share a single round of DDL; a failure clears it so the next
// call retries.
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = getPool();
      for (const statement of SCHEMA) {
        await client.query(statement);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}

// ───── User Operations ─────

export async function getUser(telegramId) {
  const result = await query('select data from sidi_users where telegram_id = $1', [String(telegramId)]);
  return result.rows[0]?.data || null;
}

export async function saveUser(telegramId, userData) {
  await query(
    `insert into sidi_users (telegram_id, data) values ($1, $2::jsonb)
     on conflict (telegram_id) do update set data = excluded.data, updated_at = now()`,
    [String(telegramId), JSON.stringify(userData)]
  );
}

export async function updateUser(telegramId, updates) {
  const result = await query(
    `update sidi_users set data = data || $2::jsonb, updated_at = now()
     where telegram_id = $1 returning data`,
    [String(telegramId), JSON.stringify({ ...updates, last_active: Date.now() })]
  );
  return result.rows[0]?.data || null;
}

export async function getUserByUsername(username) {
  const clean = username.replace('@', '').toLowerCase();
  const result = await query('select data from sidi_users where username = $1', [clean]);
  return result.rows[0]?.data || null;
}

export async function getTelegramIdByUsername(username) {
  const clean = username.replace('@', '').toLowerCase();
  const result = await query('select telegram_id from sidi_users where username = $1', [clean]);
  return result.rows[0]?.telegram_id || null;
}

// ───── Transaction Operations ─────

export async function addTransaction(telegramId, tx) {
  const user = await getUser(telegramId);
  if (!user) return;
  const transactions = user.transactions || [];
  transactions.unshift({ ...tx, timestamp: Date.now() });
  if (transactions.length > 50) transactions.pop();
  await updateUser(telegramId, { transactions });
}

// ───── Daily Limit Tracking ─────

// Read-only view of a user's remaining daily transfer allowance. Used for
// pre-flight checks so that merely previewing a transfer never mutates state.
export async function getDailyLimitStatus(telegramId) {
  const user = await getUser(telegramId);
  if (!user) return { allowed: false, remaining: 0 };

  const today = new Date().toISOString().split('T')[0];
  const dailyTotal = user.daily_tx_date === today ? user.daily_tx_total || 0 : 0;
  const limit = getDailyLimit(user.is_premium);
  return { allowed: dailyTotal < limit, remaining: limit - dailyTotal };
}

export async function checkAndUpdateDailyLimit(telegramId, amount) {
  const user = await getUser(telegramId);
  if (!user) return { allowed: false, remaining: 0 };

  const today = new Date().toISOString().split('T')[0];
  let dailyTotal = user.daily_tx_total || 0;

  if (user.daily_tx_date !== today) {
    dailyTotal = 0;
  }

  const limit = getDailyLimit(user.is_premium);
  const remaining = limit - dailyTotal;

  if (amount > remaining) {
    return { allowed: false, remaining };
  }

  await updateUser(telegramId, {
    daily_tx_total: dailyTotal + amount,
    daily_tx_date: today,
  });

  return { allowed: true, remaining: remaining - amount };
}

// ───── Contacts ─────

export async function addContact(telegramId, contact) {
  const user = await getUser(telegramId);
  if (!user) return;
  const contacts = user.saved_contacts || [];
  const existing = contacts.findIndex(
    (c) => c.username === contact.username
  );
  if (existing >= 0) {
    contacts[existing] = { ...contacts[existing], ...contact, last_sent: Date.now() };
  } else {
    contacts.unshift({ ...contact, added: Date.now(), last_sent: Date.now() });
  }
  if (contacts.length > 20) contacts.pop();
  await updateUser(telegramId, { saved_contacts: contacts });
}

// ───── Platform Stats ─────

export async function incrementStat(key, amount = 1) {
  await query(
    `insert into sidi_stats (key, value) values ($1, $2)
     on conflict (key) do update set value = sidi_stats.value + excluded.value`,
    [key, amount]
  );
}

export async function setStat(key, value) {
  await query(
    `insert into sidi_stats (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    [key, value]
  );
}

export async function getStat(key) {
  const result = await query('select value from sidi_stats where key = $1', [key]);
  return Number(result.rows[0]?.value) || 0;
}

export async function getStats() {
  const keys = [
    'total_users',
    'total_transactions',
    'total_volume_ngn',
    'total_fees_ngn',
    'today_transactions',
    'today_volume_ngn',
    'circulating_supply',
  ];
  const stats = {};
  for (const key of keys) {
    stats[key] = await getStat(key);
  }
  return stats;
}

// Resets the daily counters. Invoked by the scheduled daily reset.
export async function resetDailyStats() {
  await query(
    `insert into sidi_stats (key, value)
     values ('today_transactions', 0), ('today_volume_ngn', 0)
     on conflict (key) do update set value = 0`
  );
}

// ───── Leaderboard ─────

export async function updateLeaderboard(telegramId, balance) {
  await query(
    `insert into sidi_leaderboard (telegram_id, balance) values ($1, $2)
     on conflict (telegram_id) do update set balance = excluded.balance, updated_at = now()`,
    [String(telegramId), balance]
  );
}

// Returns a flat [member, score, member, score, ...] list ordered by balance.
export async function getLeaderboard(count = 10) {
  const result = await query(
    'select telegram_id, balance from sidi_leaderboard order by balance desc limit $1',
    [count]
  );
  const entries = [];
  for (const row of result.rows) {
    entries.push(row.telegram_id, Number(row.balance));
  }
  return entries;
}

export async function getUserRank(telegramId) {
  const result = await query(
    `select
       (select balance from sidi_leaderboard where telegram_id = $1) as my_balance,
       (select count(*)::int from sidi_leaderboard
          where balance > (select balance from sidi_leaderboard where telegram_id = $1)) as higher`,
    [String(telegramId)]
  );
  const row = result.rows[0];
  if (!row || row.my_balance === null) return null;
  return row.higher + 1;
}

// ───── Rate Limiting ─────

export async function checkRateLimit(telegramId) {
  const result = await query(
    `insert into sidi_rate_limits (key, count, expires_at)
     values ($1, 1, now() + interval '1 hour')
     on conflict (key) do update set
       count = case when sidi_rate_limits.expires_at < now() then 1 else sidi_rate_limits.count + 1 end,
       expires_at = case when sidi_rate_limits.expires_at < now()
                         then now() + interval '1 hour' else sidi_rate_limits.expires_at end
     returning count`,
    [`rate_${telegramId}`]
  );
  return result.rows[0].count <= 10;
}

// ───── Mutual exclusion ─────

// Best-effort per-key lock backed by a conditional upsert. Serialises
// money-moving operations for a single user so two concurrent callbacks cannot
// both pass a balance check and spend the same SIDI (see docs/PAYMENTS.md §3.3).
export async function acquireLock(key, ttlSeconds = 15) {
  const result = await query(
    `insert into sidi_locks (key, expires_at) values ($1, now() + make_interval(secs => $2::int))
     on conflict (key) do update set expires_at = excluded.expires_at
     where sidi_locks.expires_at < now()
     returning key`,
    [`lock_${key}`, ttlSeconds]
  );
  return result.rowCount > 0;
}

export async function releaseLock(key) {
  await query('delete from sidi_locks where key = $1', [`lock_${key}`]);
}

// ───── Pending Payment Tracking ─────

export async function setPendingPayment(reference, data) {
  await query(
    `insert into sidi_pending_payments (reference, data, expires_at)
     values ($1, $2::jsonb, now() + interval '30 minutes')
     on conflict (reference) do update set data = excluded.data, expires_at = excluded.expires_at`,
    [reference, JSON.stringify(data)]
  );
}

export async function getPendingPayment(reference) {
  const result = await query(
    'select data from sidi_pending_payments where reference = $1 and expires_at > now()',
    [reference]
  );
  return result.rows[0]?.data || null;
}

export async function deletePendingPayment(reference) {
  await query('delete from sidi_pending_payments where reference = $1', [reference]);
}

// Atomically fetch and remove a pending payment. Returns the record at most
// once per reference, which makes webhook crediting idempotent: a replayed
// event finds nothing to consume and is ignored.
export async function consumePendingPayment(reference) {
  const result = await query(
    'delete from sidi_pending_payments where reference = $1 and expires_at > now() returning data',
    [reference]
  );
  return result.rows[0]?.data || null;
}

// ───── All Users (for broadcast) ─────

export async function getAllUserIds() {
  const result = await query('select telegram_id from sidi_users');
  return result.rows.map((row) => row.telegram_id);
}
