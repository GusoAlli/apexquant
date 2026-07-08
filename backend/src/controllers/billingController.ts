import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { paddlePost } from '../lib/paddleClient';

const stripe = new Stripe(process.env.STRIPE_SECRET || '', { apiVersion: '2022-11-15' });

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription, userIdFromMeta?: string | undefined) {
  const stripeSubId = sub.id;
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return;

  const plan = await prisma.plan.findFirst({ where: { stripePriceId: priceId } });
  if (!plan) {
    console.warn('Plan not found for priceId', priceId);
    return;
  }

  // try to determine userId: prefer metadata, else try to lookup via existing subscription
  let userId = userIdFromMeta;
  if (!userId) {
    const existing = await prisma.subscription.findUnique({ where: { stripeSubId } });
    userId = existing?.userId || undefined;
  }
  if (!userId) {
    console.warn('No userId available for subscription', stripeSubId);
    return;
  }

  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  await prisma.subscription.upsert({
    where: { stripeSubId },
    update: {
      status: sub.status,
      currentPeriodEnd: currentPeriodEnd as any,
      planId: plan.id
    },
    create: {
      userId,
      planId: plan.id,
      stripeSubId: stripeSubId,
      status: sub.status,
      currentPeriodEnd: currentPeriodEnd as any
    }
  });
}

export async function getPlans(req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    where: { slug: { not: 'free' } },
    orderBy: { priceCents: 'asc' },
  });
  return res.json(plans);
}

export async function getMySubscription(req: Request, res: Response) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing'] } },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  return res.json(sub ?? null);
}

export async function cancelMySubscription(req: Request, res: Response) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!sub) return res.status(404).json({ message: 'No active subscription found' });

  if (sub.stripeSubId) {
    try {
      await stripe.subscriptions.update(sub.stripeSubId, { cancel_at_period_end: true });
    } catch (err: any) {
      console.error('Stripe cancel error:', err?.message);
      return res.status(502).json({ message: 'Failed to cancel with payment provider. Please try again.' });
    }
  } else if (sub.paddleSubId && process.env.PADDLE_API_KEY) {
    try {
      await paddlePost(`/subscriptions/${sub.paddleSubId}/cancel`, { effective_from: 'next_billing_period' });
    } catch (err: any) {
      console.error('Paddle cancel error:', err?.message);
      return res.status(502).json({ message: 'Failed to cancel with payment provider. Please try again.' });
    }
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  return res.json({ message: 'Subscription will cancel at end of the current billing period' });
}

export async function createCheckoutSession(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { planId } = req.body;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });
  if (!planId) return res.status(400).json({ message: 'planId required' });

  if (!process.env.STRIPE_SECRET) {
    return res.status(503).json({ message: 'Payment gateway not configured. Please contact support.' });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.stripePriceId) {
    return res.status(400).json({ message: 'Selected plan is not available for purchase. Please contact support.' });
  }

  const domain = process.env.FRONTEND_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${domain}/dashboard/licenses?success=1`,
    cancel_url: `${domain}/dashboard/licenses`,
    metadata: { userId },
  });

  return res.status(201).json({ url: session.url });
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string | undefined;
  const raw = req.body; // express.raw middleware used for this route
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ message: 'webhook secret not configured' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig || '', webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId as string | undefined;
        // if subscription was created immediately, create DB record
        if (session.subscription && typeof session.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string, { expand: ['items.data.price'] });
          await upsertSubscriptionFromStripe(sub, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // if metadata contains userId use it; otherwise rely on existing mapping
        const userIdMeta = (subscription.metadata as any)?.userId;
        await upsertSubscriptionFromStripe(subscription, userIdMeta);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const paymentIntentId = invoice.payment_intent as string | undefined;
        const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
        const currency = invoice.currency ?? 'usd';

        // find subscription owner
        const stripeSubId = invoice.subscription as string | undefined;
        let userId: string | undefined;
        if (stripeSubId) {
          const dbSub = await prisma.subscription.findUnique({ where: { stripeSubId } });
          userId = dbSub?.userId;
        }

        await prisma.payment.create({ data: {
          userId: userId || undefined,
          stripePaymentId: paymentIntentId ?? invoice.id,
          amountCents: amount,
          currency: currency,
          status: 'paid',
          metadata: invoice.metadata as any
        }});
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const paymentIntentId = invoice.payment_intent as string | undefined;
        const amount = invoice.amount_due ?? 0;
        const currency = invoice.currency ?? 'usd';
        const stripeSubId = invoice.subscription as string | undefined;
        let userId: string | undefined;
        if (stripeSubId) {
          const dbSub = await prisma.subscription.findUnique({ where: { stripeSubId } });
          userId = dbSub?.userId;
        }

        await prisma.payment.create({ data: {
          userId: userId || undefined,
          stripePaymentId: paymentIntentId ?? invoice.id,
          amountCents: amount,
          currency: currency,
          status: 'failed',
          metadata: invoice.metadata as any
        }});
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err) {
    console.error('Error processing webhook event', err);
    // still return 200 to avoid retries for unhandled/non-recoverable issues, but log for investigation
  }

  res.json({ received: true });
}
