import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { listSignals, createSignal, updateSignalStatus, deleteSignal } from '../controllers/signalController';

const router = Router();
router.get('/',         requireAuth, listSignals);
router.post('/',        requireAuth, requireAdmin, createSignal);
router.patch('/:id',    requireAuth, requireAdmin, updateSignalStatus);
router.delete('/:id',   requireAuth, requireAdmin, deleteSignal);
export default router;
