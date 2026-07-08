"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot, Brain, FlaskConical, MoreVertical, Pause, Play,
  Plus, Target, Trash2, TrendingUp, X, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type StrategyType   = "manual" | "bot" | "ai";
type StrategyStatus = "draft" | "active" | "paused";
type Mode           = "exchange" | "forex" | "web3";

type Performance = {
  winRate?: number;
  netPnl?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  totalTrades?: number;
};

type Strategy = {
  id: string;
  name: string;
  description: string | null;
  symbol: string;
  timeframe: string;
  type: StrategyType;
  status: StrategyStatus;
  mode: Mode;
  performance: Performance | null;
  createdAt: string;
  updatedAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const EXCHANGE_SYMBOLS = [
  "BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","AVAXUSDT",
  "DOGEUSDT","MATICUSDT","LINKUSDT","DOTUSDT","UNIUSDT","LTCUSDT","ATOMUSDT",
];
const FOREX_SYMBOLS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD",
  "EURGBP","XAUUSD","XAGUSD","US30","NAS100","SPX500",
];
const EXCHANGE_TIMEFRAMES = ["1m","5m","15m","30m","1h","4h","1d","1w"];
const FOREX_TIMEFRAMES    = ["M1","M5","M15","M30","H1","H4","D1","W1"];

