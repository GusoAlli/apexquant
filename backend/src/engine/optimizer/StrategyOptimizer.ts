import type { StrategyPerformance } from '../types/engine.types';
import { PerformanceTracker } from './PerformanceTracker';

export interface OptimizationResult {
  strategyName: string;
  recommendation: 'INCREASE_WEIGHT' | 'DECREASE_WEIGHT' | 'DISABLE' | 'KEEP';
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
}

/**
 * Rule-based optimization framework.
 * Plug in ML model later by overriding `computeSuggestedWeight`.
 */
export class StrategyOptimizer {
  constructor(
    private readonly tracker: PerformanceTracker,
    private readonly weights: Map<string, number>,
  ) {}

  optimize(): OptimizationResult[] {
    const performances = this.tracker.summarize();
    return performances.map(p => this.evaluateStrategy(p));
  }

  private evaluateStrategy(perf: StrategyPerformance): OptimizationResult {
    const currentWeight = this.weights.get(perf.strategyName) ?? 1;
    const { strategyName, winRate, profitFactor, maxDrawdown, trades } = perf;

    if (trades < 10) {
      return {
        strategyName, currentWeight, suggestedWeight: currentWeight,
        recommendation: 'KEEP', reason: 'Insufficient trades for evaluation',
      };
    }

    // Disable: catastrophic performance
    if (winRate < 30 || profitFactor < 0.7 || maxDrawdown > 25) {
      return {
        strategyName, currentWeight, suggestedWeight: 0,
        recommendation: 'DISABLE',
        reason: `WR ${winRate}%, PF ${profitFactor}, DD ${maxDrawdown}%`,
      };
    }

    const suggestedWeight = this.computeSuggestedWeight(perf, currentWeight);

    if (suggestedWeight > currentWeight) {
      return { strategyName, currentWeight, suggestedWeight, recommendation: 'INCREASE_WEIGHT', reason: `WR ${winRate}%, PF ${profitFactor}` };
    }
    if (suggestedWeight < currentWeight) {
      return { strategyName, currentWeight, suggestedWeight, recommendation: 'DECREASE_WEIGHT', reason: `WR ${winRate}%, PF ${profitFactor}` };
    }
    return { strategyName, currentWeight, suggestedWeight, recommendation: 'KEEP', reason: 'Performance within acceptable range' };
  }

  // Override this method to plug in ML/AI model
  protected computeSuggestedWeight(perf: StrategyPerformance, current: number): number {
    let w = current;
    if (perf.winRate > 60 && perf.profitFactor > 1.5) w = Math.min(w + 1, 10);
    if (perf.winRate < 45 || perf.profitFactor < 1.0) w = Math.max(w - 1, 1);
    return w;
  }

  applyRecommendations(results: OptimizationResult[]): void {
    for (const r of results) {
      if (r.recommendation === 'DISABLE') {
        this.weights.set(r.strategyName, 0);
      } else {
        this.weights.set(r.strategyName, r.suggestedWeight);
      }
    }
  }
}
