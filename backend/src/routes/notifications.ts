import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { listNotifications, getUnreadCount, markRead, markAllRead, sseStream } from '../controllers/notificationController';

const router = Router();
router.get('/stream',        sseStream);           // SSE — token in query param
router.get('/',              requireAuth, listNotifications);
router.get('/count',         requireAuth, getUnreadCount);
router.put('/:id/read',      requireAuth, markRead);
router.put('/read-all',      requireAuth, markAllRead);
export default router;
