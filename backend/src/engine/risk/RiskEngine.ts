import type { AccountState, RiskConfig, PositionSizing, RiskGuardrails } from '../types/risk.types';
import type { FinalSignal } from '../types/signal.types';
import type { OHLCV } from '../types/market.types';
import { atr, last, clamp } from '../utils/indicators';

export class RiskEngine {
  constructor(private config: RiskConfig) {}

  updateConfig(patch: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  guardrails(account: AccountState): RiskGuardrails {
    const currentDrawdown = ((account.peakEquity - account.equity) / account.peakEquity) * 100;
    const dailyLossUsed   = (Math.abs(Math.min(account.dailyPnl, 0)) / account.balance) * 100;

    return {
      dailyLossBreached:    dailyLossUsed    >= this.config.maxDailyLoss,
      maxDrawdownBreached:  currentDrawdown  >= this.config.maxDrawdown,
      maxPositionsBreached: account.openPositions >= this.config.maxOpenPositions,
      currentDrawdown,
      dailyLossUsed,
    };
  }

  size(signal: FinalSignal, account: AccountState, candles: OHLCV[]): PositionSizing {
    const guards = this.guardrails(account);

    if (guards.dailyLossBreached) {
      return this.blocked(`Daily loss limit reached (${guards.dailyLossUsed.toFixed(2)}%)`);
    }
    if (guards.maxDrawdownBreached) {
      return this.blocked(`Max drawdown breached (${guards.currentDrawdown.toFixed(2)}%)`);
    }
    if (guards.maxPositionsBreached) {
      return this.blocked(`Max open positions reached (${account.openPositions})`);
    }
    if (!signal.confirmed) {
      return this.blocked('Signal not confirmed');
    }

    const atrValues  = atr(candles, 14);
    const currentAtr = last(atrValues);
    if (!currentAtr || currentAtr === 0) return this.blocked('ATR not available');

    // ATR-based stop loss: 1.5x ATR
    const stopLossPips    = currentAtr * 1.5;
    // Minimum RR applied to compute TP
    const takeProfitPips  = stopLossPips * Math.max(this.config.minRR, 1.5);
    const rr              = takeProfitPips / stopLossPips;

    if (rr < this.config.minRR) {
      return this.blocked(`R:R ${rr.toFixed(2)} below minimum ${this.config.minRR}`);
    }

    // Dynamic risk scaling: reduce size if drawdown is climbing
    const drawdownPenalty = clamp(1 - guards.currentDrawdown / this.config.maxDrawdown * 0.5, 0.5, 1);
    // Confidence scaling: higher confidence → more size (max +20%)
    const confidenceBoost = 1 + (signal.confidence - 60) / 200;  // 60% confidence → 1x, 100% → 1.2x

    const effectiveRisk = (this.config.riskPerTrade / 100) * drawdownPenalty * clamp(confidenceBoost, 0.8, 1.2);
    const riskAmount    = account.balance * effectiveRisk;

    // Lot size = risk amount / (stop loss in price * pip value)
    // Here pip value is 1 (caller must normalize for the asset)
    const lotSize = riskAmount / (stopLossPips || 1);

    return {
      allowed: true,
      lotSize: Math.round(lotSize * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      stopLossPips: Math.round(stopLossPips * 100000) / 100000,
      takeProfitPips: Math.round(takeProfitPips * 100000) / 100000,
      rr: Math.round(rr * 100) / 100,
    };
  }

  private blocked(reason: string): PositionSizing {
    return { allowed: false, lotSize: 0, riskAmount: 0, stopLossPips: 0, takeProfitPips: 0, rr: 0, reason };
  }
}
