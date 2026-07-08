"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createChart, LineSeries, type IChartApi, type LineData } from "lightweight-charts";
import { RefreshCw, TrendingUp, BarChart3, Activity, Target } from "lucide-react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type MetricPoint = { timestamp: string; equity: number | null; balance: number | null };
type MT5Account  = { id: string; accountNumber: string; broker: string };

function fmt(n: number | null, prefix = "$"): string {
  if (n === null) return "—";
  return prefix + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, sub, tone = "neutral" }: {
  label: string; value: string; sub?: string;
  tone?: "gold" | "green" | "red" | "blue" | "neutral";
}) {
  const cls = {
    gold: "border-[#e7b949]/20 bg-[#e7b949]/[0.04]",
    green: "border-emerald-500/20 bg-emerald-500/[0.04]",
    red: "border-red-500/20 bg-red-500/[0.04]",
    blue: "border-blue-500/20 bg-blue-500/[0.04]",
    neutral: "border-white/[0.07] bg-white/[0.02]",
  }[tone];
  const val = {
    gold: "text-[#e7b949]", green: "text-emerald-400", red: "text-red-400",
    blue: "text-blue-400", neutral: "text-white",
  }[tone];
  return (
    <div className={`rounded-xl border p-5 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${val}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

function EquityChart({ data }: { data: LineData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    chart.current?.remove();
    const c = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 320,
      layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true },
      crosshair: { mode: 1 },
    });
    const series = c.addSeries(LineSeries, { color: "#e7b949", lineWidth: 2, priceLineVisible: false });
    series.setData(data);
    c.timeScale().fitContent();
    chart.current = c;
    const onResize = () => ref.current && c.applyOptions({ width: ref.current.clientWidth });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); c.remove(); };
  }, [data]);

  if (data.length === 0) return (
    <div className="flex h-[320px] items-center justify-center text-sm text-slate-600">
      No metric data yet — connect MT5 via{" "}
      <Link href="/dashboard/ea" className="ml-1 text-[#e7b949] hover:underline">Bots / EA</Link>.
    </div>
  );

  return <div ref={ref} className="h-[320px] w-full" />;
}

function computeStats(points: MetricPoint[]) {
  const equities = points.map((p) => p.equity ?? 0).filter((v) => v > 0);
  if (equities.length < 2) return null;

  const first = equities[0];
  const last  = equities[equities.length - 1];
  const pnl   = last - first;
  const pct   = ((last - first) / first) * 100;

  let peak = first;
  let maxDD = 0;
  for (const e of equities) {
    if (e > peak) peak = e;
    const dd = (peak - e) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe (simplified: mean daily return / std)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equities.length; i++) {
    dailyReturns.push((equities[i] - equities[i - 1]) / equities[i - 1]);
  }
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const std  = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length) || 1;
  const sharpe = (mean / std) * Math.sqrt(252);

  return { pnl, pct, maxDD: maxDD * 100, sharpe, first, last };
}

export default function PerformancePage() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<string>("all");
  const [days, setDays]         = useState(30);
  const [points, setPoints]     = useState<MetricPoint[]>([]);
  const [loading, setLoading]   = useState(true);

  // Load MT5 account list
  useEffect(() => {
    fetch(`${API}/api/mt5/accounts`, { headers: getAuthHeaders() })
      .then((r) => r.json()).then(setAccounts).catch(() => {});
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ days: days.toString() });
    if (selectedAcc !== "all") q.set("accountId", selectedAcc);
    const res = await fetch(`${API}/api/mt5/metrics?${q}`, { headers: getAuthHeaders() });
    if (res.ok) setPoints(await res.json());
    setLoading(false);
  }, [selectedAcc, days]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Build chart data — one point per timestamp, use equity
  const chartData: LineData[] = points
    .filter((p) => p.equity !== null)
    .map((p) => ({
      time: (new Date(p.timestamp).getTime() / 1000) as any,
      value: p.equity!,
    }));

  const stats = computeStats(points);

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Performance</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Performance Lab</h1>
            <p className="mt-2 text-sm text-slate-400">Equity curve and analytics from your connected MT5 accounts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Account selector */}
            {accounts.length > 0 && (
              <select value={selectedAcc} onChange={(e) => setSelectedAcc(e.target.value)}
                className="apex-input text-sm">
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>#{a.accountNumber} — {a.broker}</option>
                ))}
              </select>
            )}
            {/* Period selector */}
            <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 gap-1">
              {([7, 30, 90] as const).map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${days === d ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-white"}`}>
                  {d}D
                </button>
              ))}
            </div>
            <button onClick={loadMetrics} disabled={loading}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net P&L" tone={!stats ? "neutral" : stats.pnl >= 0 ? "green" : "red"}
          value={stats ? (stats.pnl >= 0 ? "+" : "") + fmt(stats.pnl) : "—"}
          sub={stats ? `${stats.pct >= 0 ? "+" : ""}${stats.pct.toFixed(2)}%` : "No data"} />
        <StatCard label="Max Drawdown" tone={!stats ? "neutral" : stats.maxDD > 10 ? "red" : "neutral"}
          value={stats ? `-${stats.maxDD.toFixed(2)}%` : "—"} sub="Peak-to-trough" />
        <StatCard label="Sharpe Ratio" tone={!stats ? "neutral" : stats.sharpe > 1 ? "green" : "neutral"}
          value={stats ? stats.sharpe.toFixed(2) : "—"} sub="Annualised estimate" />
        <StatCard label="Current Equity" tone="gold"
          value={stats ? fmt(stats.last) : "—"} sub={stats ? `Started at ${fmt(stats.first)}` : "Connect MT5 first"} />
      </div>

      {/* Equity curve */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Equity Curve</p>
            <p className="mt-0.5 text-sm text-slate-500">Account equity over the selected period</p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />}
        </div>
        <EquityChart data={chartData} />
      </div>
    </div>
  );
}
