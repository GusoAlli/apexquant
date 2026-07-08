import { Router, Request, Response } from 'express';
import { requireAuth }    from '../middleware/authMiddleware';
import { requireAdmin }   from '../middleware/requireAdmin';
import { getEngineRunner, resetEngineRunner, RunnerConfig } from '../engine/EngineRunner';
import { CandleProvider } from '../engine/data/CandleProvider';
import { TradingEngine }  from '../engine/TradingEngine';
import type { AccountState } from '../engine/types/risk.types';
import type { AssetData }    from '../engine/types/engine.types';
import type { BinanceInterval } from '../engine/data/CandleProvider';
import prisma from '../lib/prisma';

const router = Router();

// ── GET /api/engine/status ───────────────────────────────────────────────────
// Returns engine status (running, last run, next run)

router.get('/status', requireAuth, (_req: Request, res: Response) => {
  const runner = getEngineRunner();
  return res.json(runner.getStatus());
});

// ── POST /api/engine/run ─────────────────────────────────────────────────────
// Manually trigger a full engine run (admin only)

router.post('/run', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const runner = getEngineRunner();
  try {
    const account: AccountState | undefined = req.body.account;
    const results = await runner.run(account ?? undefined);
    return res.json({
      ran: results.length,
      results: results.map(r => ({
        symbol:     r.symbol,
        direction:  r.signal.direction,
        confidence: r.signal.confidence,
        confirmed:  r.signal.confirmed,
        regime:     r.signal.regime,
        allowed:    r.sizing.allowed,
        lotSize:    r.sizing.lotSize,
        reason:     r.sizing.reason,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? 'Engine run failed' });
  }
});

// ── POST /api/engine/analyze ─────────────────────────────────────────────────
// Run engine on a specific symbol + timeframe without persisting — returns analysis

router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  const { symbol, interval = '1h', higherTfInterval, isFutures = false } = req.body as {
    symbol: string;
    interval?: BinanceInterval;
    higherTfInterval?: BinanceInterval;
    isFutures?: boolean;
  };

  if (!symbol) return res.status(400).json({ message: 'symbol is required' });

  try {
    const provider = new CandleProvider(30);
    const [candles, higherTfCandles] = await Promise.all([
      provider.fetchBinance(symbol, interval, 500),
      higherTfInterval ? provider.fetchBinance(symbol, higherTfInterval, 200) : Promise.resolve(undefined),
    ]);

    const fundingRate = isFutures ? await provider.fetchFundingRate(symbol) : undefined;

    const asset: AssetData = {
      symbol,
      candles,
      higherTfCandles,
      fundingRate: fundingRate ?? undefined,
    };

    const engine = new TradingEngine({
      symbols:    [symbol],
      riskConfig: { riskPerTrade: 1, maxDailyLoss: 3, maxDrawdown: 10, maxOpenPositions: 5, minRR: 1.5 },
      confirmationThreshold: 3,
    });

    const account: AccountState = {
      balance: 10_000, equity: 10_000, openPositions: 0, dailyPnl: 0, peakEquity: 10_000,
    };

    const result = await engine.runAsset(asset, account);

    return res.json({
      symbol:      result.symbol,
      regime:      result.signal.regime,
      direction:   result.signal.direction,
      confidence:  result.signal.confidence,
      confirmed:   result.signal.confirmed,
      sizing:      result.sizing,
      votes: result.signal.votes.map(v => ({
        strategy:   v.strategy,
        direction:  v.direction,
        confidence: v.confidence,
        reason:     v.reason,
      })),
      confirmationChecks: result.signal.confirmationDetail.checks,
      candleCount: candles.length,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? 'Analysis failed' });
  }
});

// ── GET /api/engine/portfolio ─────────────────────────────────────────────────
// Rank a list of symbols by composite score

router.get('/portfolio', requireAuth, async (req: Request, res: Response) => {
  const { symbols, interval = '1h' } = req.query as { symbols?: string; interval?: BinanceInterval };
  const symbolList = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

  try {
    const provider  = new CandleProvider(60);
    const candleMap = await provider.fetchMulti(symbolList, interval, 300);

    const assets: AssetData[] = symbolList
      .filter(s => candleMap.has(s))
      .map(s => ({ symbol: s, candles: candleMap.get(s)! }));

    const engine = new TradingEngine({
      symbols: symbolList,
      riskConfig: { riskPerTrade: 1, maxDailyLoss: 3, maxDrawdown: 10, maxOpenPositions: 5, minRR: 1.5 },
    });

    const ranking = engine.rankAssets(assets);
    return res.json(ranking);
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? 'Ranking failed' });
  }
});

// ── GET /api/engine/performance ───────────────────────────────────────────────
// Strategy performance from the global runner

router.get('/performance', requireAuth, (_req: Request, res: Response) => {
  const runner = getEngineRunner();
  return res.json(runner.getPerformance());
});

// ── POST /api/engine/scheduler/start  ────────────────────────────────────────
// Start/stop auto scheduler (admin only)

router.post('/scheduler/start', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const { intervalMinutes = 60 } = req.body as { intervalMinutes?: number };
  getEngineRunner().startScheduler(intervalMinutes);
  return res.json({ message: `Scheduler started — every ${intervalMinutes}m` });
});

router.post('/scheduler/stop', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  getEngineRunner().stopScheduler();
  return res.json({ message: 'Scheduler stopped' });
});

// ── POST /api/engine/reconfigure ─────────────────────────────────────────────
// Replace runner config (admin only, clears singleton)

router.post('/reconfigure', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const config = req.body as RunnerConfig;
  if (!config.symbols?.length || !config.riskConfig) {
    return res.status(400).json({ message: 'symbols and riskConfig are required' });
  }
  resetEngineRunner();
  return res.json({ message: 'Engine runner reset — next run uses new config' });
});

export default router;
