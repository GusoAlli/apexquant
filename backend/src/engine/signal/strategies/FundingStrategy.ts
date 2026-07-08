import type { OHLCV, MarketRegime } from '../../types/market.types';
import type { SignalResult } from '../../types/signal.types';
import { BaseStrategy } from '../BaseStrategy';
import { rsi, last, closes, clamp } from '../../utils/indicators';

/**
 * Funding Rate Strategy (crypto perpetuals):
 * Extreme positive funding → market is overleveraged long → fade with SHORT.
 * Extreme negative funding → market is overleveraged short → fade with LONG.
 * Combined with price momentum to avoid fighting the trend.
 */
export class FundingStrategy extends BaseStrategy {
  readonly name = 'FundingStrategy';
  readonly weight = 2;

  // Thresholds in % per 8h
  private readonly highFunding = 0.05;  // 0.05% = extreme long crowding
  private readonly lowFunding  = -0.03; // -0.03% = extreme short crowding

  async generate(candles: OHLCV[], regime: MarketRegime, fundingRate?: number): Promise<SignalResult> {
    if (fundingRate === undefined || fundingRate === null) {
      return this.wait('No funding rate data available');
    }

    if (candles.length < 20) return this.wait('Insufficient data');

    const cl = closes(candles);
    const rsiValues = rsi(cl, 14);
    const rsiNow = last(rsiValues);

    // Extreme positive funding + price overbought → short
    if (fundingRate >= this.highFunding) {
      if (rsiNow > 60) {
        const fundingScore = Math.min((fundingRate - this.highFunding) / 0.05 * 30, 30);
        const rsiScore     = Math.min((rsiNow - 60) / 40 * 20, 20);
        const conf = clamp(50 + fundingScore + rsiScore, 50, 85);
        return this.signal(
          'SELL',
          conf,
          `Extreme positive funding ${(fundingRate * 100).toFixed(4)}%, RSI ${rsiNow.toFixed(1)}`,
          { fundingRate, rsiNow },
        );
      }
      return this.wait(`High funding ${(fundingRate * 100).toFixed(4)}% but RSI not overbought`);
    }

    // Extreme negative funding + price oversold → long
    if (fundingRate <= this.lowFunding) {
      if (rsiNow < 40) {
        const fundingScore = Math.min(Math.abs(fundingRate - this.lowFunding) / 0.03 * 30, 30);
        const rsiScore     = Math.min((40 - rsiNow) / 40 * 20, 20);
        const conf = clamp(50 + fundingScore + rsiScore, 50, 85);
        return this.signal(
          'BUY',
          conf,
          `Extreme negative funding ${(fundingRate * 100).toFixed(4)}%, RSI ${rsiNow.toFixed(1)}`,
          { fundingRate, rsiNow },
        );
      }
      return this.wait(`Negative funding ${(fundingRate * 100).toFixed(4)}% but RSI not oversold`);
    }

    return this.wait(`Funding rate neutral: ${(fundingRate * 100).toFixed(4)}%`);
  }
}
