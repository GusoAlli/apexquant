"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, TrendingDown, TrendingUp, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type FundingRow = {
  binance: string;       // raw symbol e.g. BTCUSDT
  display: string;       // e.g. BTC/USDT
  base: string;          // e.g. BTC
  fundingRate: number;   // as percentage
  nextFundingTime: number; // unix ms
};

// ── Coin Icon ─────────────────────────────────────────────────────────────────

const COIN_OVERRIDE: Record<string, string> = {
  pol: "matic", matic: "matic", "1000000bob": "bob",
  "1000bonk": "bonk", "1000pepe": "pepe", "1000shib": "shib",
  "1000floki": "floki", "1000x": "x",
};

function coinSlug(base: string): string {
  const b = base.toLowerCase();
  return COIN_OVERRIDE[b] ?? b;
}

function CoinIcon({ base, size = 24 }: { base: string; size?: number }) {
  const [err, setErr] = useState(false);
  const slug = coinSlug(base);

  if (err) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-[#e7b949]/10 font-bold text-[#e7b949]"
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      >
        {base.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://assets.coincap.io/assets/icons/${slug}@2x.png`}
      alt={base}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-contain"
      onError={() => setErr(true)}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRate(r: number): string {
  return (r >= 0 ? "+" : "") + r.toFixed(4) + "%";
}
function fmtAnn(r: number): string {
  const a = r * 3 * 365;
  return (a >= 0 ? "+" : "") + a.toFixed(2) + "%/yr";
}
function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtCountdown(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FundingPage() {
  const [rows, setRows]       = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [now, setNow]         = useState(Date.now());

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch("https://fapi.binance.com/fapi/v1/premiumIndex");
      const data = await res.json() as any[];
      const parsed: FundingRow[] = data
        .filter((d) => typeof d.symbol === "string" && d.symbol.endsWith("USDT"))
        .map((d) => {
          const binance = d.symbol as string;
          const base    = binance.replace(/USDT$/, "");
          return {
            binance,
            display: `${base}/USDT`,
            base,
            fundingRate:     parseFloat(d.lastFundingRate) * 100,
            nextFundingTime: Number(d.nextFundingTime),
          };
        })
        .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));
      setRows(parsed);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = query.trim()
    ? rows.filter((r) => r.display.toLowerCase().includes(query.toLowerCase()) || r.base.toLowerCase().includes(query.toLowerCase()))
    : rows;

  const top = filtered.slice(0, 50);

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5 lg:px-7 lg:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#e7b949]">Futures</p>
            <h1 className="mt-0.5 text-xl font-extrabold text-white">Funding Rates</h1>
            <p className="mt-1 text-sm text-slate-400">
              Binance perpetual futures — ranked by absolute rate. Updates every 60s.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-slate-400 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by symbol…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="text-xs text-slate-600">{filtered.length} pairs</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0f1a]">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["#", "Symbol", "Funding Rate", "Annualised", "Countdown", "Next Funding"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600 ${
                        i >= 4 ? "hidden md:table-cell" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {top.map((r, idx) => {
                  const pos = r.fundingRate >= 0;
                  const absRate = Math.abs(r.fundingRate);
                  // bar width: scale to max 8% → 100%
                  const barW = Math.min(100, (absRate / 0.3) * 100);

                  return (
                    <tr
                      key={r.binance}
                      className="group transition hover:bg-white/[0.025]"
                    >
                      {/* Rank */}
                      <td className="w-10 px-4 py-3 text-xs text-slate-600">{idx + 1}</td>

                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <CoinIcon base={r.base} size={26} />
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold text-white leading-none">{r.display}</p>
                            <p className="mt-0.5 text-[10px] text-slate-600 uppercase tracking-wider">Perpetual</p>
                          </div>
                        </div>
                      </td>

                      {/* Funding Rate */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 font-mono text-sm font-bold ${
                            pos ? "text-red-400" : "text-emerald-400"
                          }`}>
                            {pos
                              ? <TrendingDown className="h-3.5 w-3.5" />
                              : <TrendingUp   className="h-3.5 w-3.5" />}
                            {fmtRate(r.fundingRate)}
                          </div>
                          {/* Mini bar */}
                          <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                            <div
                              className={`h-full rounded-full ${pos ? "bg-red-500" : "bg-emerald-500"}`}
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Annualised */}
                      <td className={`px-4 py-3 font-mono text-xs font-bold ${
                        pos ? "text-red-400/70" : "text-emerald-400/70"
                      }`}>
                        {fmtAnn(r.fundingRate)}
                      </td>

                      {/* Countdown */}
                      <td className="hidden px-4 py-3 font-mono text-xs text-slate-400 md:table-cell">
                        {fmtCountdown(r.nextFundingTime)}
                      </td>

                      {/* Next Funding Time */}
                      <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                        {fmtTime(r.nextFundingTime)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && top.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-600">No results for &quot;{query}&quot;</p>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          <span>Positive rate — longs pay shorts (bullish market)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span>Negative rate — shorts pay longs (bearish market)</span>
        </div>
      </div>
    </div>
  );
}
