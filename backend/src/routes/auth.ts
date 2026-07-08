import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  googleLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { authLimiter, emailLimiter } from '../middleware/rateLimiter';
import { validateLogin, validateRegister, validateGoogleLogin } from '../validators/authValidators';

const router = Router();

router.post('/register',            authLimiter,  validateRegister,    register);
router.post('/login',               authLimiter,  validateLogin,       login);
router.post('/google',              authLimiter,  validateGoogleLogin, googleLogin);
router.post('/refresh',             authLimiter,  refresh);
router.post('/logout',                            logout);
router.get('/me',                                 me);

// Email verification
router.post('/verify-email',        authLimiter,  verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);

// Password reset
router.post('/forgot-password',     emailLimiter, forgotPassword);
router.post('/reset-password',      authLimiter,  resetPassword);

export default router;
