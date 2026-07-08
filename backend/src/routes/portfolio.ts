import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getPortfolioSummary } from '../controllers/portfolioController';

const router = Router();

router.get('/summary', requireAuth, getPortfolioSummary);

export default router;
