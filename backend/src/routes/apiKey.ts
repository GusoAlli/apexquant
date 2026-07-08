import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { listApiKeys, createApiKey, revokeApiKey } from '../controllers/apiKeyController';

const router = Router();
router.get('/',       requireAuth, listApiKeys);
router.post('/',      requireAuth, createApiKey);
router.delete('/:id', requireAuth, revokeApiKey);
export default router;
