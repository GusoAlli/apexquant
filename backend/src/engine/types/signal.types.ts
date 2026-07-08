import type { MarketRegime, OHLCV } from './market.types';

export type Direction = 'BUY' | 'SELL' | 'WAIT';

export interface SignalResult {
  direction: Direction;
  confidence: number;   // 0-100
  strategy: string;
  reason: string;
  meta?: Record<string, number>;
}

export interface AggregatedSignal {
  direction: Direction;
  confidence: number;
  votes: SignalResult[];
  regime: MarketRegime;
}

export interface ConfirmationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export interface FinalSignal extends AggregatedSignal {
  confirmed: boolean;
  confirmationDetail: ConfirmationResult;
}

export interface IStrategy {
  readonly name: string;
  readonly weight: number;  // relative weight in aggregation (1-10)
  generate(candles: OHLCV[], regime: MarketRegime): Promise<SignalResult>;
}
