import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { TradingEngine } from '../engine/TradingEngine';
import type { OHLCV } from '../engine/types/market.types';
import type { AccountState, RiskConfig } from '../engine/types/risk.types';

function sha256(t: string) {
  return crypto.createHash('sha256').update(t).digest('hex');
}

async function getTokenRecord(req: Request) {
  const auth = req.headers['authorization'] ?? '';
  const raw = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!raw) return null;
  return prisma.mT5Token.findUnique({ where: { tokenHash: sha256(raw) } });
}

function defaultRisk(): RiskConfig {
  return {
    riskPerTrade: 1,
    maxDailyLoss: 3,
    maxDrawdown: 10,
    maxOpenPositions: 3,
    minRR: 1.5,
  };
}

// ── EA → Signal (MT5 token auth) ─────────────────────────────────────────────

export async function getSignal(req: Request, res: Response) {
  const tokenRecord = await getTokenRecord(req);
  if (!tokenRecord) return res.status(401).json({ message: 'invalid token' });

  const { symbol, candles, account } = req.body as {
    symbol: string;
    candles: OHLCV[];
    account: AccountState;
  };

  if (!symbol || !Array.isArray(candles) || candles.length < 30) {
    return res.status(400).json({ message: 'symbol and at least 30 candles required' });
  }

  const config = await prisma.botConfig.findUnique({ where: { userId: tokenRecord.userId } });

  if (!config?.enabled) {
    return res.json({ action: 'HOLD', reason: 'Bot is disabled' });
  }

  let allowedSymbols: string[] = [];
  try { allowedSymbols = JSON.parse(config.symbols); } catch { /* fallback to empty */ }

  if (!allowedSymbols.includes(symbol)) {
    return res.json({ action: 'HOLD', reason: `${symbol} not in bot symbol list` });
  }

  const riskConfig: RiskConfig = {
    riskPerTrade: config.riskPerTrade,
    maxDailyLoss: config.maxDailyLoss,
    maxDrawdown: config.maxDrawdown,
    maxOpenPositions: config.maxOpenPositions,
    minRR: config.minRR,
  };

  const engine = new TradingEngine({
    symbols: [symbol],
    riskConfig,
    confirmationThreshold: 2,
  });

  const accountState: AccountState = {
    balance: account?.balance ?? 10_000,
    equity: account?.equity ?? 10_000,
    openPositions: account?.openPositions ?? 0,
    dailyPnl: account?.dailyPnl ?? 0,
    peakEquity: account?.peakEquity ?? account?.balance ?? 10_000,
  };

  const result = await engine.runAsset({ symbol, candles }, accountState);

  if (result.signal.direction === 'WAIT' || !result.signal.confirmed) {
    const reason = result.signal.votes.map(v => `${v.strategy}: ${v.direction}`).join(' | ');
    return res.json({ action: 'HOLD', reason: reason || 'No confirmed signal' });
  }

  if (!result.sizing.allowed) {
    return res.json({ action: 'HOLD', reason: result.sizing.reason ?? 'Risk limit reached' });
  }

  const entry = candles[candles.length - 1].close;
  const sl = result.signal.direction === 'BUY'
    ? entry - result.sizing.stopLossPips
    : entry + result.sizing.stopLossPips;
  const tp = result.signal.direction === 'BUY'
    ? entry + result.sizing.takeProfitPips
    : entry - result.sizing.takeProfitPips;

  const strategies = result.signal.votes
    .filter(v => v.direction === result.signal.direction)
    .map(v => v.strategy)
    .join(', ');

  const savedSignal = await prisma.signal.create({
    data: {
      pair: symbol,
      direction: result.signal.direction,
      entry: round5(entry),
      tp: round5(tp),
      sl: round5(sl),
      strength: result.signal.confidence,
      timeframe: '1h',
      model: `Bot: ${strategies}`,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
  });

  return res.json({
    action: result.signal.direction,
    sl: round5(sl),
    tp: round5(tp),
    lotSize: config.lotSize,
    confidence: result.signal.confidence,
    regime: result.signal.regime,
    reason: strategies,
    signalId: savedSignal.id,
    rr: result.sizing.rr,
  });
}

// ── EA → Report executed trade (MT5 token auth) ───────────────────────────────

export async function reportTrade(req: Request, res: Response) {
  const tokenRecord = await getTokenRecord(req);
  if (!tokenRecord) return res.status(401).json({ message: 'invalid token' });

  const { signalId, ticket, symbol, action, volume, openPrice, sl, tp, success, error } = req.body as {
    signalId?: string;
    ticket?: number;
    symbol: string;
    action: string;
    volume: number;
    openPrice: number;
    sl: number;
    tp: number;
    success: boolean;
    error?: string;
  };

  if (!symbol || !action) return res.status(400).json({ message: 'symbol and action required' });

  await prisma.botTrade.create({
    data: {
      userId: tokenRecord.userId,
      signalId: signalId ?? null,
      ticket: ticket ?? null,
      symbol,
      action,
      volume: Number(volume) || 0,
      openPrice: Number(openPrice) || 0,
      sl: Number(sl) || 0,
      tp: Number(tp) || 0,
      status: success ? 'open' : 'failed',
      error: error ?? null,
    },
  });

  return res.json({ ok: true });
}

// ── Dashboard → Bot status (JWT auth) ────────────────────────────────────────

export async function getBotStatus(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const [config, recentTrades, recentSignals] = await Promise.all([
    prisma.botConfig.findUnique({ where: { userId } }),
    prisma.botTrade.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 10,
    }),
    prisma.signal.findMany({
      where: { model: { startsWith: 'Bot:' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const openTrades  = recentTrades.filter(t => t.status === 'open').length;
  const totalTrades = recentTrades.length;
  const wins        = recentTrades.filter(t => (t.pnl ?? 0) > 0).length;

  return res.json({
    enabled: config?.enabled ?? false,
    symbols: config ? (() => { try { return JSON.parse(config.symbols); } catch { return []; } })() : [],
    openTrades,
    totalTrades,
    winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : null,
    lastSignal: recentSignals[0] ?? null,
    recentTrades,
    config: config ?? null,
  });
}

// ── Dashboard → Bot config CRUD (JWT auth) ───────────────────────────────────

export async function getBotConfig(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const config = await prisma.botConfig.findUnique({ where: { userId } });
  if (!config) {
    return res.json({
      enabled: false,
      symbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
      riskPerTrade: 1,
      maxDailyLoss: 3,
      maxDrawdown: 10,
      maxOpenPositions: 3,
      minRR: 1.5,
      lotSize: 0.01,
    });
  }

  return res.json({
    ...config,
    symbols: (() => { try { return JSON.parse(config.symbols); } catch { return []; } })(),
  });
}

export async function updateBotConfig(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const { enabled, symbols, riskPerTrade, maxDailyLoss, maxDrawdown, maxOpenPositions, minRR, lotSize } = req.body;

  const data = {
    enabled: Boolean(enabled),
    symbols: JSON.stringify(Array.isArray(symbols) ? symbols : ['EURUSD', 'GBPUSD', 'XAUUSD']),
    riskPerTrade: Number(riskPerTrade) || 1,
    maxDailyLoss: Number(maxDailyLoss) || 3,
    maxDrawdown: Number(maxDrawdown) || 10,
    maxOpenPositions: Number(maxOpenPositions) || 3,
    minRR: Number(minRR) || 1.5,
    lotSize: Number(lotSize) || 0.01,
  };

  const config = await prisma.botConfig.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return res.json({
    ...config,
    symbols: (() => { try { return JSON.parse(config.symbols); } catch { return []; } })(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round5(n: number) {
  return Math.round(n * 100000) / 100000;
}
