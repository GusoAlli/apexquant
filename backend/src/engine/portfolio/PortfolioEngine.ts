import type { AssetData } from '../types/engine.types';
import { adx, rsi, atr, ema, last, closes, clamp } from '../utils/indicators';

export interface AssetScore {
  symbol: string;
  score: number;        // 0-100
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  liquidityScore: number;
}

export class PortfolioEngine {
  private readonly topN: number;

  constructor(topN = 3) {
    this.topN = topN;
  }

  rank(assets: AssetData[]): AssetScore[] {
    const scores = assets
      .map(a => this.scoreAsset(a))
      .filter((s): s is AssetScore => s !== null)
      .sort((a, b) => b.score - a.score);

    return scores;
  }

  selectTop(assets: AssetData[]): AssetData[] {
    const ranked = this.rank(assets);
    const topSymbols = new Set(ranked.slice(0, this.topN).map(s => s.symbol));
    return assets.filter(a => topSymbols.has(a.symbol));
  }

  private scoreAsset(asset: AssetData): AssetScore | null {
    const { candles } = asset;
    if (candles.length < 50) return null;

    const cl = closes(candles);

    // ── Trend score: ADX strength ────────────────────────────────────────────
    const adxData    = adx(candles, 14);
    const adxValue   = adxData.adx.length ? last(adxData.adx) : 0;
    const trendScore = clamp((adxValue - 10) * 2, 0, 100);

    // ── Momentum score: RSI proximity to strong momentum zone ───────────────
    const rsiValues = rsi(cl, 14);
    const rsiNow    = rsiValues.length ? last(rsiValues) : 50;
    // Score peaks at RSI 60–70 (bull) and 30–40 (bear); lowest at 50 (neutral)
    const momentumScore = clamp(Math.abs(rsiNow - 50) * 2, 0, 100);

    // ── Volatility score: moderate ATR ratio is best (too low = dead, too high = risky) ──
    const atrValues  = atr(candles, 14);
    const currentAtr = atrValues.length ? last(atrValues) : 0;
    const avgAtr     = atrValues.length >= 20
      ? atrValues.slice(-20).reduce((a, b) => a + b, 0) / 20
      : currentAtr;
    const atrRatio        = avgAtr ? currentAtr / avgAtr : 1;
    // Optimal atrRatio ≈ 1.0; penalise extremes
    const volatilityScore = clamp(100 - Math.abs(atrRatio - 1.0) * 60, 20, 100);

    // ── Liquidity score: based on average volume trend ───────────────────────
    const volumes    = candles.map(c => c.volume);
    const ema10vol   = ema(volumes, 10);
    const ema30vol   = ema(volumes, 30);
    const volTrend   = (ema10vol.length && ema30vol.length)
      ? last(ema10vol) / (last(ema30vol) || 1)
      : 1;
    const liquidityScore = clamp((volTrend - 0.5) * 100, 0, 100);

    const score = Math.round(
      trendScore     * 0.35 +
      momentumScore  * 0.25 +
      volatilityScore * 0.25 +
      liquidityScore * 0.15,
    );

    return {
      symbol: asset.symbol,
      score,
      trendScore:      Math.round(trendScore),
      momentumScore:   Math.round(momentumScore),
      volatilityScore: Math.round(volatilityScore),
      liquidityScore:  Math.round(liquidityScore),
    };
  }
}
