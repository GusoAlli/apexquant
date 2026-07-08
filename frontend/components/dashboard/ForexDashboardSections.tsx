"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight,
  BarChart3, Bot, CheckCircle2, Clock, RefreshCw,
  Shield, TrendingDown, TrendingUp, Wifi, WifiOff, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/auth";
import dynamic from "next/dynamic";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  { ssr: false, loading: () => <div className="h-[200px] w-full animate-pulse rounded-lg bg-white/[0.03]" /> }
);

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type MT5Account = {
  id: string;
  accountNumber: string;
  broker: string;
  status: string;
  lastPing: string | null;
  balance: number | null;
  equity: number | null;
  positions: Array<{ symbol: string; type: string; volume: number; profit: number; openPrice: number }>;
};

type Signal = {
  id: string;
  pair: string;
  direction: string;
  entry: number;
  tp: number;
  sl: number;
  strength: number;
  timeframe: string;
  status: string;
  createdAt: string;
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(n: number | null) {
  if (n === null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeSince(iso: string | null) {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-[#0a0f1a]", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ label, title, action }: { label: string; title?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">{label}</p>
        {title && <p className="mt-0.5 text-sm font-semibold text-white">{title}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Forex pair config ─────────────────────────────────────────────────────────

const FOREX_PAIRS = [
  { symbol: "EUR/USD", base: 1.0841, pip: 0.0001 },
  { symbol: "GBP/USD", base: 1.2673, pip: 0.0001 },
  { symbol: "USD/JPY", base: 149.82, pip: 0.01 },
  { symbol: "AUD/USD", base: 0.6512, pip: 0.0001 },
  { symbol: "USD/CHF", base: 0.9034, pip: 0.0001 },
  { symbol: "USD/CAD", base: 1.3621, pip: 0.0001 },
  { symbol: "XAU/USD", base: 2342.5, pip: 0.1 },
  { symbol: "XAG/USD", base: 29.14,  pip: 0.01 },
];

// ── ForexHero ─────────────────────────────────────────────────────────────────

export function ForexHero() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API}/api/mt5/accounts`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const totalEquity    = activeAccounts.reduce((s, a) => s + (a.equity ?? 0), 0);
  const totalBalance   = activeAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const floatingPnL    = totalEquity - totalBalance;
  const allPositions   = activeAccounts.flatMap((a) => a.positions ?? []);

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_0%_0%,rgba(59,130,246,0.06),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_100%_100%,rgba(231,185,73,0.04),transparent)]" />

      <div className="relative p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
          {/* Left */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Forex / CFD Mode</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Forex Command Center</h1>
            <p className="mt-1.5 text-sm text-slate-500">MetaTrader 5 · CFD · Commodities · Indices</p>

            {loading ? (
              <div className="mt-4 h-8 w-48 animate-pulse rounded-lg bg-white/[0.04]" />
            ) : accounts.length === 0 ? (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-2.5 text-sm text-yellow-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No MT5 account connected
                </div>
                <Link href="/dashboard/accounts"
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#060b14] transition hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
                  Connect MT5
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">{activeAccounts.length} EA Active</span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                  <span className="text-xs text-slate-500">Open Positions</span>
                  <span className="ml-2 text-sm font-bold text-white">{allPositions.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right — key metrics */}
          {accounts.length > 0 && (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1 xl:w-56">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Total Equity</p>
                <p className="mt-1 text-xl font-extrabold text-[#e7b949]">{fmt(totalEquity || null)}</p>
              </div>
              <div className={cn("rounded-xl border p-4", floatingPnL >= 0
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : "border-red-500/20 bg-red-500/[0.04]")}>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Floating P&L</p>
                <p className={cn("mt-1 text-xl font-extrabold", floatingPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {floatingPnL >= 0 ? "+" : ""}{fmt(floatingPnL || null)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── ForexKpiBar ───────────────────────────────────────────────────────────────

export function ForexKpiBar() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);

  useEffect(() => {
    fetchWithAuth(`${API}/api/mt5/accounts`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAccounts)
      .catch(() => {});
  }, []);

  const active     = accounts.filter((a) => a.status === "active");
  const positions  = active.flatMap((a) => a.positions ?? []);
  const totalBal   = active.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalEq    = active.reduce((s, a) => s + (a.equity ?? 0), 0);
  const floatPnL   = totalEq - totalBal;
  const winners    = positions.filter((p) => p.profit > 0);
  const winRate    = positions.length ? Math.round((winners.length / positions.length) * 100) : null;
  const totalProfit = positions.reduce((s, p) => s + p.profit, 0);

  const kpis = [
    {
      label: "Total Balance",
      value: fmt(totalBal || null),
      delta: null,
      tone: "gold",
      icon: BarChart3,
    },
    {
      label: "Floating P&L",
      value: floatPnL !== 0 ? `${floatPnL >= 0 ? "+" : ""}${fmt(floatPnL)}` : "—",
      delta: null,
      tone: floatPnL > 0 ? "green" : floatPnL < 0 ? "red" : "neutral",
      icon: floatPnL >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Open Positions",
      value: positions.length.toString(),
      delta: null,
      tone: "neutral",
      icon: Activity,
    },
    {
      label: "Win Rate",
      value: winRate !== null ? `${winRate}%` : "—",
      delta: null,
      tone: winRate !== null && winRate >= 50 ? "green" : "neutral",
      icon: Shield,
    },
    {
      label: "Active EAs",
      value: active.length.toString(),
      delta: null,
      tone: active.length > 0 ? "green" : "neutral",
      icon: Bot,
    },
  ];

  const borderCls: Record<string, string> = {
    gold:    "border-[#e7b949]/20 bg-[#e7b949]/[0.04]",
    green:   "border-emerald-500/20 bg-emerald-500/[0.04]",
    red:     "border-red-500/20 bg-red-500/[0.04]",
    neutral: "border-white/[0.06] bg-white/[0.02]",
  };
  const iconCls: Record<string, string> = {
    gold: "text-[#e7b949]", green: "text-emerald-400", red: "text-red-400", neutral: "text-slate-500",
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className={cn("p-4 transition hover:border-white/10", borderCls[k.tone])}>
            <div className="mb-3 flex items-center justify-between">
              <div className={cn("grid h-9 w-9 place-items-center rounded-lg border bg-white/[0.04]",
                k.tone === "gold" ? "border-[#e7b949]/20" : "border-white/[0.06]")}>
                <Icon className={cn("h-4 w-4", iconCls[k.tone])} />
              </div>
            </div>
            <p className="text-xl font-extrabold text-white">{k.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-slate-500">{k.label}</p>
          </Card>
        );
      })}
    </div>
  );
}

// ── MT5 Accounts Widget ───────────────────────────────────────────────────────

export function MT5AccountsWidget() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWithAuth(`${API}/api/mt5/accounts`);
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="p-5">
      <SectionHeader label="MT5" title="Connected Accounts"
        action={
          <button onClick={load} disabled={loading} className="text-slate-500 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-8 text-center">
          <WifiOff className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-sm text-slate-500">No MT5 accounts</p>
          <Link href="/dashboard/accounts"
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            Connect EA
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => {
            const isActive = acc.status === "active";
            const lastPingRecent = acc.lastPing && (Date.now() - new Date(acc.lastPing).getTime()) < 120_000;
            const pnl = (acc.equity ?? 0) - (acc.balance ?? 0);
            return (
              <div key={acc.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${lastPingRecent ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">#{acc.accountNumber}</p>
                    <p className="text-[10px] text-slate-500 truncate">{acc.broker}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#e7b949]">{fmt(acc.equity ?? acc.balance)}</p>
                    {acc.balance !== null && acc.equity !== null && (
                      <p className={`text-[10px] font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-600">
                  {isActive
                    ? <><Wifi className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Active</span></>
                    : <><WifiOff className="h-3 w-3" /><span>{acc.status}</span></>}
                  <span className="ml-auto"><Clock className="inline h-3 w-3 mr-0.5" />{timeSince(acc.lastPing)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Risk Summary ──────────────────────────────────────────────────────────────

const RISK_ITEMS = [
  { label: "Max Drawdown",  value: "3.2%",  tone: "green", note: "within limit" },
  { label: "Daily Loss",    value: "$142",   tone: "green", note: "limit $500" },
  { label: "Margin Level",  value: "840%",  tone: "green", note: "safe" },
  { label: "Risk per Trade",value: "1.0%",  tone: "gold",  note: "configured" },
  { label: "Lot Exposure",  value: "0.30",  tone: "neutral", note: "3 positions" },
];

export function RiskSummary() {
  return (
    <Card className="p-5">
      <SectionHeader label="Risk" title="Risk Management" />
      <div className="space-y-2">
        {RISK_ITEMS.map((r) => {
          const color = r.tone === "green" ? "text-emerald-400 bg-emerald-500/10"
            : r.tone === "gold" ? "text-[#e7b949] bg-[#e7b949]/10"
            : "text-slate-400 bg-white/[0.04]";
          return (
            <div key={r.label} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <div>
                <p className="text-xs text-slate-400">{r.label}</p>
                <p className="text-[10px] text-slate-600">{r.note}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", color)}>{r.value}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] text-slate-600">
        ⓘ Risk limits configurable in Risk Management
      </p>
    </Card>
  );
}

// ── Open Positions Widget ─────────────────────────────────────────────────────

export function OpenPositionsWidget() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API}/api/mt5/accounts`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const positions = accounts.flatMap((a) =>
    (a.positions ?? []).map((p) => ({ ...p, accountNumber: a.accountNumber }))
  );

  return (
    <Card className="p-5">
      <SectionHeader label="MT5" title={`Open Positions (${positions.length})`}
        action={
          <Link href="/dashboard/trades" className="text-xs text-[#e7b949] hover:underline">View All</Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-8 text-center">
          <Activity className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-sm text-slate-500">No open positions</p>
          <p className="mt-1 text-xs text-slate-600">Connect MT5 EA to see live trades</p>
        </div>
      ) : (
        <div className="space-y-2">
          {positions.slice(0, 6).map((p, i) => {
            const isBuy = p.type === "BUY";
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isBuy ? "bg-emerald-500/10" : "bg-red-500/10")}>
                  {isBuy
                    ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{p.symbol}</p>
                  <p className="text-[10px] text-slate-500">Vol {p.volume} · #{p.accountNumber}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-bold", p.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono">{p.openPrice}</p>
                </div>
              </div>
            );
          })}
          {positions.length > 6 && (
            <p className="text-center text-xs text-slate-600">+{positions.length - 6} more</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Forex Signal Feed ─────────────────────────────────────────────────────────

export function ForexSignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API}/api/signals`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSignals(data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="p-5">
      <SectionHeader label="Signals" title="Forex Signal Feed"
        action={
          <Link href="/dashboard/signals" className="text-xs text-[#e7b949] hover:underline">View All</Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-10 text-center">
          <Zap className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-sm text-slate-500">No active signals</p>
          <p className="mt-1 text-xs text-slate-600">Signals are published by admin</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((s) => {
            const isBuy = s.direction === "BUY";
            const isActive = s.status === "ACTIVE";
            return (
              <div key={s.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", isBuy ? "bg-emerald-400" : "bg-red-400")} />
                  <p className="text-xs font-bold text-white flex-1 truncate">{s.pair}</p>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                    isBuy ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10")}>
                    {s.direction}
                  </span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Entry</span>
                    <span className="font-mono text-slate-300">{s.entry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TP</span>
                    <span className="font-mono text-emerald-400">{s.tp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SL</span>
                    <span className="font-mono text-red-400">{s.sl}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] text-slate-600">{s.timeframe}</span>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 bg-white/[0.04]")}>
                    {isActive ? "ACTIVE" : s.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Forex Market Watch ────────────────────────────────────────────────────────

function useSimulatedPrice(base: number, pip: number) {
  const [price, setPrice] = useState(base);
  const [change, setChange] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPrice((prev) => {
        const delta = (Math.random() - 0.5) * pip * 4;
        const next = Math.max(prev + delta, base * 0.98);
        setChange(((next - base) / base) * 100);
        return next;
      });
    }, 2000 + Math.random() * 1000);
    return () => clearInterval(id);
  }, [base, pip]);

  return { price, change };
}

function PairRow({ symbol, base, pip }: { symbol: string; base: number; pip: number }) {
  const { price, change } = useSimulatedPrice(base, pip);
  const pos = change >= 0;
  const decimals = pip < 0.001 ? 2 : pip < 0.01 ? 2 : pip < 0.1 ? 3 : 5;

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition hover:bg-white/[0.04]">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", pos ? "bg-emerald-400" : "bg-red-400")} />
        <span className="text-xs font-semibold text-white">{symbol}</span>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs text-white">{price.toFixed(decimals)}</p>
        <p className={cn("text-[10px] font-semibold", pos ? "text-emerald-400" : "text-red-400")}>
          {pos ? "+" : ""}{change.toFixed(3)}%
        </p>
      </div>
    </div>
  );
}

export function ForexMarketWatch() {
  return (
    <Card className="p-5">
      <SectionHeader label="Market" title="Market Watch" />
      <div className="space-y-1.5">
        {FOREX_PAIRS.map((p) => (
          <PairRow key={p.symbol} symbol={p.symbol} base={p.base} pip={p.pip} />
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-slate-600">
        ⓘ Prices are simulated — connect live feed for real data
      </p>
    </Card>
  );
}
