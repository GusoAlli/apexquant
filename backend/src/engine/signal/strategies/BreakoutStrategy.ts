import type { OHLCV, MarketRegime } from '../../types/market.types';
import type { SignalResult } from '../../types/signal.types';
import { BaseStrategy } from '../BaseStrategy';
import { atr, volumeRatio, last, clamp } from '../../utils/indicators';

export class BreakoutStrategy extends BaseStrategy {
  readonly name = 'Breakout';
  readonly weight = 2;

  private readonly lookback: number;

  constructor(lookback = 20) {
    super();
    this.lookback = lookback;
  }

  async generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult> {
    if (candles.length < this.lookback + 20) return this.wait('Insufficient data');

    // Breakouts are most reliable coming out of SIDEWAYS or LOW_VOLATILITY
    if (regime === 'HIGH_VOLATILITY') return this.wait('Already high volatility — breakout risk');

    const recent = candles.slice(-this.lookback - 1);
    const consolidated = recent.slice(0, this.lookback);
    const current = last(candles);

    const rangeHigh = Math.max(...consolidated.map(c => c.high));
    const rangeLow  = Math.min(...consolidated.map(c => c.low));
    const rangeSize = rangeHigh - rangeLow;

    const atrValues = atr(candles, 14);
    const volRatio  = volumeRatio(candles, 20);
    const currentAtr = last(atrValues);
    const currentVolRatio = last(volRatio);

    // Breakout confirmation: price must close clearly beyond range (0.2 ATR buffer)
    const buffer = currentAtr * 0.2;

    const bullBreak = current.close > rangeHigh + buffer;
    const bearBreak = current.close < rangeLow  - buffer;

    // Volume must be elevated on breakout (1.3x average)
    const volumeConfirmed = currentVolRatio >= 1.3;

    if (bullBreak && volumeConfirmed) {
      const penetration = (current.close - rangeHigh) / (currentAtr || 1);
      const conf = clamp(55 + penetration * 15 + (currentVolRatio - 1.3) * 10, 55, 92);
      return this.signal('BUY', conf, `Bullish breakout above ${rangeHigh.toFixed(5)}, vol ${currentVolRatio.toFixed(2)}x`, {
        rangeHigh, rangeLow, rangeSize, currentVolRatio,
      });
    }

    if (bearBreak && volumeConfirmed) {
      const penetration = (rangeLow - current.close) / (currentAtr || 1);
      const conf = clamp(55 + penetration * 15 + (currentVolRatio - 1.3) * 10, 55, 92);
      return this.signal('SELL', conf, `Bearish breakout below ${rangeLow.toFixed(5)}, vol ${currentVolRatio.toFixed(2)}x`, {
        rangeHigh, rangeLow, rangeSize, currentVolRatio,
      });
    }

    if ((bullBreak || bearBreak) && !volumeConfirmed) {
      return this.wait(`Price broke range but volume not confirmed (${currentVolRatio.toFixed(2)}x)`);
    }

    return this.wait(`Price inside range [${rangeLow.toFixed(5)} – ${rangeHigh.toFixed(5)}]`);
  }
}
