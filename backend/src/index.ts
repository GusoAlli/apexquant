import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import billingRoutes from './routes/billing';
import licenseRoutes from './routes/license';
import adminLicenseRoutes from './routes/adminLicense';
import { authMiddleware } from './middleware/authMiddleware';
import { stripeWebhookHandler } from './controllers/billingController';

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Stripe webhook must receive raw body; mount before JSON body parsing
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/admin', adminLicenseRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on ${port}`));
