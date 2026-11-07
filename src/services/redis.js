import { Redis } from '@upstash/redis';
import { requireEnv } from '../config/env.js';
import { getDailyLimit } from '../utils/validation.js';

let client = null;

// Lazily construct the client so that importing this module does not read the
// environment at load time. This keeps the module safe to import in serverless
// cold starts and in tooling that only needs the pure helpers.
export function getRedis() {
  if (!client) {
    client = new Redis({
      url: requireEnv('KV_REST_API_URL'),
      token: requireEnv('KV_REST_API_TOKEN'),
    });
  }
  return client;
}

const redis = {
  get: (...args) => getRedis().get(...args),
  set: (...args) => getRedis().set(...args),
  del: (...args) => getRedis().del(...args),
  incr: (...args) => getRedis().incr(...args),
  incrby: (...args) => getRedis().incrby(...args),
  expire: (...args) => getRedis().expire(...args),
  scan: (...args) => getRedis().scan(...args),
  zadd: (...args) => getRedis().zadd(...args),
  zrange: (...args) => getRedis().zrange(...args),
  zrevrank: (...args) => getRedis().zrevrank(...args),
  eval: (...args) => getRedis().eval(...args),
};

// ───── User Operations ─────

export async function getUser(telegramId) {
  const data = await redis.get(`user_${telegramId}`);
  return data || null;
}

export async function saveUser(telegramId, userData) {
  await redis.set(`user_${telegramId}`, userData);
  // Also index by username for lookup
  if (userData.username) {
    await redis.set(`username_${userData.username.toLowerCase()}`, telegramId);
  }
}

export async function updateUser(telegramId, updates) {
  const user = await getUser(telegramId);
  if (!user) return null;
  const updated = { ...user, ...updates, last_active: Date.now() };
  await saveUser(telegramId, updated);
  return updated;
}

export async function getUserByUsername(username) {
  const clean = username.replace('@', '').toLowerCase();
  const telegramId = await redis.get(`username_${clean}`);
  if (!telegramId) return null;
  return getUser(telegramId);
}

export async function getTelegramIdByUsername(username) {
  const clean = username.replace('@', '').toLowerCase();
  return redis.get(`username_${clean}`);
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
  await redis.incrby(`stats_${key}`, amount);
}

export async function getStat(key) {
  const val = await redis.get(`stats_${key}`);
  return Number(val) || 0;
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

// ───── Leaderboard ─────

export async function updateLeaderboard(telegramId, balance) {
  await redis.zadd('leaderboard', { score: balance, member: String(telegramId) });
}

export async function getLeaderboard(count = 10) {
  const entries = await redis.zrange('leaderboard', 0, count - 1, { rev: true, withScores: true });
  return entries;
}

export async function getUserRank(telegramId) {
  const rank = await redis.zrevrank('leaderboard', String(telegramId));
  return rank !== null ? rank + 1 : null;
}

// ───── Rate Limiting ─────

export async function checkRateLimit(telegramId) {
  const key = `rate_${telegramId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  return count <= 10;
}

// ───── Mutual exclusion ─────

// Best-effort per-key lock backed by Redis SET NX. Serialises money-moving
// operations for a single user so two concurrent callbacks cannot both pass a
// balance check and spend the same SIDI (see docs/PAYMENTS.md §3.3).
export async function acquireLock(key, ttlSeconds = 15) {
  const result = await getRedis().set(`lock_${key}`, '1', { nx: true, ex: ttlSeconds });
  return result === 'OK' || result === true;
}

export async function releaseLock(key) {
  await redis.del(`lock_${key}`);
}

// ───── Pending Payment Tracking ─────

export async function setPendingPayment(reference, data) {
  await redis.set(`payment_${reference}`, data, { ex: 1800 }); // 30 min expiry
}

export async function getPendingPayment(reference) {
  return redis.get(`payment_${reference}`);
}

export async function deletePendingPayment(reference) {
  await redis.del(`payment_${reference}`);
}

// Atomically fetch and remove a pending payment. Returns the record at most
// once per reference, which makes webhook crediting idempotent: a replayed
// event finds nothing to consume and is ignored.
export async function consumePendingPayment(reference) {
  return getRedis().getdel(`payment_${reference}`);
}

// ───── All Users (for broadcast) ─────

export async function getAllUserIds() {
  const keys = [];
  let cursor = 0;
  do {
    const result = await redis.scan(cursor, { match: 'user_*', count: 100 });
    cursor = result[0];
    const userKeys = result[1].filter((k) => k.startsWith('user_') && !k.startsWith('username_'));
    keys.push(...userKeys);
  } while (cursor !== 0);
  return keys.map((k) => k.replace('user_', ''));
}

export default redis;
