import { Router } from 'express';
import { createLicense, listAllLicenses, revokeLicense } from '../controllers/adminLicenseController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/licenses', requireAuth, requireAdmin, createLicense);
router.get('/licenses', requireAuth, requireAdmin, listAllLicenses);
router.post('/licenses/revoke', requireAuth, requireAdmin, revokeLicense);

export default router;
