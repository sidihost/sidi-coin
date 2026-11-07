import { getSidiPriceNgn } from '../config/tokenomics.js';

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

export function sidiToNaira(sidi) {
  const price = getSidiPriceNgn();
  return Math.round(Number(sidi) * price * 100) / 100;
}

export function nairaToSidi(naira) {
  const price = getSidiPriceNgn();
  return Math.round((Number(naira) / price) * 100) / 100;
}

export function formatSidi(amount) {
  return formatNumber(amount) + ' SIDI';
}

export function formatNaira(amount) {
  return '\u20A6' + formatNumber(amount);
}

export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

export function getGreeting(name) {
  const hour = new Date().getUTCHours() + 1; // WAT = UTC+1
  if (hour >= 5 && hour < 12) return `Good morning, ${name} \u2600\uFE0F`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name} \uD83D\uDC4B`;
  if (hour >= 17 && hour < 21) return `Good evening, ${name} \uD83C\uDF06`;
  return `Hey ${name}, up late? \uD83C\uDF19`;
}

export function generateReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SIDI-';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
