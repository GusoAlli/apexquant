"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, type IChartApi } from "lightweight-charts";
import {
  ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp,
  FlaskConical, Loader2, Play, TrendingDown, TrendingUp,
  AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type BacktestTrade = {
  openTime:   number;
  closeTime:  number;
  direction:  "BUY" | "SELL";
  openPrice:  number;
  closePrice: number;
  sl:         number;
  tp:         number;
  pnl:        number;
  closedBy:   "TP" | "SL" | "END";
};

type BacktestResult = {
  symbol:         string;
  interval:       string;
  candleCount:    number;
  initialBalance: number;
  finalBalance:   number;
  netPnl:         number;
  netPnlPct:      number;
  totalTrades:    number;
  wins:           number;
  losses:         number;
  winRate:        number;
  profitFactor:   number;
  maxDrawdown:    number;
  sharpeRatio:    number;
  avgWin:         number;
  avgLoss:        number;
  equityCurve:    Array<{ time: number; value: number }>;
  trades:         BacktestTrade[];
};

// ── Equity chart ──────────────────────────────────────────────────────────────

function EquityChart({ data }: { data: Array<{ time: number; value: number }> }) {
  const ref     = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || data.length < 2) return;

    const chart = createChart(ref.current, {
      width:  ref.current.clientWidth,
      height: 260,
      layout:    { background: { color: "transparent" }, textColor: "#64748b" },
      grid:      { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      crosshair: { mode: 1 },
    });

    const series = chart.addSeries(LineSeries, { color: "#e7b949", lineWidth: 2, priceLineVisible: false });
    series.setData(data.map(d => ({ time: d.time as any, value: d.value })));
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const onResize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center">
        <p className="text-sm text-slate-600">No trades to chart.</p>
      </div>
    );
  }

  return <div ref={ref} className="h-[260px] w-full rounded-xl" />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({
  label, value, sub, color = "text-white",
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Win-rate bar ──────────────────────────────────────────────────────────────

function WinBar({ wins, losses }: { wins: number; losses: number }) {
  const total  = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex text-xs">
        <span className="flex-1 font-bold text-emerald-400">{wins} wins</span>
        <span className="font-bold text-red-400">{losses} losses</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-red-500/20">
        <div className="bg-emerald-500 transition-all" style={{ width: `${winPct}%` }} />
      </div>
    </div>
  );
}

// ── Trade row ─────────────────────────────────────────────────────────────────

function TradeRow({ t, i }: { t: BacktestTrade; i: number }) {
  const ts = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  const pos = t.pnl > 0;

  return (
    <tr className="border-b border-white/[0.03] transition hover:bg-white/[0.02]">
      <td className="py-3 pr-4 text-xs tabular-nums text-slate-600">{i + 1}</td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
          t.direction === "BUY"
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-red-500/10 text-red-400"
        }`}>
          {t.direction === "BUY"
            ? <ArrowUpRight className="h-3 w-3" />
            : <ArrowDownRight className="h-3 w-3" />}
          {t.direction}
        </span>
      </td>
      <td className="py-3 pr-4 font-mono text-xs text-slate-400">{ts(t.openTime)}</td>
      <td className="py-3 pr-4 font-mono text-xs text-slate-400">{ts(t.closeTime)}</td>
      <td className="py-3 pr-4 font-mono text-xs text-slate-400">{t.openPrice.toLocaleString()}</td>
      <td className="py-3 pr-4 font-mono text-xs text-slate-400">{t.closePrice.toLocaleString()}</td>
      <td className="py-3 pr-4">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          t.closedBy === "TP"  ? "bg-emerald-500/10 text-emerald-400" :
          t.closedBy === "SL"  ? "bg-red-500/10 text-red-400" :
          "bg-white/[0.06] text-slate-500"
        }`}>
          {t.closedBy}
        </span>
      </td>
      <td className={`py-3 text-right font-mono text-sm font-bold ${pos ? "text-emerald-400" : "text-red-400"}`}>
        {pos ? "+" : "-"}${Math.abs(t.pnl).toFixed(2)}
      </td>
    </tr>
  );
}

// ── Symbols / intervals config ────────────────────────────────────────────────

const SYMBOLS   = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT"];
const INTERVALS = [
  { label: "15m", value: "15m" },
  { label: "1h",  value: "1h"  },
  { label: "4h",  value: "4h"  },
  { label: "1d",  value: "1d"  },
];
const CANDLE_COUNTS = [100, 200, 300, 500];

