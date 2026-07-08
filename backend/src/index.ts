import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import billingRoutes from './routes/billing';
import licenseRoutes from './routes/license';
import adminLicenseRoutes from './routes/adminLicense';
import statsRoutes from './routes/stats';
import userRoutes from './routes/user';
import portfolioRoutes from './routes/portfolio';
import brokerRoutes from './routes/broker';
import mt5Routes from './routes/mt5';
import mt5MetricsRouter from './routes/mt5Metrics';
import apiKeyRoutes from './routes/apiKey';
import notificationRoutes from './routes/notifications';
import signalRoutes from './routes/signals';
import adminRoutes from './routes/admin';
import engineRoutes from './routes/engine';
import botRoutes      from './routes/bot';
import backtestRoutes from './routes/backtest';
import strategyRoutes from './routes/strategy';
import fundingYieldRoutes from './routes/fundingYield';
import { authMiddleware } from './middleware/authMiddleware';
import { stripeWebhookHandler } from './controllers/billingController';
import { paddleWebhookHandler } from './controllers/paddleController';

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Webhook routes need raw body — mount before JSON body parsing
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.post('/api/webhooks/paddle', express.raw({ type: 'application/json' }), paddleWebhookHandler);

app.use(express.json());
app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/admin', adminLicenseRoutes);
app.use('/api/user', userRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/brokers',   brokerRoutes);
app.use('/api/mt5',       mt5Routes);
app.use('/api/mt5',       mt5MetricsRouter);
app.use('/api/keys',          apiKeyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/signals',       signalRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/engine',        engineRoutes);
app.use('/api/bot',           botRoutes);
app.use('/api/backtest',      backtestRoutes);
app.use('/api/strategies',   strategyRoutes);
app.use('/api/yield',        fundingYieldRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Redirect Paddle post-payment back to frontend (ngrok tunnels to backend, frontend is on :3000)
app.get('/dashboard/:path(*)', (req, res) => {
  const frontend = process.env.LOCAL_FRONTEND_URL ?? 'http://localhost:3000';
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(`${frontend}/dashboard/${req.params.path}${qs ? '?' + qs : ''}`);
});
app.use('/api/stats', statsRoutes);

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => console.log(`Backend listening on 0.0.0.0:${port}`));
