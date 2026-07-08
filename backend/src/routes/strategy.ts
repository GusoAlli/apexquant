import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
} from '../controllers/strategyController';

const router = Router();

router.get('/',     requireAuth, listStrategies);
router.post('/',    requireAuth, createStrategy);
router.patch('/:id', requireAuth, updateStrategy);
router.delete('/:id', requireAuth, deleteStrategy);

export default router;
