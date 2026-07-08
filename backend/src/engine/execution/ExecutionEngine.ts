import type { FinalSignal } from '../types/signal.types';
import type { PositionSizing } from '../types/risk.types';

export interface Position {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  volume: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  partialClosed: boolean;
}

export interface ExecutionResult {
  success: boolean;
  positionId?: string;
  message: string;
}

export interface TrailingConfig {
  trailPips: number;        // activate trailing when profit >= X pips
  stepPips: number;         // move SL every X pips of additional profit
}

export interface BreakEvenConfig {
  activateAtPips: number;   // move SL to entry when profit >= X pips
}

export interface PartialTPConfig {
  closePercent: number;     // close X% of position at first TP level
  atRR: number;             // close partial at this R:R multiple
}

// ── Abstract base — implement per broker/exchange ────────────────────────────

export abstract class ExecutionEngine {
  abstract openPosition(symbol: string, signal: FinalSignal, sizing: PositionSizing): Promise<ExecutionResult>;
  abstract closePosition(positionId: string): Promise<ExecutionResult>;
  abstract getOpenPositions(): Promise<Position[]>;
  abstract modifyStopLoss(positionId: string, newSL: number): Promise<ExecutionResult>;

  async applyTrailingStop(position: Position, currentPrice: number, config: TrailingConfig): Promise<number | null> {
    const { direction, entryPrice, stopLoss } = position;
    const profitPips = direction === 'BUY'
      ? currentPrice - entryPrice
      : entryPrice - currentPrice;

    if (profitPips < config.trailPips) return null;

    const newSL = direction === 'BUY'
      ? currentPrice - config.trailPips
      : currentPrice + config.trailPips;

    // Only move SL in profit direction
    if (direction === 'BUY'  && newSL <= stopLoss) return null;
    if (direction === 'SELL' && newSL >= stopLoss) return null;

    return newSL;
  }

  async applyBreakEven(position: Position, currentPrice: number, config: BreakEvenConfig): Promise<number | null> {
    const { direction, entryPrice, stopLoss } = position;
    const profitPips = direction === 'BUY'
      ? currentPrice - entryPrice
      : entryPrice - currentPrice;

    if (profitPips < config.activateAtPips) return null;

    // SL already at or beyond entry
    if (direction === 'BUY'  && stopLoss >= entryPrice) return null;
    if (direction === 'SELL' && stopLoss <= entryPrice) return null;

    return entryPrice; // move to entry
  }
}

// ── MT5 implementation (via ApexQuant bridge) ────────────────────────────────

export class MT5ExecutionEngine extends ExecutionEngine {
  constructor(private readonly bridgeUrl: string, private readonly token: string) {
    super();
  }

  async openPosition(symbol: string, signal: FinalSignal, sizing: PositionSizing): Promise<ExecutionResult> {
    // MT5 trade execution would go via a separate bridge endpoint
    // Placeholder: the bridge EA reads signals from the backend and executes
    return { success: false, message: 'MT5 execution via EA — signal stored for EA polling' };
  }

  async closePosition(positionId: string): Promise<ExecutionResult> {
    return { success: false, message: 'MT5 close position — EA-controlled' };
  }

  async getOpenPositions(): Promise<Position[]> {
    // Positions are pushed by the EA ping endpoint — read from DB instead
    return [];
  }

  async modifyStopLoss(positionId: string, newSL: number): Promise<ExecutionResult> {
    return { success: false, message: 'MT5 SL modification — EA-controlled' };
  }
}

// ── Paper trading implementation (for backtesting & simulation) ──────────────

export class PaperExecutionEngine extends ExecutionEngine {
  private positions: Map<string, Position> = new Map();
  private nextId = 1;

  async openPosition(symbol: string, signal: FinalSignal, sizing: PositionSizing): Promise<ExecutionResult> {
    if (!sizing.allowed) return { success: false, message: sizing.reason ?? 'Risk blocked' };

    const id = `PAPER-${this.nextId++}`;
    // Entry price not known here — caller provides via currentPrice
    const position: Position = {
      id, symbol,
      direction: signal.direction as 'BUY' | 'SELL',
      entryPrice: 0,
      volume: sizing.lotSize,
      stopLoss: 0,
      takeProfit: 0,
      openedAt: Date.now(),
      partialClosed: false,
    };
    this.positions.set(id, position);
    return { success: true, positionId: id, message: `Paper position opened: ${id}` };
  }

  async closePosition(positionId: string): Promise<ExecutionResult> {
    if (!this.positions.has(positionId)) return { success: false, message: 'Position not found' };
    this.positions.delete(positionId);
    return { success: true, positionId, message: `Paper position closed: ${positionId}` };
  }

  async getOpenPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async modifyStopLoss(positionId: string, newSL: number): Promise<ExecutionResult> {
    const pos = this.positions.get(positionId);
    if (!pos) return { success: false, message: 'Position not found' };
    pos.stopLoss = newSL;
    return { success: true, positionId, message: `SL updated to ${newSL}` };
  }
}
