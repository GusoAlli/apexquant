import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getPlatformStats(req: Request, res: Response) {
  const [userCount, activeSubs, totalPayments, mt5Count, cexCount] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: 'succeeded' } }),
    prisma.mT5Account.count(),
    prisma.brokerAccount.count({ where: { status: 'active' } }),
  ]);
  return res.json({
    userCount,
    activeSubs,
    totalRevenue: (payment: any) => payment,
    totalRevenueCents: totalPayments._sum.amountCents ?? 0,
    mt5Count,
    cexCount,
  });
}

export async function listUsers(req: Request, res: Response) {
  const { page = '1', search = '' } = req.query as { page?: string; search?: string };
  const take = 20;
  const skip = (Number(page) - 1) * take;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name:  { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        role: { select: { name: true } },
        subscriptions: { where: { status: 'active' }, include: { plan: { select: { name: true, slug: true } } }, take: 1 },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return res.json({
    total,
    page: Number(page),
    pages: Math.ceil(total / take),
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role.name,
      isVerified: u.isVerified,
      createdAt: u.createdAt,
      plan: u.subscriptions[0]?.plan?.name ?? null,
      planSlug: u.subscriptions[0]?.plan?.slug ?? null,
      subStatus: u.subscriptions[0]?.status ?? null,
    })),
  });
}

export async function assignSubscription(req: Request, res: Response) {
  const { id } = req.params;
  const { planSlug, expiresAt } = req.body as { planSlug: string; expiresAt?: string };
  if (!planSlug) return res.status(400).json({ message: 'planSlug is required' });

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  await prisma.subscription.updateMany({
    where: { userId: id, status: 'active' },
    data: { status: 'canceled' },
  });

  const periodEnd = expiresAt ? new Date(expiresAt) : new Date('2099-12-31T23:59:59Z');

  const sub = await prisma.subscription.create({
    data: { userId: id, planId: plan.id, status: 'active', currentPeriodEnd: periodEnd },
    include: { plan: { select: { name: true, slug: true } } },
  });

  return res.json({
    id: sub.id,
    plan: sub.plan.name,
    planSlug: sub.plan.slug,
    expiresAt: sub.currentPeriodEnd,
  });
}

export async function revokeSubscription(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  await prisma.subscription.updateMany({
    where: { userId: id, status: 'active' },
    data: { status: 'canceled' },
  });

  return res.json({ ok: true });
}

export async function setUserRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role } = req.body as { role: string };
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: "role must be 'admin' or 'user'" });
  }
  const requesterId = (req as any).userId as string;
  if (id === requesterId && role === 'user') {
    return res.status(400).json({ message: 'Cannot remove your own admin privileges' });
  }
  const roleName = role === 'admin' ? 'admin' : 'USER';
  const targetRole = await prisma.role.findFirst({ where: { name: roleName } });
  if (!targetRole) return res.status(500).json({ message: 'Role not found in database' });
  const updated = await prisma.user.update({
    where: { id },
    data: { roleId: targetRole.id },
    include: { role: { select: { name: true } } },
  });
  return res.json({ id: updated.id, role: updated.role.name });
}

export async function getAdminStats(req: Request, res: Response) {
  const [userCount, activeSubs, mt5Count, cexCount, notifCount, signalCount] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.mT5Account.count({ where: { status: 'active' } }),
    prisma.brokerAccount.count({ where: { status: 'active' } }),
    prisma.notification.count(),
    prisma.signal.count(),
  ]);

  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amountCents: true },
    where: { status: 'succeeded' },
  });

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { email: true, name: true, createdAt: true },
  });

  return res.json({
    userCount,
    activeSubs,
    mt5Count,
    cexCount,
    notifCount,
    signalCount,
    totalRevenueCents: totalRevenue._sum.amountCents ?? 0,
    recentUsers,
  });
}
