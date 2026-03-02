import express from 'express';
import telegramRouter from './src/routes/telegram.js';
import korapayRouter from './src/routes/korapay.js';
import adminRouter from './src/routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(express.json());

// ── Routes ──
app.use('/', telegramRouter);
app.use('/', korapayRouter);
app.use('/', adminRouter);

// ── Root ──
app.get('/', (req, res) => {
  res.json({
    name: 'Sidicoin Telegram Bot',
    status: 'running',
    version: '1.0.0',
    blockchain: 'TON',
    ticker: 'SIDI',
  });
});

// ── Set Webhook on startup ──
async function setWebhook() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.BOT_WEBHOOK_URL;

  if (!botToken) {
    console.log('\u26A0\uFE0F  TELEGRAM_BOT_TOKEN not set. Webhook not configured.');
    return;
  }

  if (!webhookUrl) {
    console.log('\u26A0\uFE0F  BOT_WEBHOOK_URL not set. Webhook not configured.');
    console.log('   Set BOT_WEBHOOK_URL to your server URL (e.g., https://yourdomain.com)');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${webhookUrl}/webhook/telegram`,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
    });

    const data = await response.json();
    if (data.ok) {
      console.log(`\u2705 Webhook set: ${webhookUrl}/webhook/telegram`);
    } else {
      console.error('\u274C Webhook setup failed:', data.description);
    }
  } catch (error) {
    console.error('\u274C Webhook setup error:', error.message);
  }
}

// ── Daily stats reset (runs at midnight WAT / 11pm UTC) ──
function scheduleDailyReset() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // Calculate ms until next 23:00 UTC (midnight WAT)
  let hoursUntilReset = 23 - utcHour;
  if (hoursUntilReset <= 0) hoursUntilReset += 24;
  const msUntilReset = hoursUntilReset * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      const { default: redis } = await import('./src/services/redis.js');
      await redis.set('stats_today_transactions', 0);
      await redis.set('stats_today_volume_ngn', 0);
      console.log('\u2705 Daily stats reset');
    } catch (error) {
      console.error('Daily reset error:', error.message);
    }
    // Schedule again for next day
    scheduleDailyReset();
  }, msUntilReset);

  console.log(`\uD83D\uDD52 Daily reset scheduled in ${hoursUntilReset}h`);
}

// ── Start Server ──
app.listen(PORT, async () => {
  console.log('');
  console.log('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
  console.log('\u2726 Sidicoin Telegram Bot');
  console.log(`\u2726 Running on port ${PORT}`);
  console.log('\u2726 Blockchain: TON | Ticker: SIDI');
  console.log('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
  console.log('');

  await setWebhook();
  scheduleDailyReset();
});
