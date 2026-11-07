import crypto from 'node:crypto';
import CryptoJS from 'crypto-js';
import { requireEnv } from '../config/env.js';

function encryptionKey() {
  return requireEnv('ENCRYPTION_KEY');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV standard for GCM
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

/**
 * Encrypts sensitive data using AES-256-GCM with PBKDF2 key derivation.
 * Output format: v2:base64(salt):base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(text) {
  const secret = encryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v2:${salt.toString('base64')}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts data, supporting both modern v2 AES-256-GCM and legacy CryptoJS.AES.
 */
export function decrypt(cipherText) {
  if (typeof cipherText !== 'string' || !cipherText) {
    return '';
  }

  // Modern AES-256-GCM authenticated format
  if (cipherText.startsWith('v2:')) {
    const parts = cipherText.split(':');
    if (parts.length === 5) {
      const [, saltB64, ivB64, tagB64, dataB64] = parts;
      const secret = encryptionKey();
      const salt = Buffer.from(saltB64, 'base64');
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');

      const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, DIGEST);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrypted.toString('utf8');
    }
  }

  // Fallback for legacy CryptoJS ciphertexts
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, encryptionKey());
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '';
  }
}

