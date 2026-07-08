import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const SPOT_FEE   = 0.001;  // 0.10% taker
const FUT_FEE    = 0.0005; // 0.05% taker
const ROUND_TRIP = (SPOT_FEE + FUT_FEE) * 2; // open + close both sides
const AMORTIZE_CYCLES = 90; // assume 30-day hold

function netApr(rateDecimal: number): number {
  const feeDragPerCycle = ROUND_TRIP / AMORTIZE_CYCLES;
  const netPerCycle     = Math.abs(rateDecimal) - feeDragPerCycle;
  return netPerCycle * 3 * 365 * 100; // annualised %
}

// ── GET /api/yield/opportunities ─────────────────────────────────────────────

export async function getOpportunities(_req: Request, res: Response) {
  try {
    const [ratesRes, tickerRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
      fetch('https://fapi.binance.com/fapi/v1/ticker/24hr'),
    ]);
    if (!ratesRes.ok || !tickerRes.ok) {
      return res.status(502).json({ error: 'Binance API unavailable' });
    }

    const rates  = await ratesRes.json()  as any[];
    const tickers = await tickerRes.json() as any[];

    const volMap = new Map<string, number>();
    for (const t of tickers) {
      volMap.set(t.symbol, parseFloat(t.quoteVolume));
    }

    const rows = rates
      .filter((r: any) => typeof r.symbol === 'string' && r.symbol.endsWith('USDT'))
      .map((r: any) => {
        const rateRaw  = parseFloat(r.lastFundingRate);
        const vol24h   = volMap.get(r.symbol) ?? 0;
        const apr      = netApr(rateRaw);
        return {
          symbol:       r.symbol,
          display:      r.symbol.replace('USDT', '/USDT'),
          base:         r.symbol.replace(/USDT$/, ''),
          rate:         rateRaw * 100,
          rawApr:       rateRaw * 3 * 365 * 100,
          netApr:       apr,
          direction:    rateRaw >= 0 ? 'short_futures_long_spot' : 'long_futures_short_spot',
          nextFunding:  Number(r.nextFundingTime),
          vol24h,
          viable:       apr > 0 && vol24h > 20_000_000,
        };
      })
      .filter((r) => Math.abs(r.rate) > 0.001)
      .sort((a, b) => b.netApr - a.netApr)
      .slice(0, 50);

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Scan failed' });
  }
}

// ── GET /api/yield/positions ──────────────────────────────────────────────────

export async function listPositions(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const positions = await prisma.fundingPosition.findMany({
    where: { userId },
    orderBy: { openedAt: 'desc' },
  });
  return res.json(positions);
}

// ── GET /api/yield/summary ────────────────────────────────────────────────────

export async function getSummary(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const positions = await prisma.fundingPosition.findMany({ where: { userId } });

  const open   = positions.filter((p) => p.status === 'open');
  const closed = positions.filter((p) => p.status === 'closed');

  const totalCollected  = positions.reduce((s, p) => s + p.fundingCollected, 0);
  const totalFees       = positions.reduce((s, p) => s + p.feesTotal, 0);
  const netPnl          = positions.reduce((s, p) => s + p.netPnl, 0);
  const totalCycles     = positions.reduce((s, p) => s + p.cyclesCollected, 0);
  const activeNotional  = open.reduce((s, p) => s + p.notional, 0);
  const avgEntryRate    = open.length > 0
    ? open.reduce((s, p) => s + Math.abs(p.entryRate), 0) / open.length
    : 0;

  return res.json({
    openCount:      open.length,
    closedCount:    closed.length,
    totalCollected,
    totalFees,
    netPnl,
    totalCycles,
    activeNotional,
    avgEntryRate,
  });
}

// ── POST /api/yield/positions ─────────────────────────────────────────────────

export async function openPosition(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const {
    symbol, direction, notional, entryRate,
    entrySpotPrice, entryFutPrice, leverage,
    cyclesTarget, feesTotal, note,
  } = req.body as {
    symbol: string; direction: string; notional: number; entryRate: number;
    entrySpotPrice: number; entryFutPrice: number; leverage?: number;
    cyclesTarget?: number; feesTotal?: number; note?: string;
  };

  if (!symbol || !direction || !notional || entryRate === undefined) {
    return res.status(400).json({ error: 'symbol, direction, notional, entryRate required' });
  }

  const position = await prisma.fundingPosition.create({
    data: {
      userId,
      symbol: symbol.toUpperCase(),
      direction,
      notional,
      entryRate,
      entrySpotPrice,
      entryFutPrice,
      leverage: leverage ?? 3,
      cyclesTarget: cyclesTarget ?? 0,
      feesTotal: feesTotal ?? notional * ROUND_TRIP,
      note: note ?? null,
    },
  });
  return res.status(201).json(position);
}

// ── POST /api/yield/positions/:id/collect ────────────────────────────────────

export async function collectFunding(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id }  = req.params;
  const { amount, currentRate } = req.body as { amount?: number; currentRate?: number };

  const pos = await prisma.fundingPosition.findFirst({ where: { id, userId, status: 'open' } });
  if (!pos) return res.status(404).json({ error: 'Position not found' });

  const earned = amount ?? pos.notional * Math.abs(pos.entryRate) / 100;
  const updated = await prisma.fundingPosition.update({
    where: { id },
    data: {
      cyclesCollected:  { increment: 1 },
      fundingCollected: { increment: earned },
      netPnl: pos.fundingCollected + earned - pos.feesTotal,
      ...(currentRate !== undefined && { entryRate: currentRate }),
    },
  });
  return res.json(updated);
}

// ── PATCH /api/yield/positions/:id/close ─────────────────────────────────────

export async function closePosition(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id }  = req.params;
  const { exitFees } = req.body as { exitFees?: number };

  const pos = await prisma.fundingPosition.findFirst({ where: { id, userId, status: 'open' } });
  if (!pos) return res.status(404).json({ error: 'Position not found' });

  const totalFees = pos.feesTotal + (exitFees ?? pos.notional * (SPOT_FEE + FUT_FEE));
  const netPnl    = pos.fundingCollected - totalFees;

  const updated = await prisma.fundingPosition.update({
    where: { id },
    data: {
      status:    'closed',
      closedAt:  new Date(),
      feesTotal: totalFees,
      netPnl,
    },
  });
  return res.json(updated);
}

// ── DELETE /api/yield/positions/:id ──────────────────────────────────────────

export async function deletePosition(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id }  = req.params;
  const pos = await prisma.fundingPosition.findFirst({ where: { id, userId } });
  if (!pos) return res.status(404).json({ error: 'Position not found' });
  await prisma.fundingPosition.delete({ where: { id } });
  return res.status(204).send();
}
