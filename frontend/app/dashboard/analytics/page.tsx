"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createChart, LineSeries, type IChartApi } from "lightweight-charts";
import {
  Activity, BarChart3, RefreshCw, ShieldAlert,
  TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type Metric   = { timestamp: string; equity: number | null; balance: number | null };
type Position = { symbol: string; type: string; profit: number; volume: number };
type Account  = { id: string; accountNumber: string; broker: string; balance: number | null; equity: number | null; positions: Position[] };
type Signal   = { id: string; pair: string; direction: string; strength: number; timeframe: string; model: string; entry: number; tp: number; sl: number; status: string; createdAt: string };
type BotStatus = { enabled: boolean; openTrades: number; totalTrades: number; winRate: number | null; recentTrades: Array<{ symbol: string; action: string; pnl: number | null; status: string }> };

function fmt2(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPnl(n: number) { return (n >= 0 ? "+" : "") + "$" + fmt2(Math.abs(n)); }

// ── Equity Chart ──────────────────────────────────────────────────────────────

function EquityChart({ metrics }: { metrics: Metric[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || metrics.length === 0) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 220,
      layout: { background: { color: "transparent" }, textColor: "#64748b" },
      grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
      crosshair: { mode: 1 },
    });

    const equitySeries = chart.addSeries(LineSeries, { color: "#e7b949", lineWidth: 2, priceLineVisible: false });
    const balanceSeries = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, lineStyle: 2, priceLineVisible: false });

    const eq = metrics
      .filter(m => m.equity != null)
      .map(m => ({ time: Math.floor(new Date(m.timestamp).getTime() / 1000) as any, value: m.equity! }));
    const bal = metrics
      .filter(m => m.balance != null)
      .map(m => ({ time: Math.floor(new Date(m.timestamp).getTime() / 1000) as any, value: m.balance! }));

    if (eq.length > 0)  equitySeries.setData(eq);
    if (bal.length > 0) balanceSeries.setData(bal);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const onResize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [metrics]);

  if (metrics.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl bg-white/[0.02]">
        <p className="text-xs text-slate-600">No equity data yet — EA must be running for data to accumulate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-[220px] w-full rounded-xl" />
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#e7b949]" /> Equity</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-blue-500" /> Balance</span>
      </div>
    </div>
  );
}

// ── Symbol Bar ────────────────────────────────────────────────────────────────

function SymbolBar({ symbol, profit, count, maxAbs }: { symbol: string; profit: number; count: number; maxAbs: number }) {
  const pct = (Math.abs(profit) / Math.max(maxAbs, 0.01)) * 100;
  const pos = profit >= 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right font-mono text-sm font-bold text-white">{symbol}</span>
      <div className="relative flex-1 h-4 rounded-full bg-white/[0.04] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${pos ? "bg-emerald-500/50" : "bg-red-500/50"}`}
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1 w-24 justify-end">
        {pos ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
        <span className={`text-xs font-bold font-mono ${pos ? "text-emerald-400" : "text-red-400"}`}>{fmtPnl(profit)}</span>
      </div>
      <span className="w-10 text-right text-[10px] text-slate-600">{count}×</span>
    </div>
  );
}

// ── Kpi Card ──────────────────────────────────────────────────────────────────

