import CryptoJS from 'crypto-js';
import { requireEnv } from '../config/env.js';

// The encryption key is mandatory: a missing key must fail loudly rather than
// silently fall back to a well-known default that would let anyone decrypt
// stored TON private keys. See docs/PAYMENTS.md §4.4 for the planned move to an
// authenticated KDF-based scheme.
function encryptionKey() {
  return requireEnv('ENCRYPTION_KEY');
}

export function encrypt(text) {
  return CryptoJS.AES.encrypt(text, encryptionKey()).toString();
}

export function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, encryptionKey());
  return bytes.toString(CryptoJS.enc.Utf8);
}
