const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const plans = [
  {
    slug: 'pro',
    name: 'Pro',
    priceCents: 4900,       // USD $49/month
    priceIdr:   799000,     // IDR Rp 799.000/month
    priceUsdt:  49,         // USDT $49/month
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    paddlePriceId: process.env.PADDLE_PRICE_PRO || null,
    features: JSON.stringify([
      '3 MT5 accounts',
      'AI trading signals',
      'Performance analytics',
      'Live trade tracking',
      '1 API key',
      'Email support',
    ]),
  },
  {
    slug: 'institutional',
    name: 'Institutional',
    priceCents: 29900,      // USD $299/month
    priceIdr:   4799000,    // IDR Rp 4.799.000/month
    priceUsdt:  299,        // USDT $299/month
    currency: 'usd',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_INSTITUTIONAL || null,
    paddlePriceId: process.env.PADDLE_PRICE_INSTITUTIONAL || null,
    features: JSON.stringify([
      '10 MT5 accounts',
      'Advanced AI signals + custom models',
      'Custom risk management rules',
      'Unlimited API keys',
      'Portfolio & multi-account analytics',
      'Team seats (up to 5)',
      'Priority support & dedicated manager',
    ]),
  },
];

async function main() {
  // Roles
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user' },
  });
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  console.log('Seeded roles.');

  // Plans (no free tier — subscription required to access platform)
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name:      plan.name,
        priceCents: plan.priceCents,
        priceIdr:  plan.priceIdr,
        priceUsdt: plan.priceUsdt,
        currency:  plan.currency,
        interval:  plan.interval,
        features:  plan.features,
        ...(plan.stripePriceId  ? { stripePriceId:  plan.stripePriceId  } : {}),
        ...(plan.paddlePriceId  ? { paddlePriceId:  plan.paddlePriceId  } : {}),
      },
      create: plan,
    });
    console.log(`Seeded plan: ${plan.name} ($${plan.priceCents / 100}/${plan.interval})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
