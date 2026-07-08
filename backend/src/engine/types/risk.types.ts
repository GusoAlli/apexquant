export interface AccountState {
  balance: number;
  equity: number;
  openPositions: number;
  dailyPnl: number;       // today's realized PnL
  peakEquity: number;     // highest equity seen
}

export interface RiskConfig {
  riskPerTrade: number;       // % of balance per trade (e.g. 1.0 = 1%)
  maxDailyLoss: number;       // % daily drawdown limit (e.g. 3.0 = 3%)
  maxDrawdown: number;        // % max drawdown before stop trading (e.g. 10)
  maxOpenPositions: number;
  minRR: number;              // minimum reward-to-risk ratio
}

export interface PositionSizing {
  allowed: boolean;           // false if risk limits breached
  lotSize: number;
  riskAmount: number;         // dollar risk
  stopLossPips: number;
  takeProfitPips: number;
  rr: number;                 // actual reward-to-risk ratio
  reason?: string;            // if not allowed
}

export interface RiskGuardrails {
  dailyLossBreached: boolean;
  maxDrawdownBreached: boolean;
  maxPositionsBreached: boolean;
  currentDrawdown: number;    // %
  dailyLossUsed: number;      // %
}
