"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = createCheckoutSession;
exports.stripeWebhookHandler = stripeWebhookHandler;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET || '', { apiVersion: '2022-11-15' });
async function upsertSubscriptionFromStripe(sub, userIdFromMeta) {
    const stripeSubId = sub.id;
    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId)
        return;
    const plan = await prisma_1.default.plan.findUnique({ where: { stripePriceId: priceId } });
    if (!plan) {
        console.warn('Plan not found for priceId', priceId);
        return;
    }
    // try to determine userId: prefer metadata, else try to lookup via existing subscription
    let userId = userIdFromMeta;
    if (!userId) {
        const existing = await prisma_1.default.subscription.findUnique({ where: { stripeSubId } });
        userId = existing?.userId || undefined;
    }
    if (!userId) {
        console.warn('No userId available for subscription', stripeSubId);
        return;
    }
    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
    await prisma_1.default.subscription.upsert({
        where: { stripeSubId },
        update: {
            status: sub.status,
            currentPeriodEnd: currentPeriodEnd,
            planId: plan.id
        },
        create: {
            userId,
            planId: plan.id,
            stripeSubId: stripeSubId,
            status: sub.status,
            currentPeriodEnd: currentPeriodEnd
        }
    });
}
async function createCheckoutSession(req, res) {
    const userId = req.userId;
    const { planId } = req.body;
    if (!userId)
        return res.status(401).json({ message: 'unauthenticated' });
    if (!planId)
        return res.status(400).json({ message: 'planId required' });
    const plan = await prisma_1.default.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceId)
        return res.status(400).json({ message: 'invalid plan' });
    const domain = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${domain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domain}/pricing`,
        metadata: { userId }
    });
    return res.status(201).json({ url: session.url });
}
async function stripeWebhookHandler(req, res) {
    const sig = req.headers['stripe-signature'];
    const raw = req.body; // express.raw middleware used for this route
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret)
        return res.status(500).json({ message: 'webhook secret not configured' });
    let event;
    try {
        event = stripe.webhooks.constructEvent(raw, sig || '', webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed', err?.message);
        return res.status(400).send(`Webhook Error: ${err?.message}`);
    }
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                // if subscription was created immediately, create DB record
                if (session.subscription && typeof session.subscription === 'string') {
                    const sub = await stripe.subscriptions.retrieve(session.subscription, { expand: ['items.data.price'] });
                    await upsertSubscriptionFromStripe(sub, userId);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                // if metadata contains userId use it; otherwise rely on existing mapping
                const userIdMeta = subscription.metadata?.userId;
                await upsertSubscriptionFromStripe(subscription, userIdMeta);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const paymentIntentId = invoice.payment_intent;
                const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
                const currency = invoice.currency ?? 'usd';
                // find subscription owner
                const stripeSubId = invoice.subscription;
                let userId;
                if (stripeSubId) {
                    const dbSub = await prisma_1.default.subscription.findUnique({ where: { stripeSubId } });
                    userId = dbSub?.userId;
                }
                await prisma_1.default.payment.create({ data: {
                        userId: userId || undefined,
                        stripePaymentId: paymentIntentId ?? invoice.id,
                        amountCents: amount,
                        currency: currency,
                        status: 'paid',
                        metadata: invoice.metadata
                    } });
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const paymentIntentId = invoice.payment_intent;
                const amount = invoice.amount_due ?? 0;
                const currency = invoice.currency ?? 'usd';
                const stripeSubId = invoice.subscription;
                let userId;
                if (stripeSubId) {
                    const dbSub = await prisma_1.default.subscription.findUnique({ where: { stripeSubId } });
                    userId = dbSub?.userId;
                }
                await prisma_1.default.payment.create({ data: {
                        userId: userId || undefined,
                        stripePaymentId: paymentIntentId ?? invoice.id,
                        amountCents: amount,
                        currency: currency,
                        status: 'failed',
                        metadata: invoice.metadata
                    } });
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    }
    catch (err) {
        console.error('Error processing webhook event', err);
        // still return 200 to avoid retries for unhandled/non-recoverable issues, but log for investigation
    }
    res.json({ received: true });
}
