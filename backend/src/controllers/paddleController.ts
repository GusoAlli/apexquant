import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { paddlePost, verifyPaddleSignature } from '../lib/paddleClient';

// ── Create Paddle Checkout (hosted page) ─────────────────────────────────────

export async function createPaddleCheckout(req: Request, res: Response) {
  const userId = (req as any).userId as string | undefined;
  const { planId } = req.body as { planId?: string };

  if (!userId) return res.status(401).json({ message: 'unauthenticated' });
  if (!planId)  return res.status(400).json({ message: 'planId required' });

  if (!process.env.PADDLE_API_KEY) {
    return res.status(503).json({ message: 'Paddle payment gateway not configured.' });
  }

  const [plan, user] = await Promise.all([
    prisma.plan.findUnique({ where: { id: planId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!plan)              return res.status(400).json({ message: 'Plan not found.' });
  if (!plan.paddlePriceId) return res.status(400).json({ message: 'Paddle pricing not configured for this plan.' });
  if (!user)              return res.status(404).json({ message: 'User not found.' });

  const domain = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  try {
    const transaction = await paddlePost<Record<string, unknown>>('/transactions', {
      items: [{ price_id: plan.paddlePriceId, quantity: 1 }],
      custom_data: { userId, planId: plan.id },
    });

    const transactionId = transaction.id as string | undefined;
    if (!transactionId) throw new Error('Paddle did not return a transaction ID.');

    return res.status(201).json({ transactionId });
  } catch (err: any) {
    console.error('Paddle checkout error:', err?.message);
    return res.status(502).json({ message: `Payment gateway error: ${err?.message}` });
  }
}

// ── Paddle Webhook ────────────────────────────────────────────────────────────

export async function paddleWebhookHandler(req: Request, res: Response) {
  const rawBody: Buffer = req.body;
  const signature = req.headers['paddle-signature'] as string | undefined;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    try {
      if (!verifyPaddleSignature(rawBody, signature, webhookSecret)) {
        console.warn('Paddle webhook: invalid signature');
        return res.status(401).json({ message: 'Invalid signature' });
      }
    } catch {
      return res.status(401).json({ message: 'Signature verification failed' });
    }
  }

  let event: { event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  console.log('Paddle webhook event:', event.event_type, event.data?.id);

  try {
    switch (event.event_type) {
      case 'transaction.completed':
        await handleTransactionCompleted(event.data);
        break;
      case 'subscription.created':
      case 'subscription.activated':
        await activateSub(event.data);
        break;
      case 'subscription.updated':
        await updateSub(event.data);
        break;
      case 'subscription.canceled':
        await cancelSub(event.data);
        break;
    }
  } catch (err) {
    console.error('Paddle webhook processing error:', err);
  }

  return res.json({ received: true });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function handleTransactionCompleted(data: Record<string, unknown>) {
  const customData = data.custom_data as { userId?: string; planId?: string } | null;

  if (!customData?.userId) {
    console.warn('Paddle transaction.completed: no userId in custom_data');
    return;
  }

  const subscriptionId = data.subscription_id as string | undefined;
  const priceId = (data.items as any)?.[0]?.price?.id as string | undefined;
  if (!priceId) return;

  const plan = await prisma.plan.findFirst({ where: { paddlePriceId: priceId } });
  if (!plan) {
    console.warn('Paddle transaction.completed: plan not found for priceId', priceId);
    return;
  }

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (subscriptionId) {
    await prisma.subscription.upsert({
      where:  { paddleSubId: subscriptionId },
      update: { status: 'active', currentPeriodEnd: periodEnd, planId: plan.id },
      create: {
        userId:          customData.userId,
        planId:          plan.id,
        provider:        'paddle',
        paddleSubId:     subscriptionId,
        status:          'active',
        currentPeriodEnd: periodEnd,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId:          customData.userId,
        planId:          plan.id,
        provider:        'paddle',
        status:          'active',
        currentPeriodEnd: periodEnd,
      },
    });
  }

  console.log(`Paddle: transaction completed, subscription activated for user ${customData.userId}`);
}

async function activateSub(data: Record<string, unknown>) {
  const paddleSubId  = data.id as string;
  const customData   = data.custom_data as { userId?: string; planId?: string } | null;

  if (!customData?.userId) {
    console.warn('Paddle: no userId in custom_data for sub', paddleSubId);
    return;
  }

  const priceId = (data.items as any)?.[0]?.price?.id as string | undefined;
  if (!priceId) return;

  const plan = await prisma.plan.findFirst({ where: { paddlePriceId: priceId } });
  if (!plan) {
    console.warn('Paddle: plan not found for priceId', priceId);
    return;
  }

  const billingPeriod = data.current_billing_period as any;
  const periodEnd = billingPeriod?.ends_at
    ? new Date(billingPeriod.ends_at)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where:  { paddleSubId },
    update: { status: 'active', currentPeriodEnd: periodEnd, planId: plan.id },
    create: {
      userId: customData.userId,
      planId: plan.id,
      provider: 'paddle',
      paddleSubId,
      status: 'active',
      currentPeriodEnd: periodEnd,
    },
  });

  console.log(`Paddle: sub ${paddleSubId} activated for user ${customData.userId}`);
}

async function updateSub(data: Record<string, unknown>) {
  const paddleSubId   = data.id as string;
  const status        = data.status === 'canceled' ? 'canceled'
                      : data.status === 'paused'   ? 'paused'
                      : 'active';
  const billingPeriod = data.current_billing_period as any;
  const periodEnd     = billingPeriod?.ends_at ? new Date(billingPeriod.ends_at) : undefined;
  const willCancel    = (data.scheduled_change as any)?.action === 'cancel';

  await prisma.subscription.update({
    where: { paddleSubId },
    data:  {
      status,
      ...(periodEnd && { currentPeriodEnd: periodEnd }),
      cancelAtPeriodEnd: willCancel,
    },
  }).catch(() => {});
}

async function cancelSub(data: Record<string, unknown>) {
  await prisma.subscription.update({
    where: { paddleSubId: data.id as string },
    data:  { status: 'canceled', cancelAtPeriodEnd: false },
  }).catch(() => {});
}
