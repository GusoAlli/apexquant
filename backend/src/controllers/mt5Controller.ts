import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Token management (JWT-authenticated) ──────────────────────────────────────

export async function generateMT5Token(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const raw = crypto.randomBytes(32).toString('hex');
  const hash = sha256(raw);

  await prisma.mT5Token.upsert({
    where: { userId },
    create: { userId, tokenHash: hash },
    update: { tokenHash: hash, createdAt: new Date() },
  });

  return res.json({ token: raw });
}

export async function getMT5TokenStatus(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const record = await prisma.mT5Token.findUnique({ where: { userId } });
  return res.json({ hasToken: !!record, createdAt: record?.createdAt ?? null });
}

// ── Accounts list (JWT-authenticated) ─────────────────────────────────────────

export async function listMT5Accounts(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const accounts = await prisma.mT5Account.findMany({
    where: { userId },
    include: { metrics: { orderBy: { timestamp: 'desc' }, take: 1 } },
    orderBy: { id: 'asc' },
  });

  return res.json(accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    broker: a.broker,
    status: a.status,
    lastPing: a.lastPing,
    balance: a.metrics[0]?.balance ?? null,
    equity: a.metrics[0]?.equity ?? null,
    positions: (() => {
      try { return JSON.parse(a.metrics[0]?.positions ?? '[]'); } catch { return []; }
    })(),
  })));
}

export async function removeMT5Account(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const { id } = req.params;
  const account = await prisma.mT5Account.findFirst({ where: { id, userId } });
  if (!account) return res.status(404).json({ message: 'Not found' });

  await prisma.mT5Metric.deleteMany({ where: { mt5AccountId: id } });
  await prisma.mT5Account.delete({ where: { id } });
  return res.json({ ok: true });
}

// ── EA ping endpoint (MT5-token authenticated) ────────────────────────────────

export async function mt5Ping(req: Request, res: Response) {
  const authHeader = req.headers['authorization'] ?? '';
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!raw) return res.status(401).json({ message: 'missing token' });

  const hash = sha256(raw);
  const tokenRecord = await prisma.mT5Token.findUnique({ where: { tokenHash: hash } });
  if (!tokenRecord) return res.status(401).json({ message: 'invalid token' });

  const { accountNumber, broker, balance, equity, positions } = req.body as {
    accountNumber: string;
    broker: string;
    balance: number;
    equity: number;
    positions: Array<{ symbol: string; type: string; volume: number; profit: number; openPrice: number }>;
  };

  if (!accountNumber || !broker) {
    return res.status(400).json({ message: 'accountNumber and broker are required' });
  }

  const userId = tokenRecord.userId;

  // Find-or-create the MT5 account (no compound unique in schema, use findFirst + create)
  let account = await prisma.mT5Account.findFirst({ where: { userId, accountNumber: String(accountNumber) } });
  if (!account) {
    account = await prisma.mT5Account.create({
      data: { userId, accountNumber: String(accountNumber), broker, status: 'active', lastPing: new Date() },
    });
  } else {
    account = await prisma.mT5Account.update({
      where: { id: account.id },
      data: { status: 'active', lastPing: new Date(), broker },
    });
  }

  // Insert metric snapshot
  await prisma.mT5Metric.create({
    data: {
      mt5AccountId: account.id,
      balance: Number(balance) || 0,
      equity: Number(equity) || 0,
      positions: JSON.stringify(positions ?? []),
    },
  });

  // Prune old metrics — keep last 1440 rows per account (≈24h at 1-min intervals)
  const count = await prisma.mT5Metric.count({ where: { mt5AccountId: account.id } });
  if (count > 1440) {
    const oldest = await prisma.mT5Metric.findMany({
      where: { mt5AccountId: account.id },
      orderBy: { timestamp: 'asc' },
      take: count - 1440,
      select: { id: true },
    });
    await prisma.mT5Metric.deleteMany({ where: { id: { in: oldest.map((r) => r.id) } } });
  }

  return res.json({ ok: true, accountId: account.id });
}
