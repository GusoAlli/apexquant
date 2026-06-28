import { Router } from 'express';
import { createCheckoutSession, stripeWebhookHandler } from '../controllers/billingController';
import { authMiddleware } from '../middleware/authMiddleware';
import express from 'express';

const router = Router();

router.post('/checkout', authMiddleware, createCheckoutSession);

// webhook route expects raw body; mounted separately in index.ts with express.raw
router.post('/webhook', (req, res) => res.status(400).json({ message: 'use /api/webhooks/stripe for raw webhook' }));

export default router;
