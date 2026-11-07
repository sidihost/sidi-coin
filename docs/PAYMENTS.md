# Sidicoin — Payment, Blockchain & AI Transaction Flows

This document is the contract for every money-touching and blockchain-touching
code path in Sidicoin. It must be read and kept in sync before any change is
made to `src/services/korapay.js`, `src/services/ton.js`,
`src/routes/korapay.js`, `src/bot/commands.js`, or the payment-related parts of
`src/routes/admin.js`.

> Status legend: **[implemented]** exists today, **[required]** must hold for
> the flow to be considered safe, **[partial]** partially addressed,
> **[note]** behaviour to be aware of.

---

## 1. Trust boundaries

| Boundary | Trusted? | Notes |
| --- | --- | --- |
| Telegram user input | **No** | All text, callback data and amounts are attacker controlled. |
| Telegram webhook payload | **No** | Anyone who learns the URL can POST arbitrary updates. |
| Korapay webhook payload | **No** | Must be authenticated with an HMAC signature. |
| Korapay API responses | Yes (over TLS) | Used to resolve bank accounts and to initiate payouts. |
| Neon Postgres | Yes | Stores balances, pending payments and stats. |
| Frontend / browser | **No** | Never receives secrets or private keys. |

Secrets (`KORAPAY_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TON_API_KEY`,
`GROQ_API_KEY`, `DATABASE_URL`, `ADMIN_API_TOKEN`, `ENCRYPTION_KEY`) live
only in the server runtime environment. They are never sent to Telegram users,
never rendered in bot messages, and never included in HTTP responses.

---

## 2. Buy SIDI (`/buy`) — collection flow

### 2.1 Expected flow

1. User runs `/buy`; the bot asks for an amount in SIDI or NGN. **[implemented]**
2. `processBuyAmount` computes `sidi_amount`, `ngn_amount`, `fee` and `total`,
   stores them in the user's `pending_data`, and shows a confirmation keyboard
   carrying a generated `reference`. **[implemented]**
3. User confirms; `processBuyPayment`:
   - writes a *pending payment* record to the database keyed by `reference`
     (30-minute TTL), containing `telegram_id`, `chat_id`, the amounts and the
     payment `type`; **[implemented]**
   - asks Korapay for a virtual bank account / charge with
     `notification_url = <BOT_WEBHOOK_URL>/webhook/korapay`; **[implemented]**
   - shows the account details and an "I have paid" button. **[implemented]**
4. The user makes the bank transfer.
5. Korapay calls `POST /webhook/korapay` with a signature header. **[implemented]**
6. The webhook is authenticated, the event is matched to the pending payment by
   `reference`, and only then is the wallet credited. **[implemented]**

### 2.2 Verification process

- The webhook body is signed by Korapay; the signature must be an HMAC-SHA512
  of the **raw request body** using `KORAPAY_SECRET_KEY`. **[implemented, but see gaps]**
- The pending payment is looked up by `reference`; unknown references are
  ignored. **[implemented]**
- Credit happens only for a `buy`-type pending payment. **[implemented]**
- Pending payments expire after 30 minutes. **[implemented]**

### 2.3 Failure handling

- Invalid/missing signature → `401`, nothing is credited. **[required]**
- Unknown or expired reference → log and ignore; the payment stays pending until
  it is reconciled against the Korapay dashboard. **[implemented]**
- Korapay API unreachable when generating payment details → the user is shown a
  reference-only fallback and can still be credited once the transfer lands.
  **[implemented]**

### 2.4 Security requirements

- **[implemented] Raw-body signing.** `src/app.js` captures the raw request body
  in the `express.json` `verify` hook (`req.rawBody`), and
  `verifyWebhookSignature` computes HMAC-SHA512 over those exact bytes — not a
  re-serialised object — so key ordering and whitespace cannot break the check.
- **[implemented] Mandatory signature.** A missing or invalid signature is
  rejected with `401` before any state is touched; the previous "skip when the
  header is absent" behaviour is gone.
- **[implemented] Replay / idempotency.** `consumePendingPayment` atomically
  fetches *and removes* the pending payment (`DELETE ... RETURNING`). A replayed event finds
  nothing to consume and is ignored, so a reference is credited at most once.
- **[required] Server-side amounts.** The credited `sidi_amount` is always the
  value stored server-side in the pending payment, never a value taken from the
  webhook body.
- **[required] No secret exposure.** The webhook never returns the secret key,
  signature, or raw payload to the caller.

---

## 3. Sell / cash out (`/sell`) — payout flow

### 3.1 Expected flow

1. New accounts are held for 24h before cash-out is allowed. **[implemented]**
2. `processSellAmount` validates the amount against the balance, computes
   `ngn_amount`, `fee` and `net`, and either uses the saved bank or starts bank
   selection. **[implemented]**
3. `processSellAccountNumber` resolves the account name through Korapay's
   `/misc/banks/resolve`. **[implemented]**
4. `executeSell` re-reads the user, debits the SIDI balance, records the
   transaction, then calls Korapay `/transactions/disburse`. **[implemented]**

### 3.2 Verification process

- Balance is re-checked against a **fresh** database read before debit. **[implemented]**
- Bank account is verified with the provider before payout. **[implemented]**
- The debit is written before the payout is requested. **[implemented]**

### 3.3 Failure handling

- **[implemented] Double-spend on retry.** `executeSend` and `executeSell` take a
  per-user database lock (`acquireLock`, conditional upsert on `locks`) before touching balances and
  re-read the user inside the lock, so the balance check and the debit use the
  same snapshot. Concurrent confirmations are refused with a "please wait"
  message instead of double-spending.
