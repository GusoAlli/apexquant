import { Router, Request } from 'express';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { requireAuth } from '../middleware/authMiddleware';
import { updateProfile, changePassword, uploadAvatar, completeOnboarding } from '../controllers/userController';

const upload = multer({
  dest: path.join(__dirname, '../../uploads/avatars/tmp'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.put('/profile',              requireAuth, updateProfile);
router.put('/change-password',      requireAuth, changePassword);
router.post('/avatar',              requireAuth, upload.single('avatar'), uploadAvatar);
router.post('/complete-onboarding', requireAuth, completeOnboarding);

export default router;
