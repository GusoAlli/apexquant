import type { OHLCV, MarketRegime } from '../types/market.types';
import type { IStrategy, SignalResult, AggregatedSignal, Direction } from '../types/signal.types';
import { TrendFollowingStrategy } from './strategies/TrendFollowingStrategy';
import { MeanReversionStrategy }  from './strategies/MeanReversionStrategy';
import { BreakoutStrategy }        from './strategies/BreakoutStrategy';
import { LiquiditySweepStrategy }  from './strategies/LiquiditySweepStrategy';
import { FundingStrategy }         from './strategies/FundingStrategy';

export class SignalEngine {
  private strategies: IStrategy[];

  constructor(strategies?: IStrategy[]) {
    this.strategies = strategies ?? [
      new TrendFollowingStrategy(),
      new MeanReversionStrategy(),
      new BreakoutStrategy(),
      new LiquiditySweepStrategy(),
      new FundingStrategy(),
    ];
  }

  addStrategy(strategy: IStrategy): void {
    this.strategies.push(strategy);
  }

  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  async run(candles: OHLCV[], regime: MarketRegime, fundingRate?: number): Promise<AggregatedSignal> {
    const results = await Promise.all(
      this.strategies.map(s =>
        // FundingStrategy accepts optional 3rd arg
        (s as any).generate(candles, regime, fundingRate).catch((err: Error): SignalResult => ({
          direction: 'WAIT',
          confidence: 0,
          strategy: s.name,
          reason: `Error: ${err.message}`,
        }))
      )
    );

    return this.aggregate(results, regime);
  }

  private aggregate(results: SignalResult[], regime: MarketRegime): AggregatedSignal {
    const strategyMap = new Map<string, IStrategy>(this.strategies.map(s => [s.name, s]));

    let buyScore  = 0;
    let sellScore = 0;
    let totalWeight = 0;

    for (const r of results) {
      if (r.direction === 'WAIT') continue;
      const weight = strategyMap.get(r.strategy)?.weight ?? 1;
      const score  = (r.confidence / 100) * weight;
      if (r.direction === 'BUY')  buyScore  += score;
      if (r.direction === 'SELL') sellScore += score;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { direction: 'WAIT', confidence: 0, votes: results, regime };
    }

    const diff = Math.abs(buyScore - sellScore);
    const total = buyScore + sellScore;

    // Require a clear majority (diff > 30% of total) to commit
    if (total === 0 || diff / total < 0.3) {
      return { direction: 'WAIT', confidence: 0, votes: results, regime };
    }

    const direction: Direction = buyScore > sellScore ? 'BUY' : 'SELL';
    const rawScore = direction === 'BUY' ? buyScore : sellScore;
    const confidence = Math.round(Math.min((rawScore / (totalWeight * 1)) * 100, 100));

    return { direction, confidence, votes: results, regime };
  }
}
