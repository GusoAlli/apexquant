import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { listBrokers, addBroker, removeBroker, syncBroker } from '../controllers/brokerController';

const router = Router();

router.get('/',           requireAuth, listBrokers);
router.post('/',          requireAuth, addBroker);
router.delete('/:id',     requireAuth, removeBroker);
router.post('/:id/sync',  requireAuth, syncBroker);

export default router;
