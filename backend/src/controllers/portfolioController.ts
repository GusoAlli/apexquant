import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getPortfolioSummary(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  // ── MT5 accounts ──────────────────────────────────────────────────────────
  const mt5Accounts = await prisma.mT5Account.findMany({
    where: { userId },
    include: { metrics: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });

  let mt5Balance = 0;
  let mt5Equity = 0;
  let mt5Positions = 0;
  let mt5HasMetrics = false;

  const mt5Rows = mt5Accounts.map((acc) => {
    const m = acc.metrics[0] ?? null;
    if (m) {
      mt5HasMetrics = true;
      mt5Balance += m.balance ?? 0;
      mt5Equity  += m.equity  ?? 0;
      try {
        const pos = m.positions ? JSON.parse(m.positions) : [];
        mt5Positions += Array.isArray(pos) ? pos.length : 0;
      } catch {}
    }
    return {
      id: acc.id,
      source: 'mt5' as const,
      type: 'MT5' as const,
      label: `${acc.broker} #${acc.accountNumber}`,
      status: acc.status,
      lastSync: acc.lastPing ?? null,
      balances: m ? [{ asset: 'USD', free: m.balance ?? 0, locked: 0, usdValue: m.equity ?? m.balance ?? 0 }] : [],
      totalUsd: m ? (m.equity ?? m.balance ?? 0) : null,
    };
  });

  // ── CEX broker accounts ───────────────────────────────────────────────────
  const cexAccounts = await prisma.brokerAccount.findMany({
    where: { userId },
    include: { balances: { orderBy: { snapshotAt: 'desc' } } },
    orderBy: { createdAt: 'asc' },
  });

  let cexBalance = 0;
  let cexHasMetrics = false;

  const cexRows = cexAccounts.map((acc) => {
    // Group balances by asset (latest snapshot)
    const seen = new Set<string>();
    const uniqueBalances: typeof acc.balances = [];
    for (const b of acc.balances) {
      if (!seen.has(b.asset)) { seen.add(b.asset); uniqueBalances.push(b); }
    }

    const totalUsd = uniqueBalances.reduce((sum, b) => sum + (b.usdValue ?? 0), 0);
    // Include last-known balances even when account is in error state
    if (uniqueBalances.length > 0) {
      cexHasMetrics = true;
      cexBalance += totalUsd;
    }

    return {
      id: acc.id,
      source: 'cex' as const,
      type: acc.type.toUpperCase(),
      label: acc.label,
      status: acc.status,
      errorMsg: acc.errorMsg ?? null,
      lastSync: acc.lastSync ?? null,
      balances: uniqueBalances.map((b) => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked,
        usdValue: b.usdValue,
      })),
      totalUsd: uniqueBalances.length > 0 ? totalUsd : null,
    };
  });

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const hasAccounts = mt5Accounts.length + cexAccounts.length > 0;
  const hasMetrics  = mt5HasMetrics || cexHasMetrics;
  const totalBalance = mt5Balance + cexBalance;
  const totalEquity  = mt5Equity  + cexBalance; // CEX has no separate equity concept

  return res.json({
    hasAccounts,
    hasMetrics,
    totalBalance: hasMetrics ? totalBalance : null,
    totalEquity:  hasMetrics ? totalEquity  : null,
    floatingPnL:  mt5HasMetrics ? mt5Equity - mt5Balance : null,
    totalPositions: mt5HasMetrics ? mt5Positions : null,
    accountCount: mt5Accounts.length + cexAccounts.length,
    accounts: [...mt5Rows, ...cexRows],
  });
}
