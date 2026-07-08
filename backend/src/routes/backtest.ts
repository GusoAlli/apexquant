import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { runBacktest } from '../controllers/backtestController';

const router = Router();
router.post('/run', requireAuth, runBacktest);
export default router;
