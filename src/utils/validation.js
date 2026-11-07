import {
  FREE_DAILY_LIMIT,
  PREMIUM_DAILY_LIMIT,
  getFeeRate,
} from '../config/tokenomics.js';

export function isValidUsername(username) {
  if (!username) return false;
  const clean = username.replace('@', '');
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(clean);
}

export function cleanUsername(username) {
  if (!username) return '';
  return username.replace('@', '').toLowerCase();
}

export function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 10000000;
}

export function isValidBankAccount(account) {
  return /^\d{10}$/.test(account);
}

export function parseAmount(text) {
  if (!text) return null;
  const cleaned = text.replace(/[,\s]/g, '').replace(/NGN|SIDI|₦/gi, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

export function detectAmountType(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  if (lower.includes('ngn') || lower.includes('\u20A6') || lower.startsWith('n')) {
    return 'ngn';
  }
  return 'sidi';
}

export function getDailyLimit(isPremium) {
  return isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

export function calculateFee(amount, isPremium, type) {
  const rate = getFeeRate(isPremium, type);
  return Math.round(amount * rate * 100) / 100;
}
