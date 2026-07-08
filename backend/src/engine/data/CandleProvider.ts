import type { OHLCV } from '../types/market.types';

export type BinanceInterval =
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M';

type RawKline = [
  number,  // 0 openTime
  string,  // 1 open
  string,  // 2 high
  string,  // 3 low
  string,  // 4 close
  string,  // 5 volume
  number,  // 6 closeTime
  string,  // 7 quoteAssetVolume
  number,  // 8 numberOfTrades
  string,  // 9 takerBuyBaseAssetVolume
  string,  // 10 takerBuyQuoteAssetVolume
  string,  // 11 ignore
];

export class CandleProvider {
  private cache = new Map<string, { data: OHLCV[]; fetchedAt: number }>();
  private readonly cacheTtlMs: number;

  constructor(cacheTtlSeconds = 60) {
    this.cacheTtlMs = cacheTtlSeconds * 1000;
  }

  // ── Binance Spot (no auth, public endpoint) ──────────────────────────────

  async fetchBinance(
    symbol: string,
    interval: BinanceInterval = '1h',
    limit = 500,
  ): Promise<OHLCV[]> {
    const cacheKey = `binance:${symbol}:${interval}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.data;
    }

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      throw new Error(`Binance klines fetch failed for ${symbol}: HTTP ${res.status}`);
    }

    const raw = await res.json() as RawKline[];
    const data: OHLCV[] = raw.map(k => ({
      timestamp: k[0],
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    this.cache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  }

  // ── Binance Futures (for funding rate context) ───────────────────────────

  async fetchBinanceFutures(
    symbol: string,
    interval: BinanceInterval = '1h',
    limit = 500,
  ): Promise<OHLCV[]> {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance futures klines failed for ${symbol}: HTTP ${res.status}`);

    const raw = await res.json() as RawKline[];
    return raw.map(k => ({
      timestamp: k[0],
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  async fetchFundingRate(symbol: string): Promise<number | null> {
    try {
      const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json() as Array<{ fundingRate: string }>;
      return data[0] ? parseFloat(data[0].fundingRate) : null;
    } catch {
      return null;
    }
  }

  // ── Fetch multiple symbols in parallel ───────────────────────────────────

  async fetchMulti(
    symbols: string[],
    interval: BinanceInterval = '1h',
    limit = 500,
    isFutures = false,
  ): Promise<Map<string, OHLCV[]>> {
    const results = await Promise.allSettled(
      symbols.map(s =>
        isFutures
          ? this.fetchBinanceFutures(s, interval, limit)
          : this.fetchBinance(s, interval, limit)
      )
    );

    const map = new Map<string, OHLCV[]>();
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') map.set(symbols[i], r.value);
      else console.warn(`[CandleProvider] Failed to fetch ${symbols[i]}: ${r.reason}`);
    });
    return map;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