type FormState = {
  symbol:         string;
  interval:       string;
  candleCount:    number;
  initialBalance: number;
  riskPerTrade:   number;
  maxDailyLoss:   number;
  maxDrawdown:    number;
  minRR:          number;
};

const DEFAULT_FORM: FormState = {
  symbol:         "BTCUSDT",
  interval:       "1h",
  candleCount:    300,
  initialBalance: 10000,
  riskPerTrade:   1,
  maxDailyLoss:   3,
  maxDrawdown:    10,
  minRR:          1.5,
};

// ── Exchange Backtest view ────────────────────────────────────────────────────

function ExchangeBacktest() {
  const [form, setForm]       = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<BacktestResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showAdv, setShowAdv] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchWithAuth(`${API}/api/backtest/run`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Backtest failed");
      setResult(data as BacktestResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const pos = result ? result.netPnl >= 0 : false;

  return (
    <div className="space-y-6 py-6">

      {/* ── Header ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Exchange · Crypto</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Backtesting Engine</h1>
        <p className="mt-2 text-sm text-slate-400">
          Walk-forward simulation on Binance historical OHLCV data using the live Decision Engine.
        </p>
      </div>

      {/* ── Config form ── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <h2 className="mb-5 text-sm font-bold text-white">Backtest Configuration</h2>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Symbol */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-600">Symbol</label>
            <select
              value={form.symbol}
              onChange={e => set("symbol", e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-600">Timeframe</label>
            <div className="flex gap-1">
              {INTERVALS.map(iv => (
                <button key={iv.value} onClick={() => set("interval", iv.value)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${
                    form.interval === iv.value
                      ? "border-[#e7b949]/30 bg-[#e7b949]/10 text-[#e7b949]"
                      : "border-white/[0.07] bg-white/[0.03] text-slate-500 hover:text-slate-300"
                  }`}>
                  {iv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Candle count */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-600">Candles</label>
            <div className="flex gap-1">
              {CANDLE_COUNTS.map(c => (
                <button key={c} onClick={() => set("candleCount", c)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${
                    form.candleCount === c
                      ? "border-[#e7b949]/30 bg-[#e7b949]/10 text-[#e7b949]"
                      : "border-white/[0.07] bg-white/[0.03] text-slate-500 hover:text-slate-300"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-600">Starting Balance ($)</label>
            <input
              type="number" min={100}
              value={form.initialBalance}
              onChange={e => set("initialBalance", Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Advanced risk */}
        <button
          onClick={() => setShowAdv(v => !v)}
          className="mt-5 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          {showAdv ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Advanced risk settings
        </button>

        {showAdv && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "riskPerTrade" as const, label: "Risk / Trade (%)", min: 0.1, max: 10,  step: 0.1 },
              { key: "maxDailyLoss" as const, label: "Max Daily Loss (%)", min: 1,  max: 20,  step: 0.5 },
              { key: "maxDrawdown"  as const, label: "Max Drawdown (%)",   min: 1,  max: 50,  step: 1   },
              { key: "minRR"        as const, label: "Min R:R",            min: 0.5, max: 5,  step: 0.1 },
            ].map(f => (
              <div key={f.key}>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  {f.label}
                </label>
                <input
                  type="number" min={f.min} max={f.max} step={f.step}
                  value={form[f.key]}
                  onChange={e => set(f.key, Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            ))}
          </div>
        )}

        {/* Run */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-[#0d1520] transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #f7d36d 0%, #d4a017 100%)", boxShadow: "0 4px 20px -6px rgba(231,185,73,0.6)" }}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
              : <><Play className="h-4 w-4" />Run Backtest</>}
          </button>
          {loading && <p className="animate-pulse text-xs text-slate-500">Fetching candles and simulating…</p>}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <>
          {/* Meta banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-5 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              {result.symbol} · {result.interval} · {result.candleCount} candles
            </span>
            <span className="text-sm text-slate-500">
              ${result.initialBalance.toLocaleString()} → ${result.finalBalance.toLocaleString()}
            </span>
            <span className={`ml-auto text-sm font-extrabold ${pos ? "text-emerald-400" : "text-red-400"}`}>
              {pos ? "+" : ""}{result.netPnlPct}% return
            </span>
          </div>

          {/* KPI row 1 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Net P&L"
              value={`${pos ? "+" : "-"}$${Math.abs(result.netPnl).toFixed(2)}`}
              sub={`${pos ? "+" : ""}${result.netPnlPct}%`}
              color={pos ? "text-emerald-400" : "text-red-400"}
            />
            <Stat
              label="Win Rate"
              value={`${result.winRate}%`}
              sub={`${result.wins}W / ${result.losses}L`}
              color={result.winRate >= 50 ? "text-emerald-400" : "text-slate-300"}
            />
            <Stat
              label="Profit Factor"
              value={result.profitFactor >= 99 ? "∞" : result.profitFactor.toFixed(2)}
              sub="gross win / gross loss"
              color={result.profitFactor >= 1.5 ? "text-emerald-400" : result.profitFactor >= 1 ? "text-[#e7b949]" : "text-red-400"}
            />
            <Stat
              label="Max Drawdown"
              value={`${result.maxDrawdown}%`}
              sub="peak-to-trough"
              color={result.maxDrawdown < 5 ? "text-emerald-400" : result.maxDrawdown < 15 ? "text-[#e7b949]" : "text-red-400"}
            />
          </div>

          {/* KPI row 2 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Sharpe Ratio"
              value={result.sharpeRatio.toFixed(2)}
              sub="annualized"
              color={result.sharpeRatio >= 1 ? "text-emerald-400" : "text-slate-300"}
            />
            <Stat label="Total Trades" value={result.totalTrades.toString()} />
            <Stat label="Avg Win"  value={`$${result.avgWin.toFixed(2)}`}  color="text-emerald-400" />
            <Stat label="Avg Loss" value={`$${result.avgLoss.toFixed(2)}`} color="text-red-400" />
          </div>

          {/* Equity curve */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-bold text-white">Equity Curve</h2>
              <span className="rounded-full bg-[#e7b949]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#e7b949]">
                {result.totalTrades} trade{result.totalTrades !== 1 ? "s" : ""}
              </span>
            </div>
            <EquityChart data={result.equityCurve} />
            {result.totalTrades > 0 && <WinBar wins={result.wins} losses={result.losses} />}
          </div>

          {/* Trade table */}
          {result.trades.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
              <h2 className="mb-4 text-sm font-bold text-white">Trade History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-left text-[10px] uppercase tracking-widest text-slate-600">
                      <th className="pb-3 pr-4 font-medium">#</th>
                      <th className="pb-3 pr-4 font-medium">Dir</th>
                      <th className="pb-3 pr-4 font-medium">Open</th>
                      <th className="pb-3 pr-4 font-medium">Close</th>
                      <th className="pb-3 pr-4 font-medium">Entry</th>
                      <th className="pb-3 pr-4 font-medium">Exit</th>
                      <th className="pb-3 pr-4 font-medium">By</th>
                      <th className="pb-3 text-right font-medium">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => <TradeRow key={i} t={t} i={i} />)}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.08]">
                      <td colSpan={7} className="pt-3 text-xs text-slate-600">
                        {result.totalTrades} trade{result.totalTrades !== 1 ? "s" : ""}
                      </td>
                      <td className={`pt-3 text-right font-extrabold ${pos ? "text-emerald-400" : "text-red-400"}`}>
                        {pos ? "+" : "-"}${Math.abs(result.netPnl).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-[#0a0f1a] py-14 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm font-bold text-white">No signals fired</p>
              <p className="mt-1 max-w-sm text-xs text-slate-600">
                The engine found no confirmed entries over this period.
                Try a different symbol, longer candle range, or lower the confirmation threshold.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Forex coming soon ─────────────────────────────────────────────────────────

function ForexBacktest() {
  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Forex / CFD</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Backtesting Engine</h1>
        <p className="mt-2 text-sm text-slate-400">
          Historical strategy simulation for Forex and CFD instruments.
        </p>
      </div>
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] p-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <FlaskConical className="h-6 w-6 text-slate-500" />
        </div>
        <h2 className="text-base font-bold text-white">Forex Backtester</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          MT5 historical tick data integration is in development.
          Switch to Exchange mode to backtest the Decision Engine on crypto pairs today.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-slate-600">
          {["Historical Ticks", "Spread Modeling", "Multi-TF Confirm"].map(f => (
            <div key={f} className="flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <TrendingDown className="h-3 w-3 shrink-0 text-slate-700" />
              {f}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-full border border-[#e7b949]/20 bg-[#e7b949]/[0.06] px-4 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-[#e7b949]" />
          <span className="text-xs font-bold text-[#e7b949]">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BacktestPage() {
  const mode = useMode();
  return mode === "forex" ? <ForexBacktest /> : <ExchangeBacktest />;
}