- **[implemented] Payout failure refunds the user.** If `/transactions/disburse`
  fails, the debited SIDI is credited back, a `refund` transaction is recorded,
  the admin is alerted, and the user is told their SIDI was returned.
- **[required] Admin alerting.** Failed payouts must always notify the admin
  (`ADMIN_TELEGRAM_ID`).

### 3.4 Security requirements

- **[required] No secret exposure.** Payout references and bank details shown to
  the user never include the Korapay secret key.
- **[required] Server-side pricing.** `SIDI_PRICE_NGN` and fee rates are read
  from configuration, never from user input.

---

## 4. TON wallet creation

### 4.1 Expected flow

1. On `/start`, a TON v4R2 keypair is generated with `tweetnacl`. **[implemented]**
2. The address is derived and returned to the caller. **[implemented]**
3. The private key is encrypted with `ENCRYPTION_KEY` before being stored on the
   user record. **[implemented]**

### 4.2 Verification process

- `TON_API_KEY` is only used to talk to `toncenter.com`; it is never returned to
  the user. **[implemented]**

### 4.3 Failure handling

- **[implemented] No fake wallets.** The fabricated-address fallback has been
  removed. `createWallet` propagates failures; `/start` catches them, logs the
  error, and asks the user to retry — no user is ever given an address nobody
  controls.

### 4.4 Security requirements

- **[partial] Key derivation.** `ENCRYPTION_KEY` is now mandatory — a missing key
  fails loudly instead of falling back to a published default. The cipher is
  still `CryptoJS.AES.encrypt` (OpenSSL `EVP_BytesToKey`: MD5, single iteration,
  no salt discipline); moving to scrypt/PBKDF2 with AES-256-GCM remains open.
- **[required] Private keys never leave the server.** They are never sent to
  Telegram, never logged, and never returned in an API response.

---

## 5. Groq AI assistant

- `GROQ_API_KEY` authenticates the assistant. **[implemented]**
- **[note] Prompt injection.** User text is interpolated directly into the
  prompt. Treat model output as untrusted text; never let it trigger a money
  action, and never place secrets in the system prompt or message history.
- The assistant is an optional integration: with no `GROQ_API_KEY` the bot must
  degrade to a static help message rather than crashing. **[required]**

---

## 6. Administrative surface

- **Telegram admin commands** (`/admin_*`) are gated by comparing the sender id
  to `ADMIN_TELEGRAM_ID`. **[implemented]**
- **HTTP admin endpoint** `GET /admin/stats` is gated by a bearer token.
  **[implemented]**
  - The endpoint compares the bearer token to a dedicated `ADMIN_API_TOKEN` in
    constant time (`crypto.timingSafeEqual`). `ADMIN_TELEGRAM_ID` is a public
    identifier and is never used as a credential.
- **[required]** Admin responses contain aggregates only — never private keys,
  never full bank accounts, never secrets.

---

## 7. Failure-handling summary

| Situation | Expected behaviour |
| --- | --- |
| Missing/invalid webhook signature | `401`, nothing credited, event logged |
| Duplicate webhook | No double credit (idempotent) |
| Unknown reference | Ignored, logged, reconciled manually |
| Payout API failure | Admin alerted, transaction marked, user not left silently debited |
| TON provider failure | Loud failure, user asked to retry, **no fake address** |
| Optional integration missing | Feature disabled gracefully; core app still starts |
| Required variable missing | Process refuses to start with a clear message |

---

## 8. Environment variables used by these flows

Required for the core application: `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_ID`, `ADMIN_API_TOKEN`,
`ENCRYPTION_KEY`, `BOT_WEBHOOK_URL`, `DATABASE_URL`, `KORAPAY_SECRET_KEY`.

Optional integrations: `KORAPAY_PUBLIC_KEY`, `TON_API_KEY`, `GROQ_API_KEY`,
`SIDI_PRICE_NGN`, `SIDI_FEE_WALLET`.

See `.env.example` for the full annotated list.

---

## 9. Token economics

All economic values live in `src/config/tokenomics.js` — one source of truth so
the bot, the notifications, the AI prompt and the marketing copy can never drift.
`SIDI_PRICE_NGN` is the only value read from the environment (default `5`).

| Item | Value |
| --- | --- |
| SIDI price | ₦5 (override with `SIDI_PRICE_NGN`) |
| Total supply | 10,000,000,000 SIDI |
| Welcome bonus (first `/start`) | **500 SIDI** |
| Referrer bonus per signup | 50 SIDI |
| Referrer commission per purchase | 10 SIDI |
| Referral milestones | 5 → +100, 10 → +250, 25 → +750, 50 → +2,000 SIDI |
| Daily check-in (free / premium) | 10 / 25 SIDI |
| 7-day streak bonus | +100 SIDI |
| Transfer fee (user to user) | 0% (Free) |
| Buy / sell fee (free / premium) | 0% / 0% (Free — zero charges) |
| Daily transfer limit (free / premium) | 50,000 / 500,000 SIDI |

Rules enforced in code:

- The welcome bonus is granted **only on first `/start`**; re-running `/start`
  shows the existing balance and never re-credits (see `handleStart`).
- Self-referral is ignored (`referredBy !== telegramId`).
- A referral signup bonus is credited once, at signup; the purchase commission
  is credited once per purchase, inside the idempotent webhook path.
- Milestones fire exactly when the referral count crosses the threshold.

