import type { OHLCV } from './market.types';
import type { FinalSignal } from './signal.types';
import type { PositionSizing, AccountState } from './risk.types';

export interface AssetData {
  symbol: string;
  candles: OHLCV[];
  higherTfCandles?: OHLCV[];    // for multi-timeframe confirmation
  fundingRate?: number;          // for perpetual futures
}

export interface EngineConfig {
  symbols: string[];
  riskConfig: import('./risk.types').RiskConfig;
  strategyWeights?: Record<string, number>;
  confirmationThreshold?: number;   // min checks that must pass (default: all)
  topNAssets?: number;              // portfolio: trade top N ranked assets
}

export interface EngineRunResult {
  symbol: string;
  signal: FinalSignal;
  sizing: PositionSizing;
  account: AccountState;
  timestamp: number;
}

export interface StrategyPerformance {
  strategyName: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastUpdated: number;
}
