import { Router } from 'express';
import {
  createCheckoutSession,
  getPlans,
  getMySubscription,
  cancelMySubscription,
  stripeWebhookHandler,
} from '../controllers/billingController';
import {
  createXenditCheckout,
  xenditWebhookHandler,
} from '../controllers/xenditController';
import {
  createPaddleCheckout,
  paddleWebhookHandler,
} from '../controllers/paddleController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// ── Plans ─────────────────────────────────────────────────────────────────────
router.get('/plans', getPlans);

// ── Subscription state ────────────────────────────────────────────────────────
router.get('/subscription', requireAuth, getMySubscription);
router.post('/cancel',      requireAuth, cancelMySubscription);

// ── Stripe (international / card) ────────────────────────────────────────────
router.post('/checkout/stripe',  requireAuth, createCheckoutSession);
router.post('/webhook/stripe',   stripeWebhookHandler);   // raw body — wired in index.ts

// ── Xendit (Indonesia — QRIS, VA, eWallet) ───────────────────────────────────
router.post('/checkout/xendit',  requireAuth, createXenditCheckout);
router.post('/webhook/xendit',   xenditWebhookHandler);

// ── Paddle (international cards, global SaaS) ─────────────────────────────────
router.post('/checkout/paddle',  requireAuth, createPaddleCheckout);
// Note: Paddle webhook is mounted in index.ts at /api/webhooks/paddle (raw body needed)

// Legacy Stripe checkout path (backward compat)
router.post('/checkout', requireAuth, createCheckoutSession);

export default router;
