import { Router } from 'express';
import crypto from 'crypto';
import { handleUpdate } from '../bot/handler.js';
import { requireEnv } from '../config/env.js';

const router = Router();

// Telegram echoes the secret_token configured on setWebhook in this header.
// Without it, anyone who learns the webhook URL could POST forged updates.
function isValidTelegramRequest(req) {
  const provided = Buffer.from(String(req.headers['x-telegram-bot-api-secret-token'] || ''), 'utf8');
  const expected = Buffer.from(requireEnv('TELEGRAM_WEBHOOK_SECRET'), 'utf8');

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

router.post('/webhook/telegram', async (req, res) => {
  try {
    if (!isValidTelegramRequest(req)) {
      console.error('Rejected Telegram webhook: invalid secret token');
      return res.sendStatus(401);
    }

    // Respond immediately to Telegram
    res.sendStatus(200);

    // Process update asynchronously
    const update = req.body;
    if (update) {
      handleUpdate(update).catch((err) => {
        console.error('Webhook processing error:', err.message);
      });
    }
  } catch (error) {
    console.error('Telegram webhook error:', error.message);
    if (!res.headersSent) {
      res.sendStatus(200); // Always respond 200 to Telegram
    }
  }
});

export default router;
