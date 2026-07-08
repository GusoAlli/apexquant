import type { OHLCV } from '../types/market.types';

// ── Moving Averages ────────────────────────────────────────────────────────────

export function sma(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function wma(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j] * (period - j);
    result.push(sum / denom);
  }
  return result;
}

// ── Volatility ────────────────────────────────────────────────────────────────

export function trueRange(candles: OHLCV[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low  - candles[i - 1].close);
    result.push(Math.max(hl, hc, lc));
  }
  return result;
}

export function atr(candles: OHLCV[], period: number): number[] {
  const trs = trueRange(candles);
  if (trs.length < period) return [];
  // Wilder smoothing
  const result: number[] = [];
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    result.push(prev);
  }
  return result;
}

export function bollingerBands(
  values: number[],
  period = 20,
  multiplier = 2,
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const middle = sma(values, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < middle.length; i++) {
    const slice = values.slice(i, i + period);
    const mean = middle[i];
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + multiplier * std);
    lower.push(mean - multiplier * std);
    bandwidth.push((2 * multiplier * std) / mean);
  }
  return { upper, middle, lower, bandwidth };
}

// ── Momentum ──────────────────────────────────────────────────────────────────

export function rsi(values: number[], period = 14): number[] {
  if (values.length < period + 1) return [];
  const changes = values.slice(1).map((v, i) => v - values[i]);
  const result: number[] = [];

  let avgGain = changes.slice(0, period).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  let avgLoss = Math.abs(changes.slice(0, period).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;

  const toRSI = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  result.push(toRSI(avgGain, avgLoss));

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(toRSI(avgGain, avgLoss));
  }
  return result;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);

  // Align by length (slow EMA starts later)
  const offset = slow - fast;
  const macdLine = slowEma.map((v, i) => fastEma[i + offset] - v);
  const signalLine = ema(macdLine, signal);
  const histOffset = signal - 1;
  const histogram = signalLine.map((v, i) => macdLine[i + histOffset] - v);

  return { macdLine, signalLine, histogram };
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export function adx(
  candles: OHLCV[],
  period = 14,
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  if (candles.length < period * 2) return { adx: [], plusDI: [], minusDI: [] };

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low  - candles[i - 1].close);
    trs.push(Math.max(hl, hc, lc));

    const up   = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low  - candles[i].low;
    plusDMs.push(up > down && up > 0 ? up : 0);
    minusDMs.push(down > up && down > 0 ? down : 0);
  }

  // Wilder smoothing
  const smoothed = (arr: number[]): number[] => {
    const res: number[] = [];
    let prev = arr.slice(0, period).reduce((a, b) => a + b, 0);
    res.push(prev);
    for (let i = period; i < arr.length; i++) {
      prev = prev - prev / period + arr[i];
      res.push(prev);
    }
    return res;
  };

  const sTR  = smoothed(trs);
  const sPDM = smoothed(plusDMs);
  const sMDM = smoothed(minusDMs);

  const plusDI  = sPDM.map((v, i) => (sTR[i] ? (v / sTR[i]) * 100 : 0));
  const minusDI = sMDM.map((v, i) => (sTR[i] ? (v / sTR[i]) * 100 : 0));

  const dx = plusDI.map((v, i) => {
    const sum = v + minusDI[i];
    return sum ? (Math.abs(v - minusDI[i]) / sum) * 100 : 0;
  });

  // Wilder smooth DX → ADX
  const adxValues: number[] = [];
  let prevAdx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  adxValues.push(prevAdx);
  for (let i = period; i < dx.length; i++) {
    prevAdx = (prevAdx * (period - 1) + dx[i]) / period;
    adxValues.push(prevAdx);
  }

  // Align all arrays to same length
  const len = adxValues.length;
  return {
    adx:     adxValues,
    plusDI:  plusDI.slice(-len),
    minusDI: minusDI.slice(-len),
  };
}

// ── Volume ────────────────────────────────────────────────────────────────────

export function volumeSma(candles: OHLCV[], period: number): number[] {
  return sma(candles.map(c => c.volume), period);
}

export function volumeRatio(candles: OHLCV[], period: number): number[] {
  const vols  = candles.map(c => c.volume);
  const avgs  = sma(vols, period);
  return avgs.map((avg, i) => (avg ? vols[i + period - 1] / avg : 1));
}

// ── Swing High / Low ──────────────────────────────────────────────────────────

export function swingHighs(candles: OHLCV[], lookback = 3): number[] {
  return candles.map((c, i) => {
    if (i < lookback || i >= candles.length - lookback) return NaN;
    const neighbors = [
      ...candles.slice(i - lookback, i),
      ...candles.slice(i + 1, i + lookback + 1),
    ];
    return neighbors.every(n => c.high >= n.high) ? c.high : NaN;
  });
}

export function swingLows(candles: OHLCV[], lookback = 3): number[] {
  return candles.map((c, i) => {
    if (i < lookback || i >= candles.length - lookback) return NaN;
    const neighbors = [
      ...candles.slice(i - lookback, i),
      ...candles.slice(i + 1, i + lookback + 1),
    ];
    return neighbors.every(n => c.low <= n.low) ? c.low : NaN;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export function closes(candles: OHLCV[]): number[] {
  return candles.map(c => c.close);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
