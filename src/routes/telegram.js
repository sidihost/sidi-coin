import { Router } from 'express';
import { handleUpdate } from '../bot/handler.js';

const router = Router();

router.post('/webhook/telegram', async (req, res) => {
  try {
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
    res.sendStatus(200); // Always respond 200 to Telegram
  }
});

export default router;
