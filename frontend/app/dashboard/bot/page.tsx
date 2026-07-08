"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity, Bot, CheckCircle2, ChevronDown, ChevronUp,
  Circle, Settings2, ShieldCheck, Square, Zap,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type BotConfig = {
  enabled: boolean;
  symbols: string[];
  riskPerTrade: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxOpenPositions: number;
  minRR: number;
  lotSize: number;
};

type BotTrade = {
  id: string;
  symbol: string;
  action: string;
  volume: number;
  openPrice: number;
  sl: number;
  tp: number;
  status: string;
  pnl: number | null;
  openedAt: string;
};

type BotStatus = {
  enabled: boolean;
  symbols: string[];
  openTrades: number;
  totalTrades: number;
  winRate: number | null;
  lastSignal: { pair: string; direction: string; strength: number; createdAt: string } | null;
  recentTrades: BotTrade[];
  config: BotConfig | null;
};

const SYMBOL_OPTIONS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
  "AUDUSD", "USDCAD", "NZDUSD", "EURGBP",
  "XAUUSD", "XAGUSD",
];

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function BotPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [config, setConfig] = useState<BotConfig>({
    enabled: false,
    symbols: ["EURUSD", "GBPUSD", "XAUUSD"],
    riskPerTrade: 1,
    maxDailyLoss: 3,
    maxDrawdown: 10,
    maxOpenPositions: 3,
    minRR: 1.5,
    lotSize: 0.01,
  });
  const [toggling, setToggling]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API}/api/bot/status`);
      if (!r.ok) return;
      const data: BotStatus = await r.json();
      setStatus(data);
      if (data.config) setConfig({ ...data.config, symbols: data.symbols });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Toggle bot on/off — auto-saves immediately
  async function toggleBot() {
    if (toggling) return;
    setToggling(true);
    const next = !config.enabled;
    try {
      const r = await fetchWithAuth(`${API}/api/bot/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, enabled: next }),
      });
      if (r.ok) {
        setConfig((p) => ({ ...p, enabled: next }));
        await loadStatus();
      }
    } finally {
      setToggling(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetchWithAuth(`${API}/api/bot/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        loadStatus();
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleSymbol(sym: string) {
    setConfig((prev) => ({
      ...prev,
      symbols: prev.symbols.includes(sym)
        ? prev.symbols.filter((s) => s !== sym)
        : [...prev.symbols, sym],
    }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e7b949] border-t-transparent" />
      </div>
    );
  }

  const isRunning = config.enabled;

  return (
    <div className="space-y-5 py-6">

      {/* ── Bot Control Panel ─────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 transition-colors duration-500 ${
        isRunning
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}>
        {/* Glow when running */}
        {isRunning && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
        )}

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Status info */}
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
              isRunning
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/[0.08] bg-white/[0.04]"
            }`}>
              {isRunning
                ? <span className="relative flex h-5 w-5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex h-5 w-5 rounded-full bg-emerald-400" />
                  </span>
                : <Bot className="h-6 w-6 text-slate-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-white">ApexQuant Bot</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  isRunning
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-white/[0.06] text-slate-500"
                }`}>
                  {isRunning ? "Running" : "Stopped"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {isRunning
                  ? `Polling every 60s · ${config.symbols.join(", ")}`
                  : "Configure symbols below, then start the bot"}
              </p>
            </div>
          </div>

          {/* Start / Stop button */}
          <button
            type="button"
            onClick={toggleBot}
            disabled={toggling}
            className={`flex shrink-0 items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 text-sm font-bold transition-all disabled:opacity-60 ${
              isRunning
                ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "text-[#0d1520] hover:brightness-110"
            }`}
            style={!isRunning ? { background: "linear-gradient(135deg, #f7d36d 0%, #d4a017 100%)", boxShadow: "0 6px 24px -8px rgba(231,185,73,0.5)" } : {}}
          >
            {toggling ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isRunning ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0d1520] opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#0d1520]" />
              </span>
            )}
            {toggling ? "Updating…" : isRunning ? "Stop Bot" : "Start Bot"}
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Open Trades"  value={status?.openTrades ?? 0}  sub="Via this bot" />
        <Stat label="Total Trades" value={status?.totalTrades ?? 0} sub="All time" />
        <Stat
          label="Win Rate"
          value={status?.winRate != null ? `${status.winRate}%` : "—"}
          sub="Closed positions"
        />
      </div>

      {/* ── Last Signal ──────────────────────────────────────────────────── */}
      {status?.lastSignal && (
        <div className="flex items-center gap-4 rounded-xl border border-[#e7b949]/15 bg-[#e7b949]/[0.04] px-5 py-3">
          <Zap className="h-4 w-4 shrink-0 text-[#e7b949]" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-white">{status.lastSignal.pair}</span>
            <span className={`ml-2 font-bold ${status.lastSignal.direction === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
              {status.lastSignal.direction}
            </span>
            <span className="ml-2 text-slate-500">· Confidence {status.lastSignal.strength}%</span>
          </div>
          <span className="text-xs text-slate-600">
            {new Date(status.lastSignal.createdAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* ── Config Card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="mb-5 flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-[#e7b949]" />
          <h2 className="text-base font-bold text-white">Bot Configuration</h2>
        </div>

        {/* Symbols */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Trading Symbols
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMBOL_OPTIONS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => toggleSymbol(sym)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                  config.symbols.includes(sym)
                    ? "border-[#e7b949]/40 bg-[#e7b949]/10 text-[#e7b949]"
                    : "border-white/[0.08] text-slate-500 hover:border-white/20 hover:text-white"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Lot + Risk */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Lot Size</label>
            <input
              type="number" step="0.01" min="0.01" max="100"
              value={config.lotSize}
              onChange={(e) => setConfig((p) => ({ ...p, lotSize: parseFloat(e.target.value) || 0.01 }))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#e7b949]/40"
            />
            <p className="mt-1 text-[11px] text-slate-600">0.01 = micro lot</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Risk Per Trade (%)</label>
            <input
              type="number" step="0.1" min="0.1" max="10"
              value={config.riskPerTrade}
              onChange={(e) => setConfig((p) => ({ ...p, riskPerTrade: parseFloat(e.target.value) || 1 }))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#e7b949]/40"
            />
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Advanced Risk Settings
        </button>

        {showAdvanced && (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Max Daily Loss (%)", key: "maxDailyLoss", step: 0.5, min: 1, max: 20 },
              { label: "Max Drawdown (%)",   key: "maxDrawdown",  step: 1,   min: 1, max: 50 },
              { label: "Min R:R Ratio",      key: "minRR",        step: 0.1, min: 1, max: 10 },
            ].map(({ label, key, step, min, max }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</label>
                <input
                  type="number" step={step} min={min} max={max}
                  value={(config as any)[key]}
                  onChange={(e) => setConfig((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#e7b949]/40"
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-[#0d1520] transition hover:brightness-110 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #f7d36d 0%, #d4a017 100%)" }}
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Configuration"}
        </button>
      </div>

      {/* ── Setup Guide ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center gap-3">
          <Bot className="h-5 w-5 text-[#e7b949]" />
          <h2 className="text-base font-bold text-white">EA Setup Guide</h2>
        </div>
        <ol className="space-y-3 text-sm text-slate-400">
          {[
            <>Copy <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white">ApexQuantBot.mq5</code> ke folder MT5 <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white">MQL5/Experts/</code> lalu compile.</>,
            <>MT5: <strong className="text-white">Tools → Options → Expert Advisors</strong> → Allow WebRequest → tambah <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white">http://127.0.0.1:4000</code></>,
            <><strong className="text-white">Accounts → MT5</strong> → Generate Token → copy.</>,
            <>Attach <strong className="text-white">ApexQuantBot</strong> ke chart → paste token di <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-white">InpToken</code>.</>,
            <>Configure symbols & lot size di atas → <strong className="text-white">Save</strong> → klik <strong className="text-white">Start Bot</strong>.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7b949]/20 text-[10px] font-bold text-[#e7b949]">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Recent Trades ────────────────────────────────────────────────── */}
      {(status?.recentTrades?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-[#e7b949]" />
            <h2 className="text-base font-bold text-white">Recent Bot Trades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  {["Symbol","Action","Volume","Open Price","P&L","Status"].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status!.recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.03]">
                    <td className="py-2.5 pr-4 font-mono text-white">{t.symbol}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`font-bold ${t.action === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.action}</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-slate-300">{t.volume.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-300">{t.openPrice.toFixed(5)}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {t.pnl != null
                        ? <span className={t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>{t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.status === "open" ? "bg-blue-500/10 text-blue-400" :
                        t.status === "failed" ? "bg-red-500/10 text-red-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        <Circle className="h-1.5 w-1.5 fill-current" />
                        {t.status}
                      </span>
                    </td>
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
