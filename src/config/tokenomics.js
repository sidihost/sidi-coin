// Single source of truth for Sidicoin token economics.
//
// Every reward, price and limit lives here so the bot, the notifications and the
// marketing copy can never drift apart. Values are plain constants rather than
// env vars except for the price, which operators tune per deployment.

/** Price of one SIDI in Nigerian Naira. Override with SIDI_PRICE_NGN. */
export function getSidiPriceNgn() {
  const raw = parseFloat(process.env.SIDI_PRICE_NGN);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

/** Tokens credited once, on a user's first /start. */
export const WELCOME_BONUS = 500;

/** Tokens credited to the referrer when an invited user completes signup. */
export const REFERRAL_SIGNUP_BONUS = 50;

/** Tokens credited to the referrer as commission on a referee's purchase. */
export const REFERRAL_PURCHASE_COMMISSION = 10;

/** Daily check-in rewards. */
export const CHECKIN_FREE = 10;
export const CHECKIN_PREMIUM = 25;

/** Extra tokens every 7th consecutive check-in. */
export const STREAK_BONUS = 100;

/** Bonus awarded when a referrer's total referral count reaches a threshold. */
export const REFERRAL_MILESTONES = [
  { count: 5, bonus: 100 },
  { count: 10, bonus: 250 },
  { count: 25, bonus: 750 },
  { count: 50, bonus: 2000 },
];

/** Returns the milestone just crossed by `count`, or null. */
export function referralMilestoneReached(count) {
  return REFERRAL_MILESTONES.find((m) => m.count === count) || null;
}

/** Total SIDI supply. */
export const TOTAL_SUPPLY = 10_000_000_000;

/** Free / Premium daily transfer limits (SIDI). */
export const FREE_DAILY_LIMIT = 50_000;
export const PREMIUM_DAILY_LIMIT = 500_000;

/** Fee rates: Sidicoin charges 0% fees — all transfers, buys, and cashouts are 100% free! */
export function getFeeRate(isPremium, type) {
  return 0;
}
