import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  generateMT5Token,
  getMT5TokenStatus,
  listMT5Accounts,
  removeMT5Account,
  mt5Ping,
} from '../controllers/mt5Controller';

const router = Router();

// JWT-protected (dashboard user)
router.post('/token',            requireAuth, generateMT5Token);
router.get('/token/status',      requireAuth, getMT5TokenStatus);
router.get('/accounts',          requireAuth, listMT5Accounts);
router.delete('/accounts/:id',   requireAuth, removeMT5Account);

// MT5-token protected (EA)
router.post('/ping',             mt5Ping);

export default router;
