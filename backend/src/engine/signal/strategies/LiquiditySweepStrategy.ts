import type { OHLCV, MarketRegime } from '../../types/market.types';
import type { SignalResult } from '../../types/signal.types';
import { BaseStrategy } from '../BaseStrategy';
import { swingHighs, swingLows, atr, last, clamp } from '../../utils/indicators';

/**
 * Liquidity Sweep (Smart Money Concept):
 * Price hunts stops above swing highs / below swing lows,
 * then sharply reverses. We enter on the reversal candle.
 */
export class LiquiditySweepStrategy extends BaseStrategy {
  readonly name = 'LiquiditySweep';
  readonly weight = 3;

  async generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult> {
    if (candles.length < 60) return this.wait('Insufficient data');

    const lookback = 5;
    const atrValues = atr(candles, 14);
    const currentAtr = last(atrValues);

    // Find the most recent valid swing high and low in the last 50 candles
    const window = candles.slice(-50);
    const highs  = swingHighs(window, lookback);
    const lows   = swingLows(window, lookback);

    // Collect valid swing levels (non-NaN)
    const swingHighLevels = highs.filter(v => !isNaN(v));
    const swingLowLevels  = lows.filter(v => !isNaN(v));

    if (!swingHighLevels.length || !swingLowLevels.length) {
      return this.wait('No swing levels found');
    }

    const lastSwingHigh = Math.max(...swingHighLevels);
    const lastSwingLow  = Math.min(...swingLowLevels);

    // Get the last 3 candles to detect sweep + rejection
    const recent = candles.slice(-3);
    const [prev2, prev1, current] = recent;

    if (!prev2 || !prev1 || !current) return this.wait('Insufficient recent candles');

    // Bearish Liquidity Sweep: wicked above swing high then closed below it
    const sweptHigh = prev1.high > lastSwingHigh && prev1.close < lastSwingHigh;
    const bearishEngulf = current.close < prev1.open && current.close < prev1.low;
    const sweepSize = sweptHigh ? (prev1.high - lastSwingHigh) / currentAtr : 0;

    if (sweptHigh && bearishEngulf && sweepSize > 0.3) {
      const conf = clamp(60 + sweepSize * 20, 60, 90);
      return this.signal(
        'SELL',
        conf,
        `Liquidity sweep above ${lastSwingHigh.toFixed(5)}, bearish reversal confirmed`,
        { lastSwingHigh, sweepSize },
      );
    }

    // Bullish Liquidity Sweep: wicked below swing low then closed above it
    const sweptLow   = prev1.low < lastSwingLow && prev1.close > lastSwingLow;
    const bullishEngulf = current.close > prev1.open && current.close > prev1.high;
    const sweepSizeLow = sweptLow ? (lastSwingLow - prev1.low) / currentAtr : 0;

    if (sweptLow && bullishEngulf && sweepSizeLow > 0.3) {
      const conf = clamp(60 + sweepSizeLow * 20, 60, 90);
      return this.signal(
        'BUY',
        conf,
        `Liquidity sweep below ${lastSwingLow.toFixed(5)}, bullish reversal confirmed`,
        { lastSwingLow, sweepSize: sweepSizeLow },
      );
    }

    return this.wait('No liquidity sweep pattern detected');
  }
}
