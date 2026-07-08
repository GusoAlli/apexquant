import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getSignal, reportTrade, getBotStatus, getBotConfig, updateBotConfig } from '../controllers/botController';

const router = Router();

// MT5 EA endpoints (MT5 token auth, handled inside controller)
router.post('/signal', getSignal);
router.post('/trade',  reportTrade);

// Dashboard endpoints (JWT auth)
router.get('/status', requireAuth, getBotStatus);
router.get('/config', requireAuth, getBotConfig);
router.put('/config', requireAuth, updateBotConfig);

export default router;
