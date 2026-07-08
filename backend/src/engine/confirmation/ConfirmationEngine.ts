import type { OHLCV } from '../types/market.types';
import type { AggregatedSignal, ConfirmationResult } from '../types/signal.types';
import { volumeRatio, rsi, ema, atr, last, closes } from '../utils/indicators';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export class ConfirmationEngine {
  // How many checks must pass (default: all)
  private readonly threshold: number;

  constructor(threshold?: number) {
    this.threshold = threshold ?? 4; // all 4 checks by default
  }

  confirm(signal: AggregatedSignal, candles: OHLCV[], higherTfCandles?: OHLCV[]): ConfirmationResult {
    if (signal.direction === 'WAIT') {
      return { passed: false, checks: [{ name: 'Signal', passed: false, detail: 'No directional signal' }] };
    }

    const checks: CheckResult[] = [
      this.checkVolume(signal, candles),
      this.checkHigherTfTrend(signal, higherTfCandles ?? candles),
      this.checkATR(candles),
      this.checkMomentum(signal, candles),
    ];

    const passed = checks.filter(c => c.passed).length >= this.threshold;
    return { passed, checks };
  }

  // ── Volume check: current volume must be above average ──────────────────────

  private checkVolume(signal: AggregatedSignal, candles: OHLCV[]): CheckResult {
    const ratio = volumeRatio(candles, 20);
    if (!ratio.length) return { name: 'Volume', passed: false, detail: 'Insufficient data' };

    const currentRatio = last(ratio);
    const passed = currentRatio >= 1.2;
    return {
      name: 'Volume',
      passed,
      detail: `Volume ${currentRatio.toFixed(2)}x avg (need ≥1.2x)`,
    };
  }

  // ── Higher TF trend alignment ────────────────────────────────────────────────

  private checkHigherTfTrend(signal: AggregatedSignal, candles: OHLCV[]): CheckResult {
    if (candles.length < 50) return { name: 'HigherTfTrend', passed: true, detail: 'Skipped — no HTF data' };

    const cl   = closes(candles);
    const e50  = ema(cl, 50);
    const e200 = ema(cl, Math.min(200, candles.length - 1));
    const price = last(cl);

    if (!e50.length || !e200.length) return { name: 'HigherTfTrend', passed: true, detail: 'Skipped' };

    const above200 = price > last(e200);
    const above50  = price > last(e50);

    if (signal.direction === 'BUY') {
      const passed = above50 && above200;
      return { name: 'HigherTfTrend', passed, detail: `Price ${above200 ? 'above' : 'below'} EMA200, ${above50 ? 'above' : 'below'} EMA50` };
    } else {
      const passed = !above50 && !above200;
      return { name: 'HigherTfTrend', passed, detail: `Price ${above200 ? 'above' : 'below'} EMA200, ${above50 ? 'above' : 'below'} EMA50` };
    }
  }

  // ── ATR check: market must have enough volatility to trade ──────────────────

  private checkATR(candles: OHLCV[]): CheckResult {
    const atrValues = atr(candles, 14);
    if (atrValues.length < 20) return { name: 'ATR', passed: true, detail: 'Skipped — insufficient data' };

    const current = last(atrValues);
    const avg = atrValues.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ratio = current / avg;

    // ATR must be between 50% and 200% of average (not dead market, not extreme spike)
    const passed = ratio >= 0.5 && ratio <= 2.0;
    return {
      name: 'ATR',
      passed,
      detail: `ATR ratio ${ratio.toFixed(2)} (need 0.5–2.0)`,
    };
  }

  // ── Momentum: RSI must support the direction ─────────────────────────────────

  private checkMomentum(signal: AggregatedSignal, candles: OHLCV[]): CheckResult {
    const cl = closes(candles);
    const rsiValues = rsi(cl, 14);
    if (!rsiValues.length) return { name: 'Momentum', passed: true, detail: 'Skipped' };

    const rsiNow = last(rsiValues);

    if (signal.direction === 'BUY') {
      // RSI should not be extremely overbought when entering long
      const passed = rsiNow < 75;
      return { name: 'Momentum', passed, detail: `RSI ${rsiNow.toFixed(1)} (need < 75 for BUY)` };
    } else {
      // RSI should not be extremely oversold when entering short
      const passed = rsiNow > 25;
      return { name: 'Momentum', passed, detail: `RSI ${rsiNow.toFixed(1)} (need > 25 for SELL)` };
    }
  }
}
