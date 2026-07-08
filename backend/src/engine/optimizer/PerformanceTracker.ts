import type { StrategyPerformance } from '../types/engine.types';

export interface TradeRecord {
  strategyName: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  volume: number;
  pnl: number;             // dollar PnL
  openedAt: number;
  closedAt: number;
}

export class PerformanceTracker {
  private trades: TradeRecord[] = [];

  record(trade: TradeRecord): void {
    this.trades.push(trade);
  }

  getAll(): TradeRecord[] {
    return [...this.trades];
  }

  summarize(strategyName?: string): StrategyPerformance[] {
    const target = strategyName
      ? [strategyName]
      : [...new Set(this.trades.map(t => t.strategyName))];

    return target.map(name => {
      const stratTrades = this.trades.filter(t => t.strategyName === name);
      return this.compute(name, stratTrades);
    });
  }

  private compute(strategyName: string, trades: TradeRecord[]): StrategyPerformance {
    if (!trades.length) {
      return {
        strategyName, trades: 0, wins: 0, losses: 0, winRate: 0,
        profitFactor: 0, avgWin: 0, avgLoss: 0, maxDrawdown: 0,
        sharpeRatio: 0, lastUpdated: Date.now(),
      };
    }

    const wins   = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);

    const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss   = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

    const avgWin  = wins.length   ? grossProfit / wins.length   : 0;
    const avgLoss = losses.length ? grossLoss   / losses.length : 0;

    // Max drawdown on equity curve
    let peak = 0, equity = 0, maxDD = 0;
    for (const t of trades) {
      equity += t.pnl;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    // Sharpe (simplified, daily returns)
    const pnls = trades.map(t => t.pnl);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((a, p) => a + (p - mean) ** 2, 0) / pnls.length;
    const stddev = Math.sqrt(variance);
    const sharpeRatio = stddev > 0 ? (mean / stddev) * Math.sqrt(252) : 0;

    return {
      strategyName,
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round((wins.length / trades.length) * 10000) / 100,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0,
      avgWin:  Math.round(avgWin  * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      maxDrawdown: Math.round(maxDD * 100) / 100,
      sharpeRatio:  Math.round(sharpeRatio * 100) / 100,
      lastUpdated: Date.now(),
    };
  }
}
