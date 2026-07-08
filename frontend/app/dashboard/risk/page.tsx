"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield, ShieldAlert, ShieldCheck, TrendingDown, Zap } from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type MT5Account = {
  id: string;
  accountNumber: string;
  broker: string;
  balance: number | null;
  equity: number | null;
  positions: Array<{ symbol: string; type: string; volume: number; profit: number }>;
};

function RiskMeter({ score }: { score: number }) {
  const color = score < 30 ? "#10b981" : score < 60 ? "#e7b949" : "#f87171";
  const label = score < 30 ? "Low Risk" : score < 60 ? "Moderate" : "High Risk";
  const Icon  = score < 30 ? ShieldCheck : score < 60 ? Shield : ShieldAlert;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round" transform="rotate(-90 60 60)" />
        </svg>
        <div className="text-center">
          <p className="text-3xl font-extrabold" style={{ color }}>{score}</p>
          <p className="text-[10px] text-slate-500">/100</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function GuardRow({ label, description, status, value }: {
  label: string; description: string;
  status: "armed" | "active" | "warning" | "disabled";
  value?: string;
}) {
  const cfg = {
    armed:    { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-500/10", text: "Armed" },
    active:   { dot: "bg-blue-400",    badge: "text-blue-400 bg-blue-500/10",       text: "Active" },
    warning:  { dot: "bg-yellow-400 animate-pulse", badge: "text-yellow-400 bg-yellow-500/10", text: "Warning" },
    disabled: { dot: "bg-slate-600",   badge: "text-slate-600 bg-white/[0.04]",     text: "Disabled" },
  }[status];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {value && <span className="text-sm font-mono text-slate-400">{value}</span>}
      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>{cfg.text}</span>
    </div>
  );
}

export default function RiskPage() {
  const mode = useMode();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWithAuth(`${API}/api/mt5/accounts`);
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connected = accounts.length > 0;
  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalEquity  = accounts.reduce((s, a) => s + (a.equity  ?? 0), 0);
  const totalProfit  = accounts.flatMap((a) => a.positions).reduce((s, p) => s + p.profit, 0);
  const openCount    = accounts.reduce((s, a) => s + (a.positions?.length ?? 0), 0);

  const drawdown = totalBalance > 0 ? Math.max(0, ((totalBalance - totalEquity) / totalBalance) * 100) : 0;
  const exposure = totalBalance > 0 ? Math.min(100, (openCount * 2)) : 0;
  const riskScore = connected ? Math.min(100, Math.round(drawdown * 3 + exposure)) : 0;

  const marginUsage = totalBalance > 0 ? Math.min(100, (Math.abs(totalProfit) / totalBalance) * 100 * 5) : 0;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
          {mode === "forex" ? "Forex / CFD" : "Exchange"} · Risk Management
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Risk Control</h1>
        <p className="mt-2 text-sm text-slate-400">
          Real-time risk monitoring across all connected MT5 accounts.
        </p>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-16 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-semibold text-white">No MT5 accounts connected</p>
          <p className="mt-1 text-xs text-slate-600">Connect MT5 to enable real-time risk monitoring.</p>
          <Link href="/dashboard/ea"
            className="mt-5 rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            Connect MT5
          </Link>
        </div>
      ) : (
        <>
          {/* Risk score + metrics */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Score */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Portfolio Risk Score</p>
              <RiskMeter score={riskScore} />
            </div>

            {/* Metrics */}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              {([
                { label: "Drawdown", value: `-${drawdown.toFixed(2)}%`, sub: "Balance vs Equity", tone: (drawdown > 5 ? "red" : "neutral") as "red"|"neutral"|"green" },
                { label: "Open Positions", value: openCount.toString(), sub: "MT5 live positions", tone: "neutral" as "red"|"neutral"|"green" },
                { label: "Float P&L", value: (totalProfit >= 0 ? "+" : "") + "$" + Math.abs(totalProfit).toFixed(2), sub: "Unrealised", tone: (totalProfit >= 0 ? "green" : "red") as "red"|"neutral"|"green" },
                { label: "Margin Usage", value: `${marginUsage.toFixed(1)}%`, sub: "Estimated exposure", tone: (marginUsage > 50 ? "red" : "neutral") as "red"|"neutral"|"green" },
              ] as const).map((m) => {
                const clsMap = { red: "border-red-500/20 bg-red-500/[0.04]", green: "border-emerald-500/20 bg-emerald-500/[0.04]", neutral: "border-white/[0.07] bg-white/[0.02]" } as const;
                const valMap = { red: "text-red-400", green: "text-emerald-400", neutral: "text-white" } as const;
                const cls = clsMap[m.tone];
                const val = valMap[m.tone];
                return (
                  <div key={m.label} className={`rounded-xl border p-5 ${cls}`}>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">{m.label}</p>
                    <p className={`mt-2 text-xl font-extrabold ${val}`}>{m.value}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{m.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert */}
          {drawdown > 5 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Drawdown exceeded 5% — consider reducing open exposure or reviewing position sizing.
            </div>
          )}

          {/* Guardrails */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Risk Guardrails</p>
            <div className="space-y-2">
              <GuardRow label="Drawdown Circuit Breaker" description="Flags when account drawdown exceeds 10%"
                status={drawdown > 10 ? "warning" : "armed"} value="-10%" />
              <GuardRow label="Overexposure Guard" description="Monitors open position count vs. balance"
                status={openCount > 10 ? "warning" : "active"} value={`${openCount} positions`} />
              <GuardRow label="Floating Loss Threshold" description="Alerts on unrealised loss > 3% of balance"
                status={totalProfit < 0 && Math.abs(totalProfit) / (totalBalance || 1) > 0.03 ? "warning" : "active"}
                value={`${Math.abs(Math.min(0, (totalProfit / (totalBalance || 1)) * 100)).toFixed(2)}%`} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
