"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, ChevronRight, Pause, Play, RefreshCw, Settings2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
  return { Authorization: `Bearer ${t ?? ""}`, "Content-Type": "application/json" };
}

type EngineStatus = {
  running: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  error: string | null;
};

type PerformanceSummary = {
  strategyName: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpe: number;
};

export default function AdminEnginePage() {
  const [status,      setStatus]      = useState<EngineStatus | null>(null);
  const [perf,        setPerf]        = useState<PerformanceSummary[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [actionMsg,   setActionMsg]   = useState("");
  const [intervalMin, setIntervalMin] = useState(60);
  const [symbols,     setSymbols]     = useState("BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT");

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, pRes] = await Promise.all([
      fetch(`${API}/api/engine/status`,      { headers: authHeaders() }),
      fetch(`${API}/api/engine/performance`, { headers: authHeaders() }),
    ]);
    if (sRes.ok) setStatus(await sRes.json());
    if (pRes.ok) setPerf(await pRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function triggerRun() {
    setActionMsg("Running engine...");
    const res = await fetch(`${API}/api/engine/run`, { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
    const data = await res.json();
    setActionMsg(res.ok ? `Done — ${data.ran} signals generated` : data.message ?? "Failed");
    load();
  }

  async function startScheduler() {
    const res = await fetch(`${API}/api/engine/scheduler/start`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ intervalMinutes: intervalMin }),
    });
    const data = await res.json();
    setActionMsg(data.message ?? "Started");
    load();
  }

  async function stopScheduler() {
    const res = await fetch(`${API}/api/engine/scheduler/stop`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    setActionMsg(data.message ?? "Stopped");
    load();
  }

  async function reconfigure() {
    const syms = symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    const res = await fetch(`${API}/api/engine/reconfigure`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        symbols: syms,
        interval: "1h",
        higherTfInterval: "4h",
        riskConfig: { riskPerTrade: 1, maxDailyLoss: 3, maxDrawdown: 10, maxOpenPositions: 5, minRR: 1.5 },
        topNAssets: 3,
        confirmationThreshold: 3,
      }),
    });
    const data = await res.json();
    setActionMsg(data.message ?? "Reconfigured");
    load();
  }

  function fmt(ts: number | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Engine Control</h1>
        </div>
        <button onClick={load} disabled={loading}
          className="rounded-lg border border-white/[0.08] p-2.5 text-slate-500 transition hover:text-white disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/[0.05] px-4 py-3 text-sm text-[#e7b949]">
          {actionMsg}
        </div>
      )}

      {/* Status */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Engine Status</p>
        {status ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">State</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.running ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                <span className="text-sm font-bold text-white">{status.running ? "Running" : "Idle"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Run</p>
              <p className="mt-1 text-sm font-bold text-white">{fmt(status.lastRunAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Next Run</p>
              <p className="mt-1 text-sm font-bold text-white">{fmt(status.nextRunAt)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Loading…</p>
        )}
        {status?.error && (
          <p className="mt-3 text-xs text-red-400">Last error: {status.error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button onClick={triggerRun}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-[#e7b949]/20 hover:bg-[#e7b949]/[0.03]">
          <div>
            <p className="text-sm font-bold text-white">Manual Run</p>
            <p className="mt-0.5 text-xs text-slate-500">Run the full engine once now</p>
          </div>
          <Play className="h-5 w-5 text-[#e7b949]" />
        </button>
        <button onClick={startScheduler}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-emerald-500/20 hover:bg-emerald-500/[0.03]">
          <div>
            <p className="text-sm font-bold text-white">Start Scheduler</p>
            <p className="mt-0.5 text-xs text-slate-500">Auto-run every {intervalMin}m</p>
          </div>
          <ChevronRight className="h-5 w-5 text-emerald-400" />
        </button>
        <button onClick={stopScheduler}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition hover:border-red-500/20 hover:bg-red-500/[0.03]">
          <div>
            <p className="text-sm font-bold text-white">Stop Scheduler</p>
            <p className="mt-0.5 text-xs text-slate-500">Halt automatic runs</p>
          </div>
          <Pause className="h-5 w-5 text-red-400" />
        </button>
      </div>

      {/* Config */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#e7b949]">
          <Settings2 className="h-3.5 w-3.5" /> Configuration
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs text-slate-500">Symbols (comma-separated)</label>
            <input value={symbols} onChange={e => setSymbols(e.target.value)}
              className="apex-input w-full text-sm font-mono" />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs text-slate-500">Scheduler Interval (min)</label>
            <input type="number" value={intervalMin} onChange={e => setIntervalMin(Number(e.target.value))}
              min={5} max={1440} className="apex-input w-full text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={reconfigure}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14] transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Performance */}
      {perf.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Strategy Performance</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-slate-500">
                  {["Strategy","Trades","Win%","PF","Avg Win","Avg Loss","Max DD","Sharpe"].map(h => (
                    <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {perf.map((p, i) => (
                  <tr key={i} className="text-slate-300">
                    <td className="py-2 pr-4 font-medium text-white">{p.strategyName}</td>
                    <td className="py-2 pr-4">{p.totalTrades}</td>
                    <td className="py-2 pr-4">{(p.winRate * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4">{p.profitFactor.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-emerald-400">{p.avgWin.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-red-400">{p.avgLoss.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-orange-400">{p.maxDrawdown.toFixed(1)}%</td>
                    <td className="py-2 pr-4">{p.sharpe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
