import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/requireAdmin';
import { getAdminStats, listUsers, setUserRole, assignSubscription, revokeSubscription } from '../controllers/adminController';

const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.patch('/users/:id/role', setUserRole);
router.post('/users/:id/subscription', assignSubscription);
router.delete('/users/:id/subscription', revokeSubscription);
export default router;
