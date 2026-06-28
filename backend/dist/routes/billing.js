"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billingController_1 = require("../controllers/billingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/checkout', authMiddleware_1.authMiddleware, billingController_1.createCheckoutSession);
// webhook route expects raw body; mounted separately in index.ts with express.raw
router.post('/webhook', (req, res) => res.status(400).json({ message: 'use /api/webhooks/stripe for raw webhook' }));
exports.default = router;
