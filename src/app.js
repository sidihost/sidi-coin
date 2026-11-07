import express from 'express';
import telegramRouter from './routes/telegram.js';
import korapayRouter from './routes/korapay.js';
import adminRouter from './routes/admin.js';

// Builds the Express application. The same app is mounted by the long-running
// server (server.js) and by the Vercel serverless function (api/index.js), so
// both deployments share identical routing and middleware.
export function createApp() {
  const app = express();

  // Capture the raw request body alongside the parsed JSON. Korapay signs the
  // exact bytes it sends, so signature verification must run against the raw
  // buffer, not a re-serialised object.
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.use('/', telegramRouter);
  app.use('/', korapayRouter);
  app.use('/', adminRouter);

  app.get('/', (req, res) => {
    res.json({
      name: 'Sidicoin Telegram Bot',
      status: 'running',
      version: '1.0.0',
      blockchain: 'TON',
      ticker: 'SIDI',
    });
  });

  return app;
}
