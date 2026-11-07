# AGENTS.md — Sidicoin

Repository-specific knowledge for future sessions.

## What this project is

A Telegram bot + Next.js brand-assets site for **Sidicoin**, a SIDI token on the
TON blockchain. Users register via `/start` (a TON wallet is generated), buy SIDI
with Naira through Korapay, send SIDI to other Telegram users, and cash out to
Nigerian bank accounts.

## Layout

| Path | Purpose |
| --- | --- |
| `server.js` | Long-running Express server. Validates env, mounts the shared app, registers the Telegram webhook, schedules the daily stats reset. |
| `api/index.js` | Vercel serverless entry. Same app, no `listen`, no fixed port. |
| `src/app.js` | `createApp()` — the single Express app used by both entries. Captures `req.rawBody`. |
| `src/config/env.js` | Environment validation. `validateEnv()` (startup), `requireEnv()` / `hasEnv()` (point of use). |
| `src/routes/` | `telegram.js`, `korapay.js` (webhooks), `admin.js` (`/health`, `/admin/stats`). |
| `src/bot/` | `handler.js` (update routing), `commands.js` (all user flows), `admin.js` (Telegram `/admin_*`), `middleware.js`, `keyboards.js`. |
| `src/services/` | `db.js` (Neon Postgres), `korapay.js`, `ton.js`, `groq.js`, `notifications.js`. |
| `src/config/` | `env.js` (validation), `tokenomics.js` (all economic values). |
| `docs/PAYMENTS.md` | **Read before touching payment/blockchain code.** Flows, verification, failure handling, security requirements, token economics. |
| `vercel.json` | Rewrites `/webhook/*`, `/admin/*`, `/health` to the serverless function. |

## Commands

```bash
npm run bot            # run the long-running server (node server.js)
npm run bot:dev        # server with --watch
npm run webhook:set    # register the Telegram webhook (run once per deploy)
npm run check:env      # fail fast if required env vars are missing
npm run build          # next build
npm run dev            # next dev (brand-assets site only)
```

## Environment variables

- **Required** (app refuses to start without them): `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_ID`, `ADMIN_API_TOKEN`,
  `ENCRYPTION_KEY`, `BOT_WEBHOOK_URL`, `DATABASE_URL`, `KORAPAY_SECRET_KEY`.
- **Optional** (feature degrades gracefully): `KORAPAY_PUBLIC_KEY`, `TON_API_KEY`,
  `GROQ_API_KEY`, `SIDI_PRICE_NGN`, `SIDI_FEE_WALLET`.
- `.env` is gitignored; `.env.example` is the source of truth for names.

## Token economics

All economic values live in `src/config/tokenomics.js` — import from there, never
hardcode a price, bonus or fee. Current values: price ₦5, welcome bonus 500 SIDI
on first `/start`, referral 50 SIDI per signup + 10 SIDI per purchase, milestones
at 5/10/25/50 invites, check-in 10/25 SIDI, 0% transfer fee.

## Conventions and invariants

- **No secrets in source.** Read secrets through `src/config/env.js`
  (`requireEnv`/`hasEnv`) at the point of use, never at module top level, so
  importing a module never requires env vars to be set.
- **Money is server-side.** Credited/debited amounts come from server state
  (pending-payment records), never from webhook or user input.
- **Webhooks are authenticated.** Korapay: HMAC-SHA512 over the raw body
  (`req.rawBody`), mandatory. Telegram: `X-Telegram-Bot-Api-Secret-Token`
  compared in constant time.
- **Money-moving handlers are locked.** `executeSend`/`executeSell` take a
  per-user database lock (`acquireLock`) and re-read the user inside it.
- **Idempotent crediting.** `consumePendingPayment` (`DELETE ... RETURNING`)
  means a reference is credited at most once.
- **Admin HTTP auth uses `ADMIN_API_TOKEN`**, not `ADMIN_TELEGRAM_ID` (which is a
  public id).
- **No fake TON wallets.** `createWallet` failures propagate; `/start` tells the
  user to retry.
- **Serverless-safe.** No `setInterval`/`setTimeout`-scheduled work in the
  request path; the webhook is registered out-of-band via `npm run webhook:set`.

## Testing

There is no committed test runner yet. The flows were verified with throwaway
harnesses (a Postgres database plus a stubbed Telegram API) that exercised
`executeSend`, `executeSell`, and the Korapay webhook over HTTP. If you add
tests, cover: unsigned/replayed webhooks, concurrent sends, payout failure
refund, and admin auth.

## Known open items

- `src/utils/encryption.js` still uses `CryptoJS.AES` (legacy `EVP_BytesToKey`).
  Migrate to scrypt/PBKDF2 + AES-256-GCM. See `docs/PAYMENTS.md` §4.4.
- `checkAndUpdateDailyLimit` is still a read-modify-write; the per-user lock
  mitigates concurrent sends but the counter itself is not atomic.
- The daily stats reset only runs in the long-running server; on Vercel it needs
  a scheduled job (cron).
