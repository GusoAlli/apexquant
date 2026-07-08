import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// ── Xendit REST client (native fetch, Node 18+) ───────────────────────────────

const XENDIT_BASE = 'https://api.xendit.co';

function xenditHeaders(): Record<string, string> {
  const key = process.env.XENDIT_SECRET_KEY ?? '';
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

async function xenditPost(path: string, body: object) {
  const res = await fetch(`${XENDIT_BASE}${path}`, {
    method: 'POST',
    headers: xenditHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.message as string) ?? `Xendit error ${res.status}`);
  return data;
}

// ── Create Xendit Invoice (checkout) ─────────────────────────────────────────

export async function createXenditCheckout(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { planId } = req.body as { planId?: string };

  if (!userId) return res.status(401).json({ message: 'unauthenticated' });
  if (!planId) return res.status(400).json({ message: 'planId required' });

  if (!process.env.XENDIT_SECRET_KEY) {
    return res.status(503).json({ message: 'Xendit payment gateway not configured.' });
  }

  const [plan, user] = await Promise.all([
    prisma.plan.findUnique({ where: { id: planId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!plan) return res.status(400).json({ message: 'Plan not found.' });
  if (!plan.priceIdr) return res.status(400).json({ message: 'IDR pricing not configured for this plan.' });
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const externalId = `apexquant_${plan.slug}_${userId}_${Date.now()}`;
  const domain = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  try {
    const invoice = await xenditPost('/v2/invoices', {
      external_id: externalId,
      amount: plan.priceIdr,
      description: `ApexQuant ${plan.name} — Langganan Bulanan`,
      payer_email: user.email,
      customer: {
        given_names: user.name ?? 'ApexQuant User',
        email: user.email,
      },
      customer_notification_preference: {
        invoice_created: ['email'],
        invoice_reminder: ['email'],
        invoice_paid: ['email'],
      },
      success_redirect_url: `${domain}/dashboard/licenses?payment=success&provider=xendit`,
      failure_redirect_url: `${domain}/dashboard/licenses?payment=failed&provider=xendit`,
      currency: 'IDR',
      items: [{ name: plan.name, quantity: 1, price: plan.priceIdr, category: 'SOFTWARE' }],
      metadata: { userId, planId },
    });

    const invoiceId = invoice.id as string;

    // Store pending subscription — activated when Xendit webhook fires
    await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        provider: 'xendit',
        xenditInvoiceId: invoiceId,
        status: 'pending',
      },
    });

    return res.status(201).json({
      url: invoice.invoice_url as string,
      invoiceId,
    });
  } catch (err: any) {
    console.error('Xendit checkout error:', err?.message);
    return res.status(502).json({ message: `Payment gateway error: ${err?.message}` });
  }
}

// ── Xendit Webhook ────────────────────────────────────────────────────────────

export async function xenditWebhookHandler(req: Request, res: Response) {
  // Verify Xendit callback token
  const callbackToken = req.headers['x-callback-token'] as string | undefined;
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

  if (expectedToken && callbackToken !== expectedToken) {
    console.warn('Xendit webhook: invalid callback token');
    return res.status(401).json({ message: 'Invalid callback token' });
  }

  const event = req.body as {
    id?: string;
    external_id?: string;
    status?: string;
    paid_amount?: number;
    currency?: string;
    payment_method?: string;
    metadata?: { userId?: string; planId?: string };
  };

  console.log('Xendit webhook event:', event.status, event.id);

  if (event.status === 'PAID' && event.id) {
    try {
      const sub = await prisma.subscription.findUnique({
        where: { xenditInvoiceId: event.id },
      });

      if (!sub) {
        console.warn('Xendit webhook: no subscription found for invoice', event.id);
        return res.json({ received: true });
      }

      // Activate for 30 days from now
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'active', currentPeriodEnd: periodEnd },
      });

      // Record payment — Xendit IDR has no decimal places, store as-is
      await prisma.payment.create({
        data: {
          userId: sub.userId,
          provider: 'xendit',
          xenditPaymentId: event.id,
          amountCents: event.paid_amount ?? 0,
          currency: 'IDR',
          status: 'paid',
          metadata: JSON.stringify({
            externalId: event.external_id,
            paymentMethod: event.payment_method,
          }),
        },
      });

      console.log(`Xendit: subscription ${sub.id} activated for user ${sub.userId}`);
    } catch (err) {
      console.error('Xendit webhook processing error:', err);
    }
  }

  return res.json({ received: true });
}
