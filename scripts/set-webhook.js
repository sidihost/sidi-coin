// Registers the Telegram webhook with the platform.
//
// Run this once after each deployment (or whenever BOT_WEBHOOK_URL changes):
//   npm run webhook:set
//
// This is intentionally a separate, explicitly-invoked command rather than
// startup code, so that serverless deployments — which may run many instances —
// never race to register the webhook.
import { validateEnv, requireEnv } from '../src/config/env.js';

async function main() {
  try {
    validateEnv();
  } catch (error) {
    console.error(`\n\u274C ${error.message}\n`);
    process.exit(1);
  }

  const botToken = requireEnv('TELEGRAM_BOT_TOKEN');
  const webhookUrl = requireEnv('BOT_WEBHOOK_URL');
  const secretToken = requireEnv('TELEGRAM_WEBHOOK_SECRET');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
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
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\u274C Webhook setup error:', error.message);
  process.exit(1);
});
