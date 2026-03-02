import { Router } from 'express';
import { getStats } from '../services/redis.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sidicoin Bot',
    timestamp: new Date().toISOString(),
  });
});

// Basic stats endpoint (protected by simple auth)
router.get('/admin/stats', async (req, res) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.ADMIN_TELEGRAM_ID;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
