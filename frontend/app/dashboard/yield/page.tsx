"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight,
  Loader2, Percent, Plus, RefreshCw, Search, Shield, TrendingUp, X, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type Opportunity = {
  symbol: string; display: string; base: string;
  rate: number; rawApr: number; netApr: number;
  direction: "short_futures_long_spot" | "long_futures_short_spot";
  nextFunding: number; vol24h: number; viable: boolean;
};

type Position = {
  id: string; symbol: string; direction: string;
  notional: number; entryRate: number;
  entrySpotPrice: number; entryFutPrice: number;
  leverage: number; cyclesTarget: number; cyclesCollected: number;
  fundingCollected: number; feesTotal: number; netPnl: number;
  status: "open" | "closed";
  note: string | null;
  openedAt: string; closedAt: string | null;
};

type Summary = {
  openCount: number; closedCount: number;
  totalCollected: number; totalFees: number; netPnl: number;
  totalCycles: number; activeNotional: number; avgEntryRate: number;
};

// ── Coin icon ─────────────────────────────────────────────────────────────────

const COIN_OVERRIDE: Record<string, string> = {
  pol: "matic", matic: "matic", "1000000bob": "bob",
  "1000bonk": "bonk", "1000pepe": "pepe", "1000shib": "shib",
  "1000floki": "floki",
};
function coinSlug(base: string): string {
  const b = base.toLowerCase();
  return COIN_OVERRIDE[b] ?? b;
}
function CoinIcon({ base, size = 22 }: { base: string; size?: number }) {
  const [err, setErr] = useState(false);
  const slug = coinSlug(base);
  if (err)
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-[#e7b949]/10 font-bold text-[#e7b949]"
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      >
        {base.slice(0, 2)}
      </div>
    );
  return (
    <img
      src={`https://assets.coincap.io/assets/icons/${slug}@2x.png`}
      alt={base} width={size} height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-contain"
      onError={() => setErr(true)}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUsd(n: number, decimals = 2): string {
  return (n >= 0 ? "$" : "-$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtPct(n: number, d = 4): string {
  return (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
}
function fmtVol(v: number): string {
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(0) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
}
function fmtCountdown(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function sinceOpen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(diff / 3_600_000);
  return `${hrs}h ago`;
}

// ── Open Position Modal ───────────────────────────────────────────────────────

function OpenModal({
  opp, onClose, onOpened,
}: { opp: Opportunity; onClose: () => void; onOpened: () => void }) {
  const [notional, setNotional] = useState("1000");
  const [leverage, setLeverage] = useState("3");
  const [cycles,   setCycles]   = useState("30");
  const [note,     setNote]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");

  // Auto-fill price placeholders — real app would fetch live spot/fut price
  const estimatedFees = parseFloat(notional || "0") * 0.003;
  const projectedApr  = opp.netApr;

  async function handleOpen() {
    setLoading(true); setErr("");
    try {
      const res = await fetchWithAuth(`${API}/api/yield/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol:         opp.symbol,
          direction:      opp.direction,
          notional:       parseFloat(notional),
          entryRate:      opp.rate,
          entrySpotPrice: 0,
          entryFutPrice:  0,
          leverage:       parseFloat(leverage),
          cyclesTarget:   parseInt(cycles),
          feesTotal:      estimatedFees,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onOpened();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const dir = opp.direction === "short_futures_long_spot";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1520] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CoinIcon base={opp.base} size={32} />
            <div>
              <h2 className="text-base font-bold text-white">{opp.display}</h2>
              <p className="text-[11px] text-slate-500">
                {dir ? "Short Futures + Long Spot" : "Long Futures + Short Spot"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Strategy snapshot */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Funding Rate", value: fmtPct(opp.rate), color: "text-[#e7b949]" },
            { label: "Net APR",      value: opp.netApr.toFixed(1) + "%", color: "text-emerald-400" },
            { label: "Vol 24h",      value: fmtVol(opp.vol24h), color: "text-slate-300" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Notional Size (USDT)</label>
            <input
              type="number" value={notional} onChange={(e) => setNotional(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#e7b949]/40 focus:outline-none"
              placeholder="1000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Leverage</label>
              <select
                value={leverage} onChange={(e) => setLeverage(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0d1520] px-3 py-2.5 text-sm text-white focus:border-[#e7b949]/40 focus:outline-none"
              >
                {["1","2","3","5","10"].map((v) => <option key={v} value={v}>{v}x</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Target Cycles</label>
              <input
                type="number" value={cycles} onChange={(e) => setCycles(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:border-[#e7b949]/40 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Note (optional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#e7b949]/40 focus:outline-none"
              placeholder="e.g. Bull market, exit at 30 cycles"
            />
          </div>
        </div>

        {/* Projection */}
        <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Yield Projection</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs font-bold text-white">{fmtUsd(parseFloat(notional || "0") * opp.rate / 100)}</p>
              <p className="text-[10px] text-slate-600">Per Cycle</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white">{fmtUsd(parseFloat(notional || "0") * opp.rate / 100 * parseInt(cycles || "0"))}</p>
              <p className="text-[10px] text-slate-600">Gross ({cycles} cyc.)</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400">{projectedApr.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-600">Net APR</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-600">Est. fees: {fmtUsd(estimatedFees)} · Break-even in ~{Math.ceil(estimatedFees / (parseFloat(notional || "1") * Math.abs(opp.rate) / 100))} cycles</p>
        </div>

        {err && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-sm text-slate-400 transition hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleOpen} disabled={loading}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#f7d36d,#d4a017)" }}
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Open Position"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Position Row ──────────────────────────────────────────────────────────────

function PositionRow({
  pos, onCollect, onClose: onClosePos, onDelete,
}: {
  pos: Position;
  onCollect: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const base   = pos.symbol.replace(/USDT$/, "");
  const pnlPos = pos.netPnl >= 0;

  return (
    <div className={`rounded-xl border p-4 transition ${
      pos.status === "open"
        ? "border-white/[0.06] bg-[#0a0f1a] hover:border-white/[0.1]"
        : "border-white/[0.03] bg-[#080c14] opacity-60"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CoinIcon base={base} size={30} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{pos.symbol.replace("USDT", "/USDT")}</span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                pos.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/50 text-slate-500"
              }`}>{pos.status}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {pos.direction === "short_futures_long_spot" ? "Short Fut + Long Spot" : "Long Fut + Short Spot"}
              · {pos.leverage}x · {sinceOpen(pos.openedAt)}
            </p>
          </div>
        </div>

        <div className={`text-right ${pnlPos ? "text-emerald-400" : "text-red-400"}`}>
          <p className="text-sm font-bold">{fmtUsd(pos.netPnl)}</p>
          <p className="text-[10px]">Net PnL</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/[0.04] pt-3">
        <div>
          <p className="text-xs font-bold text-white">{fmtUsd(pos.notional, 0)}</p>
          <p className="text-[10px] text-slate-600">Notional</p>
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-300">{fmtUsd(pos.fundingCollected)}</p>
          <p className="text-[10px] text-slate-600">Collected</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">{fmtUsd(pos.feesTotal)}</p>
          <p className="text-[10px] text-slate-600">Fees</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300">{pos.cyclesCollected} / {pos.cyclesTarget || "∞"}</p>
          <p className="text-[10px] text-slate-600">Cycles</p>
        </div>
      </div>

      {pos.status === "open" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onCollect(pos.id)}
            className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/10"
          >
            + Collect
          </button>
          <button
            onClick={() => onClosePos(pos.id)}
            className="flex-1 rounded-lg border border-white/[0.07] py-1.5 text-xs font-bold text-slate-400 transition hover:border-red-500/20 hover:text-red-400"
          >
            Close
          </button>
          <button
            onClick={() => onDelete(pos.id)}
            className="rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-600 transition hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "scanner" | "positions";

export default function YieldPage() {
  const [tab, setTab]               = useState<Tab>("scanner");
  const [opportunities, setOpps]    = useState<Opportunity[]>([]);
  const [positions, setPositions]   = useState<Position[]>([]);
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState("");
  const [now, setNow]               = useState(Date.now());
  const [openOpp, setOpenOpp]       = useState<Opportunity | null>(null);
  const [showOnlyViable, setViable] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const SPOT_FEE   = 0.001;
  const FUT_FEE    = 0.0005;
  const ROUND_TRIP = (SPOT_FEE + FUT_FEE) * 2;
  const AMORTIZE   = 90;
  const netApr = (rateDecimal: number) => {
    const feeDrag = ROUND_TRIP / AMORTIZE;
    return (Math.abs(rateDecimal) - feeDrag) * 3 * 365 * 100;
  };

  const loadOpps = useCallback(async () => {
    setLoading(true);
    try {
      const [ratesRes, tickerRes] = await Promise.all([
        fetch("https://fapi.binance.com/fapi/v1/premiumIndex"),
        fetch("https://fapi.binance.com/fapi/v1/ticker/24hr"),
      ]);
      const rates   = await ratesRes.json()  as any[];
      const tickers = await tickerRes.json() as any[];

      const volMap = new Map<string, number>();
      for (const t of tickers) volMap.set(t.symbol, parseFloat(t.quoteVolume));

      const rows: Opportunity[] = rates
        .filter((r: any) => typeof r.symbol === "string" && r.symbol.endsWith("USDT"))
        .map((r: any) => {
          const rateRaw = parseFloat(r.lastFundingRate);
          const vol24h  = volMap.get(r.symbol) ?? 0;
          const apr     = netApr(rateRaw);
          return {
            symbol:      r.symbol,
            display:     r.symbol.replace("USDT", "/USDT"),
            base:        r.symbol.replace(/USDT$/, ""),
            rate:        rateRaw * 100,
            rawApr:      rateRaw * 3 * 365 * 100,
            netApr:      apr,
            direction:   rateRaw >= 0 ? "short_futures_long_spot" : "long_futures_short_spot",
            nextFunding: Number(r.nextFundingTime),
            vol24h,
            viable:      apr > 0 && vol24h > 20_000_000,
          } as Opportunity;
        })
        .filter((r) => Math.abs(r.rate) > 0.001)
        .sort((a, b) => b.netApr - a.netApr)
        .slice(0, 50);

      setOpps(rows);
    } catch {}
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetchWithAuth(`${API}/api/yield/positions`),
        fetchWithAuth(`${API}/api/yield/summary`),
      ]);
      if (pRes.ok) setPositions(await pRes.json());
      if (sRes.ok) setSummary(await sRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadOpps();
    loadPositions();
    const id = setInterval(loadOpps, 60_000);
    return () => clearInterval(id);
  }, [loadOpps, loadPositions]);

  async function handleCollect(id: string) {
    await fetchWithAuth(`${API}/api/yield/positions/${id}/collect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    loadPositions();
  }
  async function handleClose(id: string) {
    if (!confirm("Close this position and record final PnL?")) return;
    await fetchWithAuth(`${API}/api/yield/positions/${id}/close`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    loadPositions();
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete this position record?")) return;
    await fetchWithAuth(`${API}/api/yield/positions/${id}`, { method: "DELETE" });
    loadPositions();
  }

  const filtered = opportunities.filter((o) => {
    const q = query.toLowerCase();
    const matchQ = !q || o.display.toLowerCase().includes(q) || o.base.toLowerCase().includes(q);
    const matchV = !showOnlyViable || o.viable;
    return matchQ && matchV;
  });

  const openPositions   = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      {/* Hero Header */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0f1a]">
        <div className="relative p-6 lg:px-8 lg:py-7">
          {/* Background glow */}
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-72 rounded-full bg-[#e7b949]/5 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e7b949]/10">
                  <Percent className="h-3.5 w-3.5 text-[#e7b949]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e7b949]">Yield Engine</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white">Delta-Neutral Funding Yield</h1>
              <p className="mt-1.5 max-w-lg text-sm text-slate-400">
                Collect perpetual funding fees from both sides — price risk is hedged. Profitable regardless of market direction.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Market Neutral</span>
              </div>
              <button
                onClick={() => { loadOpps(); loadPositions(); }}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] px-3 py-2 text-xs text-slate-400 transition hover:text-white disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        {summary && (
          <div className="grid grid-cols-2 gap-px border-t border-white/[0.05] sm:grid-cols-4">
            {[
              { label: "Active Positions",  value: summary.openCount.toString(),            color: "text-white" },
              { label: "Active Notional",   value: fmtUsd(summary.activeNotional, 0),       color: "text-white" },
              { label: "Total Collected",   value: fmtUsd(summary.totalCollected),          color: "text-emerald-400" },
              { label: "Net PnL",           value: fmtUsd(summary.netPnl),                  color: summary.netPnl >= 0 ? "text-emerald-400" : "text-red-400" },
            ].map((k) => (
              <div key={k.label} className="bg-white/[0.015] p-4 text-center">
                <p className={`text-lg font-extrabold ${k.color}`}>{k.value}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{k.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works strip */}
      <div className="rounded-xl border border-[#e7b949]/10 bg-[#e7b949]/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <Zap className="h-4 w-4 shrink-0 text-[#e7b949]" />
          <span className="font-semibold text-[#e7b949]">Strategy:</span>
          <span>SHORT perpetual futures</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span>LONG spot (or vice versa)</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span>Price delta = 0</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-semibold text-emerald-400">Collect funding every 8 hours</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-1">
        {(["scanner", "positions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition ${
              tab === t
                ? "bg-[#e7b949] text-[#060b14]"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "scanner" ? `Opportunity Scanner` : `Positions (${openPositions.length})`}
          </button>
        ))}
      </div>

      {/* ── SCANNER TAB ── */}
      {tab === "scanner" && (
        <>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by symbol…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setViable((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                showOnlyViable
                  ? "border-[#e7b949]/30 bg-[#e7b949]/10 text-[#e7b949]"
                  : "border-white/[0.06] bg-[#0a0f1a] text-slate-500 hover:text-slate-300"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Viable Only
            </button>
            <span className="shrink-0 text-xs text-slate-600">{filtered.length} pairs</span>
          </div>

          {loading && opportunities.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0f1a]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["#","Symbol","Rate/8h","Net APR","Direction","24h Volume","Next Funding",""].map((h, i) => (
                        <th key={h+i} className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-600 ${
                          i >= 5 ? "hidden lg:table-cell" : ""
                        } ${i === 7 ? "text-right" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filtered.map((opp, idx) => {
                      const isPos = opp.rate >= 0;
                      return (
                        <tr key={opp.symbol} className="group transition hover:bg-white/[0.025]">
                          <td className="w-10 px-4 py-3 text-xs text-slate-600">{idx + 1}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <CoinIcon base={opp.base} size={24} />
                              <div>
                                <p className="font-mono text-sm font-bold leading-none text-white">{opp.display}</p>
                                {opp.viable && (
                                  <span className="text-[9px] font-bold text-emerald-400">● Viable</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1 font-mono text-sm font-bold ${
                              isPos ? "text-amber-400" : "text-sky-400"
                            }`}>
                              {isPos
                                ? <ArrowUpRight className="h-3.5 w-3.5" />
                                : <ArrowDownRight className="h-3.5 w-3.5" />}
                              {fmtPct(opp.rate)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`font-mono text-sm font-bold ${
                              opp.netApr > 20 ? "text-emerald-400" :
                              opp.netApr > 5  ? "text-emerald-500/70" :
                              opp.netApr > 0  ? "text-slate-400" : "text-red-400/70"
                            }`}>
                              {opp.netApr.toFixed(2)}%/yr
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
                              {opp.direction === "short_futures_long_spot"
                                ? "Short Fut / Long Spot"
                                : "Long Fut / Short Spot"}
                            </span>
                          </td>

                          <td className="hidden px-4 py-3 font-mono text-xs text-slate-400 lg:table-cell">
                            {fmtVol(opp.vol24h)}
                          </td>

                          <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 lg:table-cell">
                            {fmtCountdown(opp.nextFunding)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setOpenOpp(opp)}
                              className="rounded-lg border border-[#e7b949]/20 bg-[#e7b949]/[0.07] px-3 py-1.5 text-[11px] font-bold text-[#e7b949] opacity-0 transition group-hover:opacity-100 hover:bg-[#e7b949]/15"
                            >
                              <Plus className="inline h-3 w-3 -mt-0.5 mr-1" />
                              Enter
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && filtered.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-600">No results{query ? ` for "${query}"` : ""}</p>
              )}
            </div>
          )}

          {/* Risk note */}
          <div className="flex gap-2.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4 text-xs text-amber-300/70">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/60" />
            <span>
              Delta-neutral positions are not risk-free. Risks include: liquidation on the futures leg, funding rate flips, exchange counterparty risk, and slippage on entry/exit. Always allocate a responsible portion of capital.
            </span>
          </div>
        </>
      )}

      {/* ── POSITIONS TAB ── */}
      {tab === "positions" && (
        <>
          {openPositions.length === 0 && closedPositions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-[#0a0f1a] py-20 text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-slate-700" />
              <p className="text-sm font-semibold text-slate-500">No positions tracked yet</p>
              <p className="mt-1 text-xs text-slate-600">Go to the Scanner tab, find an opportunity, and click Enter.</p>
              <button
                onClick={() => setTab("scanner")}
                className="mt-4 rounded-lg border border-[#e7b949]/20 bg-[#e7b949]/[0.07] px-4 py-2 text-xs font-bold text-[#e7b949] transition hover:bg-[#e7b949]/15"
              >
                Open Scanner
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {openPositions.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Open Positions ({openPositions.length})</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {openPositions.map((p) => (
                      <PositionRow key={p.id} pos={p} onCollect={handleCollect} onClose={handleClose} onDelete={handleDelete} />
                    ))}
                  </div>
                </>
              )}
              {closedPositions.length > 0 && (
                <>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">Closed ({closedPositions.length})</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {closedPositions.map((p) => (
                      <PositionRow key={p.id} pos={p} onCollect={handleCollect} onClose={handleClose} onDelete={handleDelete} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Open position modal */}
      {openOpp && (
        <OpenModal
          opp={openOpp}
          onClose={() => setOpenOpp(null)}
          onOpened={() => { loadPositions(); setTab("positions"); }}
        />
      )}
    </div>
  );
}
