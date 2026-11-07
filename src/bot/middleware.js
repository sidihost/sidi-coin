import { getUser, checkRateLimit } from '../services/db.js';
import { sendMessage } from '../services/notifications.js';

export async function ensureRegistered(chatId, telegramId) {
  const user = await getUser(telegramId);
  if (!user) {
    await sendMessage(
      chatId,
      '\u2726 Welcome to Sidicoin!\n\nPlease type /start to set up your wallet first \u2726'
    );
    return null;
  }
  return user;
}

export async function ensureUsername(chatId, from) {
  if (!from.username) {
    await sendMessage(
      chatId,
      '\u2726 Please set a Telegram username first in your Telegram settings so people can send you SIDI \u2726'
    );
    return false;
  }
  return true;
}

export async function ensureNotBanned(chatId, user) {
  if (user.is_banned) {
    await sendMessage(
      chatId,
      '\u2726 Your account has been suspended. Contact support for assistance \u2726'
    );
    return false;
  }
  return true;
}

export async function ensureRateLimit(chatId, telegramId) {
  const allowed = await checkRateLimit(telegramId);
  if (!allowed) {
    await sendMessage(
      chatId,
      "\u2726 You're doing that too fast. Please wait a moment and try again \u2726"
    );
    return false;
  }
  return true;
}

export function isAdmin(telegramId) {
  return String(telegramId) === String(process.env.ADMIN_TELEGRAM_ID);
}
