import type { OHLCV, MarketRegime, RegimeResult } from '../types/market.types';
import { adx, atr, ema, last, closes, clamp } from '../utils/indicators';

export class RegimeEngine {
  private readonly adxPeriod: number;
  private readonly atrPeriod: number;
  private readonly emaPeriod: number;

  constructor(config: { adxPeriod?: number; atrPeriod?: number; emaPeriod?: number } = {}) {
    this.adxPeriod = config.adxPeriod ?? 14;
    this.atrPeriod = config.atrPeriod ?? 14;
    this.emaPeriod = config.emaPeriod ?? 50;
  }

  detect(candles: OHLCV[]): RegimeResult {
    if (candles.length < 100) {
      return { regime: 'SIDEWAYS', adx: 0, atrRatio: 1, confidence: 0 };
    }

    const closePrices = closes(candles);
    const adxResult   = adx(candles, this.adxPeriod);
    const atrValues   = atr(candles, this.atrPeriod);
    const ema50       = ema(closePrices, this.emaPeriod);
    const ema200      = ema(closePrices, 200);

    const currentAdx    = last(adxResult.adx);
    const currentPlusDI = last(adxResult.plusDI);
    const currentMinusDI = last(adxResult.minusDI);
    const currentAtr    = last(atrValues);
    const avgAtr        = atrValues.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const atrRatio      = currentAtr / (avgAtr || 1);
    const currentClose  = last(closePrices);
    const currentEma50  = last(ema50);
    const currentEma200 = ema200.length > 0 ? last(ema200) : null;

    const regime  = this.classifyRegime(currentAdx, currentPlusDI, currentMinusDI, atrRatio, currentClose, currentEma50, currentEma200);
    const confidence = this.computeConfidence(currentAdx, atrRatio, regime);

    return { regime, adx: currentAdx, atrRatio, confidence };
  }

  private classifyRegime(
    adxValue: number,
    plusDI: number,
    minusDI: number,
    atrRatio: number,
    close: number,
    ema50: number,
    ema200: number | null,
  ): MarketRegime {
    // High / Low volatility overrides trend classification
    if (atrRatio > 2.0) return 'HIGH_VOLATILITY';
    if (atrRatio < 0.5) return 'LOW_VOLATILITY';

    // Strong trend
    if (adxValue >= 25) {
      if (plusDI > minusDI) return 'TRENDING_UP';
      return 'TRENDING_DOWN';
    }

    // Weak ADX — check price vs EMA200 for bull/bear bias
    if (ema200 !== null) {
      if (close > ema200 * 1.02) return 'BULL_MARKET';
      if (close < ema200 * 0.98) return 'BEAR_MARKET';
    }

    return 'SIDEWAYS';
  }

  private computeConfidence(adxValue: number, atrRatio: number, regime: MarketRegime): number {
    if (regime === 'HIGH_VOLATILITY') return clamp((atrRatio - 2.0) * 50, 50, 100);
    if (regime === 'LOW_VOLATILITY')  return clamp((0.5 - atrRatio) * 100, 50, 100);
    if (regime === 'TRENDING_UP' || regime === 'TRENDING_DOWN') {
      return clamp((adxValue - 25) * 2.5 + 50, 50, 100);
    }
    return clamp(100 - adxValue * 2, 40, 80);
  }
}
