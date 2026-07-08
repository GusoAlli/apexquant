import type { OHLCV, MarketRegime } from '../types/market.types';
import type { IStrategy, SignalResult } from '../types/signal.types';

export abstract class BaseStrategy implements IStrategy {
  abstract readonly name: string;
  abstract readonly weight: number;

  abstract generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult>;

  protected wait(reason: string): SignalResult {
    return { direction: 'WAIT', confidence: 0, strategy: this.name, reason };
  }

  protected signal(
    direction: 'BUY' | 'SELL',
    confidence: number,
    reason: string,
    meta?: Record<string, number>,
  ): SignalResult {
    return { direction, confidence, strategy: this.name, reason, meta };
  }
}