function Kpi({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Forex Analytics ───────────────────────────────────────────────────────────

function ForexAnalytics() {
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [metrics, setMetrics]     = useState<Metric[]>([]);
  const [signals, setSignals]     = useState<Signal[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [days, setDays]           = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, metRes, sigRes, botRes] = await Promise.all([
        fetchWithAuth(`${API}/api/mt5/accounts`),
        fetchWithAuth(`${API}/api/mt5/metrics?days=${days}`),
        fetchWithAuth(`${API}/api/signals?status=ALL`),
        fetchWithAuth(`${API}/api/bot/status`),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (metRes.ok) setMetrics(await metRes.json());
      if (sigRes.ok) setSignals(await sigRes.json());
      if (botRes.ok) setBotStatus(await botRes.json());
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const positions  = accounts.flatMap(a => a.positions ?? []);
  const totalBal   = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalEq    = accounts.reduce((s, a) => s + (a.equity ?? 0), 0);
  const floatPnl   = positions.reduce((s, p) => s + p.profit, 0);
  const drawdown   = totalBal > 0 ? ((totalBal - totalEq) / totalBal) * 100 : 0;

  // Symbol breakdown from positions
  const bySymbol: Record<string, { profit: number; count: number }> = {};
  for (const p of positions) {
    if (!bySymbol[p.symbol]) bySymbol[p.symbol] = { profit: 0, count: 0 };
    bySymbol[p.symbol].profit += p.profit;
    bySymbol[p.symbol].count++;
  }
  const sorted = Object.entries(bySymbol).sort((a, b) => Math.abs(b[1].profit) - Math.abs(a[1].profit));
  const maxAbs = sorted[0]?.[1] ? Math.abs(sorted[0][1].profit) : 1;

  // Bot signal breakdown
  const botSignals = signals.filter(s => s.model?.startsWith("Bot:"));
  const buySigs    = botSignals.filter(s => s.direction === "BUY").length;
  const sellSigs   = botSignals.filter(s => s.direction === "SELL").length;
  const avgConf    = botSignals.length ? Math.round(botSignals.reduce((s, sg) => s + sg.strength, 0) / botSignals.length) : null;

  if (loading) return (
    <div className="flex justify-center py-20">
      <RefreshCw className="h-5 w-5 animate-spin text-slate-600" />
    </div>
  );

  const hasData = accounts.length > 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Balance"    value={hasData ? "$" + fmt2(totalBal) : "—"} />
        <Kpi label="Equity"     value={hasData ? "$" + fmt2(totalEq)  : "—"} />
        <Kpi label="Float P&L"  value={hasData ? fmtPnl(floatPnl) : "—"}
          color={floatPnl >= 0 ? "text-emerald-400" : "text-red-400"} />
        <Kpi label="Drawdown"   value={hasData ? drawdown.toFixed(2) + "%" : "—"}
          color={drawdown > 5 ? "text-red-400" : drawdown > 2 ? "text-yellow-400" : "text-emerald-400"}
          sub={hasData ? "from peak balance" : undefined} />
      </div>

      {/* Equity Curve */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-[#e7b949]" />
            <p className="text-sm font-bold text-white">Equity Curve</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-xs font-bold transition ${days === d ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-white"}`}>
                {d}D
              </button>
            ))}
          </div>
        </div>
        <EquityChart metrics={metrics} />
      </div>

      {/* Bot Performance + Signal Distribution */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bot Performance */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-4 w-4 text-[#e7b949]" />
            <p className="text-sm font-bold text-white">Bot Performance</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Total Bot Trades", value: botStatus?.totalTrades ?? 0 },
              { label: "Open Trades",      value: botStatus?.openTrades ?? 0 },
              { label: "Win Rate",         value: botStatus?.winRate != null ? botStatus.winRate + "%" : "—" },
              { label: "Bot Signals",      value: botSignals.length },
              { label: "Avg Confidence",   value: avgConf != null ? avgConf + "%" : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
          {!botStatus?.enabled && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.05] px-3 py-2 text-xs text-yellow-400">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Bot is currently stopped
            </div>
          )}
        </div>

        {/* Signal Distribution */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <div className="mb-4 flex items-center gap-3">
            <Zap className="h-4 w-4 text-[#e7b949]" />
            <p className="text-sm font-bold text-white">Signal Distribution</p>
          </div>
          {botSignals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="mb-2 h-6 w-6 text-slate-700" />
              <p className="text-xs text-slate-600">No bot signals generated yet.</p>
              <p className="mt-1 text-[11px] text-slate-700">Start the bot and wait for the engine to fire.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* BUY vs SELL bar */}
              <div>
                <div className="mb-1.5 flex justify-between text-[11px] text-slate-500">
                  <span className="text-emerald-400 font-bold">BUY {buySigs}</span>
                  <span className="text-red-400 font-bold">SELL {sellSigs}</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="bg-emerald-500/60 transition-all" style={{ width: `${(buySigs / botSignals.length) * 100}%` }} />
                  <div className="bg-red-500/60 transition-all flex-1" />
                </div>
              </div>

              {/* Signal by pair */}
              <div className="space-y-2 pt-1">
                {Object.entries(
                  botSignals.reduce((acc, s) => {
                    if (!acc[s.pair]) acc[s.pair] = { buy: 0, sell: 0 };
                    if (s.direction === "BUY") acc[s.pair].buy++;
                    else acc[s.pair].sell++;
                    return acc;
                  }, {} as Record<string, { buy: number; sell: number }>)
                ).map(([pair, { buy, sell }]) => (
                  <div key={pair} className="flex items-center gap-2">
                    <span className="w-16 text-right font-mono text-xs font-bold text-white">{pair}</span>
                    {buy > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{buy} BUY</span>}
                    {sell > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">{sell} SELL</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Symbol Breakdown */}
      {sorted.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <div className="mb-4 flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-[#e7b949]" />
            <p className="text-sm font-bold text-white">P&L by Symbol</p>
            <span className="ml-auto text-[10px] text-slate-600">Open positions only</span>
          </div>
          <div className="space-y-3">
            {sorted.map(([sym, data]) => (
              <SymbolBar key={sym} symbol={sym} profit={data.profit} count={data.count} maxAbs={maxAbs} />
            ))}
          </div>
        </div>
      )}

      {/* Signal History */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-4 flex items-center gap-3">
          <Zap className="h-4 w-4 text-[#e7b949]" />
          <p className="text-sm font-bold text-white">Signal History</p>
          <span className="ml-auto text-[10px] text-slate-600">Last {Math.min(signals.length, 20)}</span>
        </div>
        {signals.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600">No signals generated yet. Run the engine or enable the bot.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.05] text-left text-slate-600 uppercase tracking-widest">
                  <th className="pb-2 font-medium">Pair</th>
                  <th className="pb-2 font-medium">Dir</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">TF</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {signals.slice(0, 20).map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 font-mono font-bold text-white">{s.pair}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${s.direction === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {s.direction}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full bg-[#e7b949]/60 rounded-full" style={{ width: `${s.strength}%` }} />
                        </div>
                        <span className="text-slate-400">{s.strength}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-slate-500">{s.timeframe}</td>
                    <td className="py-2 max-w-[160px] truncate text-slate-500">{s.model}</td>
                    <td className="py-2 text-right text-slate-600">
                      {new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* No accounts state */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-12 text-center">
          <BarChart3 className="mb-3 h-7 w-7 text-slate-700" />
          <p className="text-sm font-semibold text-white">Connect MT5 to see full analytics</p>
          <p className="mt-1 text-xs text-slate-600">Balance, equity, and position data will appear here.</p>
          <Link href="/dashboard/accounts"
            className="mt-4 rounded-xl px-5 py-2 text-sm font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            Connect MT5
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Exchange Analytics placeholder ────────────────────────────────────────────

function ExchangeAnalytics() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-16 text-center">
      <BarChart3 className="mb-3 h-7 w-7 text-slate-600" />
      <p className="text-sm font-semibold text-white">Exchange Analytics</p>
      <p className="mt-1 text-xs text-slate-600">Coming soon — connect exchange accounts to see trade analytics.</p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const mode = useMode();
  return (
    <div className="space-y-5 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
          {mode === "forex" ? "Forex / CFD" : "Exchange"} · Analytics
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Quant Analytics</h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "forex"
            ? "Equity curve, bot performance, and signal attribution across connected MT5 accounts."
            : "Position breakdown and P&L attribution across all connected exchanges."}
        </p>
      </div>
      {mode === "forex" ? <ForexAnalytics /> : <ExchangeAnalytics />}
    </div>
  );
}
