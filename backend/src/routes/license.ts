import { Router } from 'express';
import { activateLicense, validateLicense, listLicenses } from '../controllers/licenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/activate', activateLicense);
router.post('/validate', validateLicense);
router.get('/', authMiddleware, listLicenses);

export default router;
