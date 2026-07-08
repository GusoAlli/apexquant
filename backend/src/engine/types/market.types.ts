export interface OHLCV {
  timestamp: number; // Unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketRegime =
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'SIDEWAYS'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY'
  | 'BULL_MARKET'
  | 'BEAR_MARKET';

export interface RegimeResult {
  regime: MarketRegime;
  adx: number;
  atrRatio: number;     // current ATR / avg ATR
  confidence: number;   // 0-100
}
