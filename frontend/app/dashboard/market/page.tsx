"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "exchange" | "forex";

// ── Coin icon (real logo with letter fallback) ────────────────────────────────

// Polygon recently rebranded from MATIC → POL; CoinCap still indexes as "matic"
const COIN_ID_OVERRIDES: Record<string, string> = {
  POLUSDT: "matic",
};

function coinId(binance: string) {
  return COIN_ID_OVERRIDES[binance] ?? binance.replace("USDT", "").toLowerCase();
}

function CoinIcon({ binance, fallback }: { binance: string; fallback: string }) {
  const [err, setErr] = useState(false);
  const id = coinId(binance);

  if (err) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-xs font-bold text-[#e7b949]">
        {fallback}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://assets.coincap.io/assets/icons/${id}@2x.png`}
      alt={id.toUpperCase()}
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full"
      onError={() => setErr(true)}
    />
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function ChangeCell({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-1 font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {fmtPct(pct)}
    </span>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-5 py-3 font-medium text-xs uppercase tracking-wider text-slate-600 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function CategoryLabel({ label, cols = 5 }: { label: string; cols?: number }) {
  return (
    <tr className="bg-white/[0.015] border-b border-white/[0.04]">
      <td colSpan={cols} className="px-5 py-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{label}</span>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO MARKET
// ─────────────────────────────────────────────────────────────────────────────

const CRYPTO_GROUPS = [
  {
    label: "Large Cap",
    symbols: [
      { display: "Bitcoin",  ticker: "BTC/USDT", binance: "BTCUSDT",  icon: "₿" },
      { display: "Ethereum", ticker: "ETH/USDT", binance: "ETHUSDT",  icon: "Ξ" },
      { display: "BNB",      ticker: "BNB/USDT", binance: "BNBUSDT",  icon: "B" },
      { display: "Solana",   ticker: "SOL/USDT", binance: "SOLUSDT",  icon: "◎" },
      { display: "XRP",      ticker: "XRP/USDT", binance: "XRPUSDT",  icon: "✕" },
      { display: "Cardano",  ticker: "ADA/USDT", binance: "ADAUSDT",  icon: "◈" },
    ],
  },
  {
    label: "Mid Cap",
    symbols: [
      { display: "Dogecoin", ticker: "DOGE/USDT", binance: "DOGEUSDT", icon: "D" },
      { display: "Avalanche",ticker: "AVAX/USDT", binance: "AVAXUSDT", icon: "A" },
      { display: "Polkadot", ticker: "DOT/USDT",  binance: "DOTUSDT",  icon: "●" },
      { display: "Polygon",  ticker: "POL/USDT",  binance: "POLUSDT",  icon: "⬡" },
      { display: "Chainlink",ticker: "LINK/USDT", binance: "LINKUSDT", icon: "⬡" },
      { display: "Litecoin", ticker: "LTC/USDT",  binance: "LTCUSDT",  icon: "Ł" },
    ],
  },
  {
    label: "DeFi",
    symbols: [
      { display: "Uniswap",  ticker: "UNI/USDT",  binance: "UNIUSDT",  icon: "🦄" },
      { display: "Aave",     ticker: "AAVE/USDT", binance: "AAVEUSDT", icon: "Ξ" },
      { display: "Cosmos",   ticker: "ATOM/USDT", binance: "ATOMUSDT", icon: "⬡" },
      { display: "Near",     ticker: "NEAR/USDT", binance: "NEARUSDT", icon: "N" },
    ],
  },
];

type CryptoTicker = { price: number; change: number; volume: number };

function CryptoMarket() {
  const [data, setData]       = useState<Record<string, CryptoTicker>>({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const allBinance = CRYPTO_GROUPS.flatMap((g) => g.symbols.map((s) => s.binance));

  useEffect(() => {
    const streams = allBinance.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onopen = () => { setConnected(true); setLoading(false); };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => { setConnected(false); setLoading(false); };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        const t = msg.data;
        if (!t?.s) return;
        setData((prev) => ({
          ...prev,
          [t.s]: {
            price:  parseFloat(t.c),
            change: parseFloat(t.P),
            volume: parseFloat(t.q),
          },
        }));
        setLastUpdate(new Date());
      } catch {}
    };

    return () => ws.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmtPrice(n: number) {
    if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1)    return n.toFixed(4);
    return n.toFixed(6);
  }

  function fmtVol(n: number) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Exchange</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Crypto Market</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              {connected
                ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Live · Binance WebSocket · {lastUpdate?.toLocaleTimeString()}</>
                : loading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin inline" /> Connecting…</>
                : <><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" /> Disconnected</>}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats bar */}
      {!loading && Object.keys(data).length > 0 && (() => {
        const btc = data["BTCUSDT"];
        const gainers = CRYPTO_GROUPS.flatMap(g => g.symbols).filter(s => (data[s.binance]?.change ?? 0) > 0).length;
        const losers  = CRYPTO_GROUPS.flatMap(g => g.symbols).filter(s => (data[s.binance]?.change ?? 0) < 0).length;
        return (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "BTC Price", value: btc ? `$${fmtPrice(btc.price)}` : "—" },
              { label: "BTC 24h",   value: btc ? fmtPct(btc.change) : "—", color: btc && btc.change >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Gainers",   value: `${gainers} pairs`, color: "text-emerald-400" },
              { label: "Losers",    value: `${losers} pairs`,  color: "text-red-400" },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{k.label}</p>
                <p className={`mt-1.5 text-lg font-extrabold ${(k as any).color ?? "text-white"}`}>{k.value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tables per group */}
      {CRYPTO_GROUPS.map((group) => (
        <TableShell key={group.label}>
          <thead>
            <CategoryLabel label={group.label} />
            <tr className="border-b border-white/[0.05]">
              <Th>Asset</Th>
              <Th>Ticker</Th>
              <Th right>Price (USDT)</Th>
              <Th right>24h Change</Th>
              <Th right>24h Volume</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {group.symbols.map(({ display, ticker, binance, icon }) => {
              const t = data[binance];
              return (
                <tr key={binance} className="transition hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CoinIcon binance={binance} fallback={icon} />
                      <span className="font-semibold text-white">{display}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{ticker}</td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                    {t ? `$${fmtPrice(t.price)}` : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {t ? <ChangeCell pct={t.change} /> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-slate-500">
                    {t ? fmtVol(t.volume) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREX / CFD MARKET
// ─────────────────────────────────────────────────────────────────────────────

type ForexRow = { label: string; symbol: string; base: number; pip: number; spread: number; category: string };

const FOREX_ROWS: ForexRow[] = [
  // Major Pairs
  { label: "Euro / US Dollar",        symbol: "EUR/USD", base: 1.08410, pip: 0.00010, spread: 0.00008, category: "Major Pairs" },
  { label: "British Pound / US Dollar",symbol: "GBP/USD", base: 1.26730, pip: 0.00010, spread: 0.00012, category: "Major Pairs" },
  { label: "US Dollar / Japanese Yen",symbol: "USD/JPY", base: 149.820, pip: 0.01000, spread: 0.01200, category: "Major Pairs" },
  { label: "Australian Dollar / USD",  symbol: "AUD/USD", base: 0.65120, pip: 0.00010, spread: 0.00010, category: "Major Pairs" },
  { label: "US Dollar / Swiss Franc",  symbol: "USD/CHF", base: 0.90340, pip: 0.00010, spread: 0.00011, category: "Major Pairs" },
  { label: "US Dollar / Canadian Dollar",symbol:"USD/CAD",base: 1.36210, pip: 0.00010, spread: 0.00014, category: "Major Pairs" },
  { label: "New Zealand Dollar / USD", symbol: "NZD/USD", base: 0.59870, pip: 0.00010, spread: 0.00012, category: "Major Pairs" },
  // Minor Pairs
  { label: "Euro / British Pound",     symbol: "EUR/GBP", base: 0.85510, pip: 0.00010, spread: 0.00014, category: "Minor Pairs" },
  { label: "Euro / Japanese Yen",      symbol: "EUR/JPY", base: 162.350, pip: 0.01000, spread: 0.01800, category: "Minor Pairs" },
  { label: "British Pound / Yen",      symbol: "GBP/JPY", base: 189.840, pip: 0.01000, spread: 0.02100, category: "Minor Pairs" },
  { label: "Euro / Australian Dollar", symbol: "EUR/AUD", base: 1.66350, pip: 0.00010, spread: 0.00019, category: "Minor Pairs" },
  // Commodities
  { label: "Gold / US Dollar",         symbol: "XAU/USD", base: 2342.50, pip: 0.10000, spread: 0.30000, category: "Commodities" },
  { label: "Silver / US Dollar",       symbol: "XAG/USD", base: 29.1400, pip: 0.01000, spread: 0.03000, category: "Commodities" },
  { label: "WTI Crude Oil",            symbol: "WTI/USD", base: 78.4500, pip: 0.01000, spread: 0.04000, category: "Commodities" },
  { label: "Brent Crude Oil",          symbol: "OIL/USD", base: 82.3400, pip: 0.01000, spread: 0.05000, category: "Commodities" },
  // Indices
  { label: "NASDAQ 100",               symbol: "NAS100",  base: 17845.0, pip: 1.00000, spread: 1.50000, category: "Indices" },
  { label: "S&P 500",                  symbol: "SPX500",  base: 5312.00, pip: 0.10000, spread: 0.40000, category: "Indices" },
  { label: "DAX 40",                   symbol: "GER40",   base: 18234.0, pip: 1.00000, spread: 1.20000, category: "Indices" },
  { label: "FTSE 100",                 symbol: "UK100",   base: 8234.00, pip: 0.10000, spread: 0.60000, category: "Indices" },
  { label: "Nikkei 225",               symbol: "JPN225",  base: 38567.0, pip: 1.00000, spread: 7.00000, category: "Indices" },
];

type LiveForex = { price: number; change: number };

function useForexPrices(rows: ForexRow[]) {
  const [prices, setPrices] = useState<Record<string, LiveForex>>(() =>
    Object.fromEntries(rows.map((r) => [r.symbol, { price: r.base, change: 0 }]))
  );
  // Per-symbol drift direction (mean-reverting random walk)
  const drift = useRef<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.symbol, 0]))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          // Update drift with some momentum + mean-reversion toward base
          const d = drift.current[row.symbol];
          const newDrift = d * 0.85 + (Math.random() - 0.5) * row.pip * 2;
          drift.current[row.symbol] = newDrift;

          const cur = prev[row.symbol].price;
          // Mean-revert if too far from base (±0.5%)
          const deviation = (cur - row.base) / row.base;
          const revert = deviation * row.base * 0.01;
          const price = Math.max(cur + newDrift - revert, row.base * 0.94);
          const change = ((price - row.base) / row.base) * 100;
          next[row.symbol] = { price, change };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rows]);

  return prices;
}

function ForexMarket() {
  const prices = useForexPrices(FOREX_ROWS);

  const groups = Array.from(new Set(FOREX_ROWS.map((r) => r.category)));

  function fmtForexPrice(symbol: string, price: number) {
    if (symbol.includes("JPY") || symbol.includes("NAS") || symbol.includes("SPX")
      || symbol.includes("GER") || symbol.includes("UK1") || symbol.includes("JPN")) {
      return price >= 1000 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(2);
    }
    if (symbol.includes("XAU") || symbol.includes("WTI") || symbol.includes("OIL")) return price.toFixed(2);
    if (symbol.includes("XAG")) return price.toFixed(3);
    return price.toFixed(5);
  }

  // quick stats
  const gainers = FOREX_ROWS.filter((r) => prices[r.symbol].change >= 0).length;
  const losers  = FOREX_ROWS.length - gainers;
  const gold    = prices["XAU/USD"];

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Forex / CFD</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">CFD & Forex Market</h1>
            <p className="mt-2 text-sm text-slate-400">
              Pairs · Commodities · Indices — indicative prices, connect MT5 EA for live feed.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="text-xs font-bold text-blue-400">Live (Indicative)</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Gold (XAU/USD)", value: `$${gold.price.toFixed(2)}`, color: "text-[#e7b949]" },
          { label: "Gold 24h",       value: fmtPct(gold.change),         color: gold.change >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Pairs Rising",   value: `${gainers} instruments`,    color: "text-emerald-400" },
          { label: "Pairs Falling",  value: `${losers} instruments`,     color: "text-red-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">{k.label}</p>
            <p className={`mt-1.5 text-lg font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tables per category */}
      {groups.map((cat) => {
        const rows = FOREX_ROWS.filter((r) => r.category === cat);
        return (
          <TableShell key={cat}>
            <thead>
              <CategoryLabel label={cat} />
              <tr className="border-b border-white/[0.05]">
                <Th>Instrument</Th>
                <Th>Symbol</Th>
                <Th right>Price</Th>
                <Th right>Change</Th>
                <Th right>Spread</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row) => {
                const live = prices[row.symbol];
                return (
                  <tr key={row.symbol} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-white">{row.label}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-300">{row.symbol}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-white">
                      {fmtForexPrice(row.symbol, live.price)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChangeCell pct={live.change} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-500">
                      {fmtForexPrice(row.symbol, row.spread)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        );
      })}

      <p className="text-center text-xs text-slate-600">
        ⓘ Prices are indicative and update every 1.5 seconds. Connect MT5 EA for real broker feed.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("aq_sidebar_mode");
    setMode(saved === "forex" ? "forex" : "exchange");

    const handler = (e: Event) => setMode((e as CustomEvent<Mode>).detail);
    window.addEventListener("aq-mode-change", handler);
    return () => window.removeEventListener("aq-mode-change", handler);
  }, []);

  if (!mode) return null;
  return mode === "forex" ? <ForexMarket /> : <CryptoMarket />;
}
