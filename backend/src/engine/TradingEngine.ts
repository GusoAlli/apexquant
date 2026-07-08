import type { AssetData, EngineConfig, EngineRunResult } from './types/engine.types';
import type { FinalSignal } from './types/signal.types';
import type { AccountState } from './types/risk.types';
import { RegimeEngine }       from './regime/RegimeEngine';
import { SignalEngine }       from './signal/SignalEngine';
import { ConfirmationEngine } from './confirmation/ConfirmationEngine';
import { RiskEngine }         from './risk/RiskEngine';
import { PortfolioEngine }    from './portfolio/PortfolioEngine';
import { PerformanceTracker } from './optimizer/PerformanceTracker';
import { StrategyOptimizer }  from './optimizer/StrategyOptimizer';

export class TradingEngine {
  private readonly regime:       RegimeEngine;
  private readonly signal:       SignalEngine;
  private readonly confirmation: ConfirmationEngine;
  private readonly risk:         RiskEngine;
  private readonly portfolio:    PortfolioEngine;
  private readonly tracker:      PerformanceTracker;
  private readonly optimizer:    StrategyOptimizer;
  private readonly weights:      Map<string, number>;

  constructor(private readonly config: EngineConfig) {
    this.regime       = new RegimeEngine();
    this.signal       = new SignalEngine();
    this.confirmation = new ConfirmationEngine(config.confirmationThreshold);
    this.risk         = new RiskEngine(config.riskConfig);
    this.portfolio    = new PortfolioEngine(config.topNAssets ?? 3);
    this.tracker      = new PerformanceTracker();
    this.weights      = new Map(Object.entries(config.strategyWeights ?? {}));
    this.optimizer    = new StrategyOptimizer(this.tracker, this.weights);
  }

  /**
   * Run the full engine pipeline on a single asset.
   */
  async runAsset(asset: AssetData, account: AccountState): Promise<EngineRunResult> {
    const { candles, higherTfCandles, fundingRate } = asset;

    // 1. Detect market regime
    const regimeResult = this.regime.detect(candles);

    // 2. Generate signals from all strategies
    const aggregated = await this.signal.run(candles, regimeResult.regime, fundingRate);

    // 3. Confirm signal
    const confirmationResult = this.confirmation.confirm(aggregated, candles, higherTfCandles);

    const finalSignal: FinalSignal = {
      ...aggregated,
      confirmed: confirmationResult.passed,
      confirmationDetail: confirmationResult,
    };

    // 4. Compute position size (risk engine)
    const sizing = this.risk.size(finalSignal, account, candles);

    return {
      symbol:    asset.symbol,
      signal:    finalSignal,
      sizing,
      account,
      timestamp: Date.now(),
    };
  }

  /**
   * Run portfolio selection then engine on top-ranked assets.
   */
  async runPortfolio(assets: AssetData[], account: AccountState): Promise<EngineRunResult[]> {
    const selected = this.portfolio.selectTop(assets);
    const results  = await Promise.all(selected.map(a => this.runAsset(a, account)));
    return results.filter(r => r.signal.direction !== 'WAIT' && r.sizing.allowed);
  }

  /**
   * Rank all assets by composite score.
   */
  rankAssets(assets: AssetData[]) {
    return this.portfolio.rank(assets);
  }

  /**
   * Get performance summary for all strategies.
   */
  getPerformance() {
    return this.tracker.summarize();
  }

  /**
   * Run optimizer and get recommendations (non-destructive — caller decides to apply).
   */
  optimizeStrategies() {
    return this.optimizer.optimize();
  }

  /**
   * Apply optimizer recommendations to live weights.
   */
  applyOptimization() {
    const results = this.optimizer.optimize();
    this.optimizer.applyRecommendations(results);
    return results;
  }

  /** Expose tracker so caller can record trade outcomes */
  get performanceTracker() {
    return this.tracker;
  }
}
