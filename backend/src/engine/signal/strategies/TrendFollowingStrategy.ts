import type { OHLCV, MarketRegime } from '../../types/market.types';
import type { SignalResult } from '../../types/signal.types';
import { BaseStrategy } from '../BaseStrategy';
import { ema, adx, last, closes, clamp } from '../../utils/indicators';

export class TrendFollowingStrategy extends BaseStrategy {
  readonly name = 'TrendFollowing';
  readonly weight = 3;

  async generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult> {
    if (candles.length < 210) return this.wait('Insufficient data');

    // Avoid trading against high-volatility spikes
    if (regime === 'HIGH_VOLATILITY') return this.wait('High volatility — regime mismatch');

    const cl    = closes(candles);
    const ema20 = ema(cl, 20);
    const ema50 = ema(cl, 50);
    const ema200 = ema(cl, 200);
    const adxData = adx(candles, 14);

    const e20  = last(ema20);
    const e50  = last(ema50);
    const e200 = last(ema200);
    const adxV = last(adxData.adx);
    const pdi  = last(adxData.plusDI);
    const mdi  = last(adxData.minusDI);
    const price = last(cl);

    if (adxV < 20) return this.wait(`ADX too weak: ${adxV.toFixed(1)}`);

    const bullAlignment = price > e20 && e20 > e50 && e50 > e200;
    const bearAlignment = price < e20 && e20 < e50 && e50 < e200;

    if (bullAlignment && pdi > mdi) {
      const conf = clamp((adxV - 20) * 2.5 + 50 + (pdi - mdi) * 0.5, 50, 95);
      return this.signal('BUY', conf, `EMA stack bullish, ADX ${adxV.toFixed(1)}, +DI ${pdi.toFixed(1)}`, { adxV, pdi, mdi });
    }

    if (bearAlignment && mdi > pdi) {
      const conf = clamp((adxV - 20) * 2.5 + 50 + (mdi - pdi) * 0.5, 50, 95);
      return this.signal('SELL', conf, `EMA stack bearish, ADX ${adxV.toFixed(1)}, -DI ${mdi.toFixed(1)}`, { adxV, pdi, mdi });
    }

    return this.wait('EMA stack not aligned');
  }
}
