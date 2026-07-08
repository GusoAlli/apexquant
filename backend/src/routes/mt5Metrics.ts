import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';
import { Request, Response } from 'express';

const router = Router();

// GET /api/mt5/metrics?accountId=&days=30
router.get('/metrics', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { accountId, days = '30' } = req.query as { accountId?: string; days?: string };

  const since = new Date(Date.now() - Number(days) * 86400_000);

  const where: any = { mt5Account: { userId }, timestamp: { gte: since } };
  if (accountId) where.mt5AccountId = accountId;

  const metrics = await prisma.mT5Metric.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true, equity: true, balance: true, mt5AccountId: true },
  });

  // Downsample to max 500 points per account to keep payload small
  const byAccount: Record<string, typeof metrics> = {};
  for (const m of metrics) {
    if (!byAccount[m.mt5AccountId]) byAccount[m.mt5AccountId] = [];
    byAccount[m.mt5AccountId].push(m);
  }
  const result: typeof metrics = [];
  for (const rows of Object.values(byAccount)) {
    const step = Math.max(1, Math.floor(rows.length / 500));
    for (let i = 0; i < rows.length; i += step) result.push(rows[i]);
  }
  result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return res.json(result);
});

export default router;
