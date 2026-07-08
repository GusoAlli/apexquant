import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  getOpportunities,
  listPositions,
  getSummary,
  openPosition,
  collectFunding,
  closePosition,
  deletePosition,
} from '../controllers/fundingYieldController';

const router = Router();

router.get('/opportunities', getOpportunities);          // public — no auth needed for scanner

router.get('/positions',    requireAuth, listPositions);
router.get('/summary',      requireAuth, getSummary);
router.post('/positions',   requireAuth, openPosition);
router.post('/positions/:id/collect', requireAuth, collectFunding);
router.patch('/positions/:id/close',  requireAuth, closePosition);
router.delete('/positions/:id',       requireAuth, deletePosition);

export default router;
