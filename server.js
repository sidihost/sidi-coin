import { createApp } from './src/app.js';
import { validateEnv, requireEnv } from './src/config/env.js';

// Validate configuration before anything else. A missing required variable
// stops the process with a clear, secret-free message.
let config;
try {
  config = validateEnv();
} catch (error) {
  console.error(`\n\u274C ${error.message}\n`);
  process.exit(1);
}

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;

// ── Set Webhook on startup ──
async function setWebhook() {
  const botToken = requireEnv('TELEGRAM_BOT_TOKEN');
  const webhookUrl = requireEnv('BOT_WEBHOOK_URL');
  const secretToken = requireEnv('TELEGRAM_WEBHOOK_SECRET');

  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${webhookUrl}/webhook/telegram`,
        secret_token: secretToken,
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
// Only meaningful for the long-running process; on serverless this is replaced
// by a scheduled job.
function scheduleDailyReset() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  // Calculate ms until next 23:00 UTC (midnight WAT)
  let hoursUntilReset = 23 - utcHour;
  if (hoursUntilReset <= 0) hoursUntilReset += 24;
  const msUntilReset = hoursUntilReset * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      const { resetDailyStats } = await import('./src/services/db.js');
      await resetDailyStats();
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
  console.log(`\u2726 Integrations: TON ${config.features.ton ? 'on' : 'off'} | AI ${config.features.ai ? 'on' : 'off'}`);
  console.log('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
  console.log('');

  await setWebhook();
  scheduleDailyReset();
});
