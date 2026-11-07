import { Router } from 'express';
import crypto from 'crypto';
import { getStats } from '../services/redis.js';
import { requireEnv } from '../config/env.js';

const router = Router();

// Constant-time bearer-token check for the HTTP admin surface. The token is a
// dedicated secret (ADMIN_API_TOKEN), never the public ADMIN_TELEGRAM_ID.
function isAuthorized(req) {
  const header = req.headers.authorization || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;

  const provided = Buffer.from(header.slice(prefix.length), 'utf8');
  const expected = Buffer.from(requireEnv('ADMIN_API_TOKEN'), 'utf8');

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

function requireAdmin(req, res, next) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Health check (public, exposes no configuration or secrets)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sidicoin Bot',
    timestamp: new Date().toISOString(),
  });
});

// Platform stats (admin only)
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
