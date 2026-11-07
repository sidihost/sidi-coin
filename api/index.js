import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.js';

// Vercel serverless entry point.
//
// Vercel invokes this default export as the request handler; there is no
// `app.listen` and no fixed PORT — the platform assigns the port. The Express
// app built here is the exact same one the long-running server mounts, so the
// routing and middleware are identical across deployments.
//
// Webhook registration is *not* done here: a serverless function may scale to
// many concurrent instances and each would race to call setWebhook. Register the
// webhook once with `npm run webhook:set`.

let app;

try {
  validateEnv();
  app = createApp();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  // Report the misconfiguration without echoing any variable values.
  app = (req, res) => {
    res.status(500).json({ error: 'Server misconfigured' });
  };
}

export default app;
