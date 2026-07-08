import type { OHLCV, MarketRegime } from '../../types/market.types';
import type { SignalResult } from '../../types/signal.types';
import { BaseStrategy } from '../BaseStrategy';
import { bollingerBands, rsi, last, closes, clamp } from '../../utils/indicators';

export class MeanReversionStrategy extends BaseStrategy {
  readonly name = 'MeanReversion';
  readonly weight = 2;

  async generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult> {
    if (candles.length < 50) return this.wait('Insufficient data');

    // Mean reversion works best in sideways / low-volatility markets
    if (regime === 'TRENDING_UP' || regime === 'TRENDING_DOWN') {
      return this.wait('Trending market — regime mismatch for mean reversion');
    }

    const cl = closes(candles);
    const bb = bollingerBands(cl, 20, 2);
    const rsiValues = rsi(cl, 14);

    const price  = last(cl);
    const upper  = last(bb.upper);
    const lower  = last(bb.lower);
    const middle = last(bb.middle);
    const bw     = last(bb.bandwidth);
    const rsiNow = last(rsiValues);

    // Avoid very narrow bands (about to break out)
    if (bw < 0.02) return this.wait('Bollinger bands too narrow — breakout risk');

    const touchLower = price <= lower * 1.001;
    const touchUpper = price >= upper * 0.999;
    const oversold   = rsiNow < 35;
    const overbought = rsiNow > 65;

    if (touchLower && oversold) {
      const strength = (lower - price) / lower + (35 - rsiNow) / 35;
      const conf = clamp(50 + strength * 40, 50, 90);
      return this.signal('BUY', conf, `Price below BB lower, RSI ${rsiNow.toFixed(1)}`, { rsiNow, bw });
    }

    if (touchUpper && overbought) {
      const strength = (price - upper) / upper + (rsiNow - 65) / 35;
      const conf = clamp(50 + strength * 40, 50, 90);
      return this.signal('SELL', conf, `Price above BB upper, RSI ${rsiNow.toFixed(1)}`, { rsiNow, bw });
    }

    return this.wait(`Price inside bands. RSI: ${rsiNow.toFixed(1)}`);
  }
}
