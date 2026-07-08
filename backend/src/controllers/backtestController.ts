import { Request, Response } from 'express';
import { TradingEngine } from '../engine/TradingEngine';
import { CandleProvider } from '../engine/data/CandleProvider';
import type { OHLCV } from '../engine/types/market.types';
import type { AccountState } from '../engine/types/risk.types';
import type { BinanceInterval } from '../engine/data/CandleProvider';

const WARMUP   = 50;   // candles required before trading starts
const MAX_WINDOW = 200; // sliding candle window fed to engine

const ALLOWED_INTERVALS: BinanceInterval[] = ['15m', '1h', '4h', '1d'];

type ClosedBy = 'TP' | 'SL' | 'END';

interface BacktestTrade {
  openTime:   number;
  closeTime:  number;
  direction:  'BUY' | 'SELL';
  openPrice:  number;
  closePrice: number;
  sl:         number;
  tp:         number;
  pnl:        number;
  closedBy:   ClosedBy;
}

interface OpenPosition {
  direction:  'BUY' | 'SELL';
  openTime:   number;
  openPrice:  number;
  sl:         number;
  tp:         number;
  riskAmount: number;
  rr:         number;
}

function r2(n: number) { return Math.round(n * 100) / 100; }

export async function runBacktest(req: Request, res: Response) {
  const {
    symbol        = 'BTCUSDT',
    interval      = '1h',
    candleCount   = 300,
    initialBalance = 10000,
    riskPerTrade  = 1,
    maxDailyLoss  = 3,
    maxDrawdown   = 10,
    maxOpenPositions = 1,
    minRR         = 1.5,
  } = req.body as Record<string, unknown>;

  const safeInterval = ALLOWED_INTERVALS.includes(interval as BinanceInterval)
    ? (interval as BinanceInterval)
    : '1h';

  const count   = Math.min(Math.max(Number(candleCount) || 300, 60), 500);
  const balance0 = Math.max(Number(initialBalance) || 10000, 100);

  // ── Fetch candles ───────────────────────────────────────────────────────────
  const provider = new CandleProvider(0); // no cache
  let candles: OHLCV[];
  try {
    candles = await provider.fetchBinance(String(symbol).toUpperCase(), safeInterval, count);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ message: `Failed to fetch candles: ${msg}` });
  }

  if (candles.length < WARMUP + 10) {
    return res.status(400).json({ message: 'Not enough historical data to run backtest.' });
  }

  // ── Engine setup ────────────────────────────────────────────────────────────
  const engine = new TradingEngine({
    symbols: [String(symbol)],
    riskConfig: {
      riskPerTrade:     Number(riskPerTrade)      || 1,
      maxDailyLoss:     Number(maxDailyLoss)      || 3,
      maxDrawdown:      Number(maxDrawdown)        || 10,
      maxOpenPositions: Number(maxOpenPositions)   || 1,
      minRR:            Number(minRR)             || 1.5,
    },
    confirmationThreshold: 2,
  });

  // ── Simulation state ────────────────────────────────────────────────────────
  let balance     = balance0;
  let peakBalance = balance0;
  let maxDD       = 0;
  let dailyPnl    = 0;
  let lastDay     = 0; // reset dailyPnl at day boundary

  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ time: number; value: number }> = [
    { time: Math.floor(candles[WARMUP].timestamp / 1000), value: balance0 },
  ];

  let openPos: OpenPosition | null = null;

  for (let i = WARMUP; i < candles.length; i++) {
    const candle = candles[i];

    // Day boundary — reset dailyPnl
    const day = Math.floor(candle.timestamp / 86_400_000);
    if (day !== lastDay) { dailyPnl = 0; lastDay = day; }

    // 1. Check if existing position hits SL or TP on this candle
    if (openPos) {
      let closePrice = 0;
      let closedBy: ClosedBy | null = null;

      if (openPos.direction === 'BUY') {
        if (candle.low <= openPos.sl) {
          closePrice = openPos.sl; closedBy = 'SL';
        } else if (candle.high >= openPos.tp) {
          closePrice = openPos.tp; closedBy = 'TP';
        }
      } else {
        if (candle.high >= openPos.sl) {
          closePrice = openPos.sl; closedBy = 'SL';
        } else if (candle.low <= openPos.tp) {
          closePrice = openPos.tp; closedBy = 'TP';
        }
      }

      if (closedBy) {
        const pnl = closedBy === 'TP'
          ? openPos.riskAmount * openPos.rr
          : -openPos.riskAmount;

        balance     += pnl;
        dailyPnl    += pnl;
        peakBalance  = Math.max(peakBalance, balance);
        const dd     = ((peakBalance - balance) / peakBalance) * 100;
        maxDD        = Math.max(maxDD, dd);

        trades.push({
          openTime:   openPos.openTime,
          closeTime:  candle.timestamp,
          direction:  openPos.direction,
          openPrice:  openPos.openPrice,
          closePrice: r2(closePrice),
          sl:         r2(openPos.sl),
          tp:         r2(openPos.tp),
          pnl:        r2(pnl),
          closedBy,
        });

        equityCurve.push({ time: Math.floor(candle.timestamp / 1000), value: r2(balance) });
        openPos = null;
      }
    }

    // 2. Look for new signal when flat
    if (!openPos) {
      const window      = candles.slice(Math.max(0, i - MAX_WINDOW + 1), i + 1);
      const accountState: AccountState = {
        balance,
        equity:         balance,
        openPositions:  0,
        dailyPnl,
        peakEquity:     peakBalance,
      };

      try {
        const result = await engine.runAsset(
          { symbol: String(symbol), candles: window },
          accountState,
        );

        if (
          result.signal.direction !== 'WAIT' &&
          result.signal.confirmed &&
          result.sizing.allowed
        ) {
          const entry = candle.close;
          const { stopLossPips, takeProfitPips, riskAmount, rr } = result.sizing;

          const sl = result.signal.direction === 'BUY'
            ? entry - stopLossPips
            : entry + stopLossPips;
          const tp = result.signal.direction === 'BUY'
            ? entry + takeProfitPips
            : entry - takeProfitPips;

          openPos = {
            direction:  result.signal.direction,
            openTime:   candle.timestamp,
            openPrice:  entry,
            sl,
            tp,
            riskAmount,
            rr,
          };
        }
      } catch {
        // skip this candle if engine throws
      }
    }
  }

  // Close any remaining position at last candle close
  if (openPos) {
    const last   = candles[candles.length - 1];
    const entry  = openPos.openPrice;
    const exit   = last.close;
    // Pro-rata estimate: price move relative to SL distance
    const slDist = Math.abs(entry - openPos.sl);
    const rawMove = openPos.direction === 'BUY' ? exit - entry : entry - exit;
    const pnl = slDist > 0 ? (rawMove / slDist) * openPos.riskAmount : 0;

    balance += pnl;
    trades.push({
      openTime:   openPos.openTime,
      closeTime:  last.timestamp,
      direction:  openPos.direction,
      openPrice:  r2(entry),
      closePrice: r2(exit),
      sl:         r2(openPos.sl),
      tp:         r2(openPos.tp),
      pnl:        r2(pnl),
      closedBy:   'END',
    });
    equityCurve.push({ time: Math.floor(last.timestamp / 1000), value: r2(balance) });
  }

  // ── Statistics ──────────────────────────────────────────────────────────────
  const wins     = trades.filter(t => t.pnl > 0);
  const losses   = trades.filter(t => t.pnl <= 0);
  const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  const winRate      = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : wins.length > 0 ? 99 : 0;
  const netPnl       = balance - balance0;
  const netPnlPct    = (netPnl / balance0) * 100;
  const avgWin       = wins.length   > 0 ? grossWin  / wins.length   : 0;
  const avgLoss      = losses.length > 0 ? grossLoss / losses.length : 0;

  // Simplified Sharpe — per-trade returns annualized
  const returns   = trades.map(t => t.pnl / balance0 * 100);
  const meanR     = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance  = returns.length > 1
    ? returns.reduce((s, r) => s + (r - meanR) ** 2, 0) / (returns.length - 1)
    : 0;
  const sharpe = variance > 0 ? (meanR / Math.sqrt(variance)) * Math.sqrt(252) : 0;

  return res.json({
    symbol:         String(symbol).toUpperCase(),
    interval:       safeInterval,
    candleCount:    candles.length,
    initialBalance: balance0,
    finalBalance:   r2(balance),
    netPnl:         r2(netPnl),
    netPnlPct:      r2(netPnlPct),
    totalTrades:    trades.length,
    wins:           wins.length,
    losses:         losses.length,
    winRate:        r2(winRate),
    profitFactor:   r2(profitFactor),
    maxDrawdown:    r2(maxDD),
    sharpeRatio:    r2(sharpe),
    avgWin:         r2(avgWin),
    avgLoss:        r2(avgLoss),
    equityCurve,
    trades,
  });
}
