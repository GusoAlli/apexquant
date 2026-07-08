import type { BinanceInterval } from './data/CandleProvider';
import type { AssetData, EngineRunResult } from './types/engine.types';
import type { AccountState, RiskConfig } from './types/risk.types';
import type { OHLCV } from './types/market.types';
import { TradingEngine }   from './TradingEngine';
import { CandleProvider }  from './data/CandleProvider';
import { emitToAll }       from '../lib/eventBus';
import prisma              from '../lib/prisma';

export interface RunnerConfig {
  symbols: string[];
  interval: BinanceInterval;
  higherTfInterval?: BinanceInterval;
  isFutures?: boolean;
  riskConfig: RiskConfig;
  topNAssets?: number;
  confirmationThreshold?: number;
}

export interface RunnerStatus {
  running: boolean;
  lastRunAt: number | null;
  lastRunResults: EngineRunResult[];
  nextRunAt: number | null;
  error: string | null;
}

export class EngineRunner {
  private engine: TradingEngine;
  private provider: CandleProvider;
  private status: RunnerStatus = {
    running: false,
    lastRunAt: null,
    lastRunResults: [],
    nextRunAt: null,
    error: null,
  };
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private config: RunnerConfig) {
    this.engine   = new TradingEngine({
      symbols:                 config.symbols,
      riskConfig:              config.riskConfig,
      topNAssets:              config.topNAssets,
      confirmationThreshold:   config.confirmationThreshold,
    });
    this.provider = new CandleProvider(55); // 55s cache — just under 1m interval
  }

  // ── Single run ────────────────────────────────────────────────────────────

  async run(account?: AccountState): Promise<EngineRunResult[]> {
    if (this.status.running) {
      throw new Error('Engine already running — wait for current run to finish');
    }

    this.status.running = true;
    this.status.error   = null;

    try {
      // 1. Fetch candles for all symbols in parallel
      const [candleMap, higherTfMap] = await Promise.all([
        this.provider.fetchMulti(this.config.symbols, this.config.interval, 500, this.config.isFutures),
        this.config.higherTfInterval
          ? this.provider.fetchMulti(this.config.symbols, this.config.higherTfInterval, 200, this.config.isFutures)
          : Promise.resolve(new Map<string, import('./types/market.types').OHLCV[]>()),
      ]);

      // 2. Fetch funding rates for futures symbols
      const fundingMap = new Map<string, number | null>();
      if (this.config.isFutures) {
        await Promise.all(
          this.config.symbols.map(async s => {
            fundingMap.set(s, await this.provider.fetchFundingRate(s));
          })
        );
      }

      // 3. Build AssetData objects
      const assets: AssetData[] = this.config.symbols
        .filter(s => candleMap.has(s))
        .map(s => ({
          symbol:           s,
          candles:          candleMap.get(s)!,
          higherTfCandles:  higherTfMap.get(s),
          fundingRate:      fundingMap.get(s) ?? undefined,
        }));

      // 4. Use real MT5 account state or default paper account
      const accountState: AccountState = account ?? {
        balance:         10_000,
        equity:          10_000,
        openPositions:   0,
        dailyPnl:        0,
        peakEquity:      10_000,
      };

      // 5. Run engine portfolio (selects top N assets and runs full pipeline)
      const results = await this.engine.runPortfolio(assets, accountState);

      // 6. Persist actionable signals to DB + notify via SSE
      await this.persistSignals(results, candleMap);

      this.status.lastRunAt      = Date.now();
      this.status.lastRunResults = results;
      this.status.running        = false;

      return results;
    } catch (err: any) {
      this.status.error   = err.message ?? 'Unknown error';
      this.status.running = false;
      throw err;
    }
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────

  startScheduler(intervalMinutes = 60): void {
    if (this.intervalHandle) return; // already running

    const ms = intervalMinutes * 60 * 1000;
    this.status.nextRunAt = Date.now() + ms;

    this.intervalHandle = setInterval(async () => {
      try {
        await this.run();
        this.status.nextRunAt = Date.now() + ms;
      } catch (err: any) {
        console.error('[EngineRunner] Scheduled run failed:', err.message);
      }
    }, ms);

    console.log(`[EngineRunner] Scheduler started — every ${intervalMinutes}m`);
  }

  stopScheduler(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle   = null;
      this.status.nextRunAt = null;
    }
  }

  getStatus(): RunnerStatus {
    return { ...this.status };
  }

  getPerformance() {
    return this.engine.getPerformance();
  }

  getRanking(assets: AssetData[]) {
    return this.engine.rankAssets(assets);
  }

  // ── Persist + notify ──────────────────────────────────────────────────────

  private async persistSignals(results: EngineRunResult[], candleMap: Map<string, OHLCV[]>): Promise<void> {
    for (const r of results) {
      if (r.signal.direction === 'WAIT' || !r.signal.confirmed) continue;

      const candles = candleMap.get(r.symbol);
      const entry   = candles ? candles[candles.length - 1].close : 0;

      const sl = r.signal.direction === 'BUY'
        ? entry - r.sizing.stopLossPips
        : entry + r.sizing.stopLossPips;
      const tp = r.signal.direction === 'BUY'
        ? entry + r.sizing.takeProfitPips
        : entry - r.sizing.takeProfitPips;

      const votingStrategies = r.signal.votes
        .filter(v => v.direction === r.signal.direction)
        .map(v => v.strategy)
        .join(', ');

      const signal = await prisma.signal.create({
        data: {
          pair:      r.symbol,
          direction: r.signal.direction,
          entry,
          tp:        Math.round(tp * 100000) / 100000,
          sl:        Math.round(sl * 100000) / 100000,
          strength:  r.signal.confidence,
          timeframe: this.config.interval,
          model:     `Engine: ${votingStrategies}`,
          status:    'ACTIVE',
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
      });

      emitToAll({
        type:    'signal',
        payload: {
          id:         signal.id,
          pair:       signal.pair,
          direction:  signal.direction,
          confidence: signal.strength,
          regime:     r.signal.regime,
          model:      signal.model,
        },
      });
    }
  }
}

// ── Singleton instance (shared across API requests) ───────────────────────────

let _runner: EngineRunner | null = null;

export function getEngineRunner(): EngineRunner {
  if (!_runner) {
    _runner = new EngineRunner({
      symbols:              ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
      interval:             '1h',
      higherTfInterval:     '4h',
      isFutures:            false,
      riskConfig: {
        riskPerTrade:       1,
        maxDailyLoss:       3,
        maxDrawdown:        10,
        maxOpenPositions:   5,
        minRR:              1.5,
      },
      topNAssets:           3,
      confirmationThreshold: 3,   // 3 out of 4 checks
    });
  }
  return _runner;
}

export function resetEngineRunner(): void {
  _runner = null;
}