const TYPE_META: Record<StrategyType, { label: string; color: string; icon: React.ElementType }> = {
  manual: { label: "Manual", color: "text-slate-400 border-slate-700 bg-slate-800/60",   icon: Target },
  bot:    { label: "Bot",    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",   icon: Bot },
  ai:     { label: "AI",     color: "text-[#e7b949] border-[#e7b949]/30 bg-[#e7b949]/10", icon: Brain },
};

const STATUS_META: Record<StrategyStatus, { label: string; dot: string; text: string }> = {
  draft:  { label: "Draft",  dot: "bg-slate-500",                text: "text-slate-400" },
  active: { label: "Active", dot: "bg-emerald-400 animate-pulse", text: "text-emerald-400" },
  paused: { label: "Paused", dot: "bg-amber-400",                text: "text-amber-400" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n?: number, suffix = "%") {
  if (n === undefined || n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}${suffix}`;
}

// ── Create Modal ──────────────────────────────────────────────────────────────

type CreateForm = {
  name: string; description: string; symbol: string;
  timeframe: string; type: StrategyType;
};

function CreateModal({
  mode, onClose, onCreated,
}: {
  mode: Mode;
  onClose: () => void;
  onCreated: (s: Strategy) => void;
}) {
  const symbols    = mode === "exchange" ? EXCHANGE_SYMBOLS : FOREX_SYMBOLS;
  const timeframes = mode === "exchange" ? EXCHANGE_TIMEFRAMES : FOREX_TIMEFRAMES;

  const [form, setForm] = useState<CreateForm>({
    name: "", description: "", symbol: symbols[0], timeframe: timeframes[4], type: "manual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const set = (k: keyof CreateForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Strategy name is required"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetchWithAuth(`${API}/api/strategies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      const created: Strategy = await res.json();
      onCreated(created);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1520] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">New Strategy</h2>
            <p className="text-xs text-slate-500">{mode === "exchange" ? "Crypto Exchange" : "Forex / CFD"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Strategy Name *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. BTC Momentum Alpha"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#e7b949]/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Describe your strategy logic…"
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#e7b949]/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Symbol</label>
              <select
                value={form.symbol}
                onChange={(e) => set("symbol", e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0d1520] px-3 py-2.5 text-sm text-white focus:border-[#e7b949]/40 focus:outline-none"
              >
                {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Timeframe</label>
              <select
                value={form.timeframe}
                onChange={(e) => set("timeframe", e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0d1520] px-3 py-2.5 text-sm text-white focus:border-[#e7b949]/40 focus:outline-none"
              >
                {timeframes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Strategy Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["manual","bot","ai"] as StrategyType[]).map((t) => {
                const m = TYPE_META[t];
                const Icon = m.icon;
                return (
                  <button
                    key={t} type="button" onClick={() => set("type", t)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition",
                      form.type === t ? m.color : "border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-white/10 hover:text-slate-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2.5 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-sm text-slate-400 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button" onClick={submit} disabled={loading}
            className="flex-1 rounded-lg py-2.5 text-sm font-bold text-[#0d1520] transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}
          >
            {loading ? "Creating…" : "Create Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Strategy Card ─────────────────────────────────────────────────────────────

function StrategyCard({
  strategy, onStatusChange, onDelete,
}: {
  strategy: Strategy;
  onStatusChange: (id: string, status: StrategyStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const typeMeta   = TYPE_META[strategy.type];
  const statusMeta = STATUS_META[strategy.status];
  const TypeIcon   = typeMeta.icon;
  const perf       = strategy.performance;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleStatus = () => {
    const next: StrategyStatus =
      strategy.status === "active" ? "paused" :
      strategy.status === "paused" ? "active" : "active";
    onStatusChange(strategy.id, next);
    setMenuOpen(false);
  };

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#0a0f1a] p-5 transition hover:border-white/[0.1]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-white">{strategy.name}</h3>
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", typeMeta.color)}>
              <TypeIcon className="h-2.5 w-2.5" />
              {typeMeta.label}
            </span>
          </div>
          {strategy.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{strategy.description}</p>
          )}
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button" onClick={() => setMenuOpen((v) => !v)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.06] text-slate-500 transition hover:border-white/10 hover:text-white"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1520] shadow-xl">
              <div className="p-1">
                <button type="button" onClick={toggleStatus}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white">
                  {strategy.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {strategy.status === "active" ? "Pause" : "Activate"}
                </button>
                <Link href={`/dashboard/backtest?symbol=${strategy.symbol}&tf=${strategy.timeframe}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white">
                  <FlaskConical className="h-3.5 w-3.5" /> Run Backtest
                </Link>
              </div>
              <div className="border-t border-white/[0.06] p-1">
                <button type="button" onClick={() => { onDelete(strategy.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-xs font-bold text-slate-300">
          {strategy.symbol}
        </span>
        <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-400">
          {strategy.timeframe}
        </span>
        <span className={cn("ml-auto flex items-center gap-1.5 text-xs font-bold", statusMeta.text)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
          {statusMeta.label}
        </span>
      </div>

      {/* Performance */}
      {perf ? (
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          {[
            { label: "Win Rate",  value: perf.winRate     !== undefined ? `${perf.winRate.toFixed(1)}%`    : "—", pos: (perf.winRate ?? 0) >= 50 },
            { label: "Net PnL",   value: perf.netPnl      !== undefined ? fmt(perf.netPnl)                 : "—", pos: (perf.netPnl ?? 0) >= 0 },
            { label: "Drawdown",  value: perf.maxDrawdown !== undefined ? `${perf.maxDrawdown.toFixed(1)}%` : "—", pos: false },
            { label: "Sharpe",    value: perf.sharpeRatio !== undefined ? perf.sharpeRatio.toFixed(2)       : "—", pos: (perf.sharpeRatio ?? 0) >= 1 },
          ].map(({ label, value, pos }) => (
            <div key={label} className="flex flex-col gap-0.5 text-center">
              <span className="text-[10px] text-slate-600">{label}</span>
              <span className={cn(
                "font-mono text-xs font-bold",
                label === "Drawdown" ? "text-red-400" : pos ? "text-emerald-400" : "text-red-400"
              )}>{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-4">
          <p className="text-xs text-slate-600">No backtest data yet</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button type="button" onClick={() => onStatusChange(strategy.id, strategy.status === "active" ? "paused" : "active")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition",
            strategy.status === "active"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          )}>
          {strategy.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
        </button>
        <Link href={`/dashboard/backtest?symbol=${strategy.symbol}&tf=${strategy.timeframe}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 text-xs font-bold text-slate-400 transition hover:border-white/10 hover:text-white">
          <FlaskConical className="h-3 w-3" /> Backtest
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: StrategyStatus | "all" }[] = [
  { label: "All",    value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Draft",  value: "draft" },
];

export default function StrategiesPage() {
  const mode = useMode();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter]         = useState<StrategyStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/api/strategies`);
      if (res.ok) setStrategies(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: StrategyStatus) => {
    await fetchWithAuth(`${API}/api/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setStrategies((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this strategy?")) return;
    await fetchWithAuth(`${API}/api/strategies/${id}`, { method: "DELETE" });
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  };

  const modeStrats = strategies.filter((s) => s.mode === (mode ?? "exchange"));
  const visible    = filter === "all" ? modeStrats : modeStrats.filter((s) => s.status === filter);
  const counts     = {
    all:    modeStrats.length,
    active: modeStrats.filter((s) => s.status === "active").length,
    paused: modeStrats.filter((s) => s.status === "paused").length,
    draft:  modeStrats.filter((s) => s.status === "draft").length,
  };

  if (!mode) return null;

  return (
    <>
      {showCreate && (
        <CreateModal
          mode={mode}
          onClose={() => setShowCreate(false)}
          onCreated={(s) => { setStrategies((p) => [s, ...p]); setShowCreate(false); }}
        />
      )}

      <div className="space-y-5 px-4 py-5 sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#e7b949]" />
              <h1 className="text-xl font-extrabold text-white">Strategy Manager</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">Build, test, and deploy systematic trading strategies.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#0d1520] transition hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}>
            <Plus className="h-4 w-4" /> New Strategy
          </button>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",  value: counts.all,    icon: Target,     color: "text-slate-300" },
            { label: "Active", value: counts.active,  icon: TrendingUp, color: "text-emerald-400" },
            { label: "Paused", value: counts.paused,  icon: Zap,        color: "text-amber-400" },
            { label: "Draft",  value: counts.draft,   icon: Brain,      color: "text-slate-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-3">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              <div>
                <p className="text-lg font-extrabold text-white">{value}</p>
                <p className="text-[11px] text-slate-600">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex w-fit items-center gap-1 rounded-xl border border-white/[0.06] bg-[#080c14] p-1">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-bold transition",
                filter === f.value ? "bg-[#e7b949] text-[#060b14] shadow" : "text-slate-500 hover:text-slate-300"
              )}>
              {f.label}
              {f.value !== "all" && counts[f.value] > 0 && (
                <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/[0.04] bg-[#0a0f1a]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0a0f1a] p-12 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Target className="h-7 w-7 text-slate-600" />
            </div>
            <h2 className="text-base font-bold text-white">
              {filter === "all" ? "No strategies yet" : `No ${filter} strategies`}
            </h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              {filter === "all"
                ? "Create your first strategy to start building a systematic approach."
                : `Switch to "All" to see all strategies.`}
            </p>
            {filter === "all" && (
              <button type="button" onClick={() => setShowCreate(true)}
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#0d1520] transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}>
                <Plus className="h-4 w-4" /> Create First Strategy
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => (
              <StrategyCard key={s.id} strategy={s} onStatusChange={handleStatusChange} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
