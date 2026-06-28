import { Router } from 'express';
import { register, login, refresh, logout, me, googleLogin } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';
import { validateLogin, validateRegister, validateGoogleLogin } from '../validators/authValidators';

const router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/google', authLimiter, validateGoogleLogin, googleLogin);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authLimiter, logout);
router.get('/me', me);

export default router;
