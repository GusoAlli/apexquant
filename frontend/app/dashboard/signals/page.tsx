"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Brain, Clock, RefreshCw,
  WifiOff, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Signal = {
  id: string;
  pair: string;
  direction: string;
  entry: number;
  tp: number;
  sl: number;
  strength: number;
  timeframe: string;
  model: string;
  status: string;
  pips: number | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function StrengthBar({ value }: { value: number }) {
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#e7b949" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-white/[0.07]">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function SignalsPage() {
  const mode = useMode();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading]  = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWithAuth(`${API}/api/signals`);
    if (res.ok) setSignals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live signal via SSE
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    const es = new EventSource(`${API}/api/notifications/stream?token=${token}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "signal") setSignals((prev) => [msg.data, ...prev]);
      } catch {}
    };
    return () => es.close();
  }, []);

  const filtered = signals.filter((s) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return s.status === "ACTIVE";
    return s.status !== "ACTIVE";
  });

  const winRate = (() => {
    const closed = signals.filter((s) => s.status === "TP_HIT" || s.status === "SL_HIT");
    const wins   = closed.filter((s) => s.status === "TP_HIT");
    return closed.length ? Math.round((wins.length / closed.length) * 100) : null;
  })();

  const activeCount = signals.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
              {mode === "forex" ? "Forex / CFD · AI" : "Exchange · AI"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">
              {mode === "forex" ? "Forex Signal Feed" : "Crypto Signals"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "forex"
                ? "Machine-learning generated signals for Forex pairs, Metals, and CFD Indices."
                : "AI-powered signals for crypto spot and futures markets."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">{activeCount} Active</span>
              </div>
            )}
            <button onClick={load} disabled={loading}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-slate-400 hover:text-white disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Signals",  value: signals.length.toString() },
          { label: "Active Now",     value: activeCount.toString() },
          { label: "Win Rate",       value: winRate !== null ? `${winRate}%` : "—" },
          { label: "Models Active",  value: [...new Set(signals.map((s) => s.model))].length.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">{k.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 gap-1 w-fit">
        {(["ALL", "ACTIVE", "CLOSED"] as const).map((t) => (
          <button key={t} onClick={() => setStatusFilter(t)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${statusFilter === t ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Signals */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-16 text-center">
          <Zap className="mx-auto mb-3 h-7 w-7 text-slate-600" />
          <p className="text-sm font-semibold text-white">No signals yet</p>
          <p className="mt-1 text-xs text-slate-600">AI signals will appear here when published by the admin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isBuy    = s.direction === "BUY";
            const isActive = s.status === "ACTIVE";
            const isTp     = s.status === "TP_HIT";
            const isSl     = s.status === "SL_HIT";
            const statusCfg = isActive
              ? { label: "ACTIVE",  cls: "text-emerald-400 bg-emerald-500/10" }
              : isTp
              ? { label: "TP HIT",  cls: "text-blue-400 bg-blue-500/10" }
              : isSl
              ? { label: "SL HIT",  cls: "text-red-400 bg-red-500/10" }
              : { label: "EXPIRED", cls: "text-slate-500 bg-white/[0.04]" };

            return (
              <div key={s.id} className={`rounded-xl border bg-[#0a0f1a] p-5 transition ${isActive ? "border-white/[0.08]" : "border-white/[0.04] opacity-70"}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isBuy ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
                    {isBuy ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-red-400" />}
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-extrabold text-white">{s.pair}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBuy ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>{s.direction}</span>
                      <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-slate-500">{s.timeframe}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <Brain className="h-3 w-3" /> {s.model}
                      <span className="mx-1 text-white/20">·</span>
                      <Clock className="h-3 w-3" /> {timeAgo(s.createdAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    {[
                      { label: "Entry", value: s.entry, color: "text-white" },
                      { label: "Take Profit", value: s.tp, color: "text-emerald-400" },
                      { label: "Stop Loss", value: s.sl, color: "text-red-400" },
                    ].map((l) => (
                      <div key={l.label}>
                        <p className="text-slate-600">{l.label}</p>
                        <p className={`mt-0.5 font-mono font-bold ${l.color}`}>{l.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="text-right">
                    <p className="mb-1.5 text-xs text-slate-600">Confidence</p>
                    <StrengthBar value={s.strength} />
                    {!isActive && s.pips !== null && (
                      <p className={`mt-1.5 text-xs font-bold ${(s.pips ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(s.pips ?? 0) >= 0 ? "+" : ""}{s.pips} pips
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
