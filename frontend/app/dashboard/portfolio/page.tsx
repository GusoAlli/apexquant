"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import {
  RefreshCw, Wallet, BarChart3, TrendingUp, TrendingDown,
  Activity, Plus, CircleDot, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { IconifySymbol } from "@/components/ui/icon";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Balance = { asset: string; free: number; locked: number; usdValue: number | null };
type AccountRow = {
  id: string;
  source: "mt5" | "cex";
  type: string;
  label: string;
  status: string;
  errorMsg?: string | null;
  lastSync: string | null;
  balances: Balance[];
  totalUsd: number | null;
};
type Summary = {
  hasAccounts: boolean;
  hasMetrics: boolean;
  totalBalance: number | null;
  totalEquity: number | null;
  floatingPnL: number | null;
  totalPositions: number | null;
  accountCount: number;
  accounts: AccountRow[];
};

const EXCHANGE_ICON: Record<string, ReactElement> = {
  BINANCE:     <IconifySymbol icon="simple-icons:binance"     className="h-4 w-4 text-yellow-400" />,
  OKX:         <IconifySymbol icon="simple-icons:okx"         className="h-4 w-4 text-white" />,
  BYBIT:       <BrandIcon name="bybit" size={16} />,
  HYPERLIQUID: <BrandIcon name="hyperliquid" size={16} />,
  MT5:         <BrandIcon name="metatrader" size={16} />,
};

function fmt(n: number | null): string {
  if (n === null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PnL({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500">—</span>;
  const pos = value >= 0;
  return (
    <span className={pos ? "text-emerald-400" : "text-red-400"}>
      {pos ? "+" : "−"}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, sub, tone = "neutral" }: {
  label: string; value: React.ReactNode; icon: React.ElementType;
  sub?: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" | "neutral";
}) {
  const border = { gold: "border-[#e7b949]/20 bg-[#e7b949]/[0.04]", green: "border-emerald-500/20 bg-emerald-500/[0.04]", red: "border-red-500/20 bg-red-500/[0.04]", blue: "border-blue-500/20 bg-blue-500/[0.04]", neutral: "border-white/[0.07] bg-white/[0.02]" }[tone];
  const ic = { gold: "text-[#e7b949]", green: "text-emerald-400", red: "text-red-400", blue: "text-blue-400", neutral: "text-slate-500" }[tone];
  return (
    <div className={`rounded-xl border p-5 ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${ic}`} />
      </div>
      <div className="text-2xl font-extrabold text-white tracking-tight">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "active")      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "error")       return <AlertCircle  className="h-3.5 w-3.5 text-red-400" />;
  if (status === "pending")     return <Clock        className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />;
  return <CircleDot className="h-3.5 w-3.5 text-slate-500" />;
}

// ── Forex Portfolio View ──────────────────────────────────────────────────────

type MT5Pos = { symbol: string; type: string; volume: number; openPrice: number; profit: number };
type MT5Account = { id: string; accountNumber: string; broker: string; status: string; lastPing: string | null; balance: number | null; equity: number | null; positions: MT5Pos[] };

function ForexPortfolioView() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const res = await fetchWithAuth(`${API}/api/mt5/accounts`);
    if (res.ok) setAccounts(await res.json());
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active      = accounts.filter((a) => a.status === "active");
  const totalBal    = active.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalEq     = active.reduce((s, a) => s + (a.equity  ?? 0), 0);
  const floatPnL    = totalEq - totalBal;
  const positions   = accounts.flatMap((a) => (a.positions ?? []).map((p) => ({ ...p, accountNumber: a.accountNumber, broker: a.broker })));
  const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-[#e7b949]" /></div>;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Forex / CFD</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Forex Portfolio</h1>
            <p className="mt-2 text-sm text-slate-400">Real-time equity aggregated from your MetaTrader 5 accounts.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link href="/dashboard/accounts"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#060b14] transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
              <Plus className="h-3.5 w-3.5" /> Connect MT5
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Balance", value: fmtUsd(totalBal), tone: "gold", icon: Wallet },
          { label: "Total Equity",  value: fmtUsd(totalEq),  tone: "blue", icon: BarChart3 },
          { label: "Floating P&L",  value: (floatPnL >= 0 ? "+" : "") + fmtUsd(floatPnL), tone: floatPnL >= 0 ? "green" : "red", icon: floatPnL >= 0 ? TrendingUp : TrendingDown },
          { label: "Open Positions",value: positions.length.toString(), tone: "neutral", icon: Activity },
        ].map((k) => {
          const Icon = k.icon;
          const border = ({ gold: "border-[#e7b949]/20 bg-[#e7b949]/[0.04]", green: "border-emerald-500/20 bg-emerald-500/[0.04]", red: "border-red-500/20 bg-red-500/[0.04]", blue: "border-blue-500/20 bg-blue-500/[0.04]", neutral: "border-white/[0.07] bg-white/[0.02]" } as Record<string, string>)[k.tone];
          const ic = ({ gold: "text-[#e7b949]", green: "text-emerald-400", red: "text-red-400", blue: "text-blue-400", neutral: "text-slate-500" } as Record<string, string>)[k.tone];
          return (
            <div key={k.label} className={`rounded-xl border p-5 ${border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{k.label}</span>
                <Icon className={`h-4 w-4 ${ic}`} />
              </div>
              <p className={`text-2xl font-extrabold ${ic}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* MT5 Accounts */}
      {accounts.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] p-12 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="text-base font-bold text-white">No MT5 accounts connected</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">Install the ApexQuant EA in MetaTrader 5 to stream live balance and positions.</p>
          <Link href="/dashboard/accounts"
            className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            <Plus className="h-4 w-4" /> Connect MT5 EA
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">MT5 Accounts</p>
            <div className="space-y-3">
              {accounts.map((acc) => {
                const eq    = acc.equity  ?? 0;
                const bal   = acc.balance ?? 0;
                const pnl   = eq - bal;
                const alive = acc.lastPing && (Date.now() - new Date(acc.lastPing).getTime()) < 120_000;
                return (
                  <div key={acc.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${alive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">#{acc.accountNumber} — {acc.broker}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{acc.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-[#e7b949]">{fmtUsd(eq)}</p>
                        <p className={`text-xs font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {pnl >= 0 ? "+" : ""}{fmtUsd(pnl)} P&L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{fmtUsd(bal)}</p>
                        <p className="text-[10px] text-slate-600">Balance</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {active.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/[0.04] px-5 py-3">
                <span className="text-sm font-bold uppercase tracking-wider text-[#e7b949]">Total Portfolio</span>
                <span className="text-xl font-extrabold text-[#e7b949]">{fmtUsd(totalEq)}</span>
              </div>
            )}
          </div>

          {/* Positions table */}
          {positions.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Open Positions ({positions.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-left text-xs uppercase tracking-wider text-slate-600">
                      <th className="pb-3 font-medium">Symbol</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Volume</th>
                      <th className="pb-3 font-medium">Open Price</th>
                      <th className="pb-3 font-medium">Account</th>
                      <th className="pb-3 text-right font-medium">Float P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {positions.map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-mono font-bold text-white">{p.symbol}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{p.type}</span>
                        </td>
                        <td className="py-3 text-slate-300">{p.volume}</td>
                        <td className="py-3 font-mono text-xs text-slate-400">{p.openPrice}</td>
                        <td className="py-3 text-xs text-slate-500">#{p.accountNumber}</td>
                        <td className={`py-3 text-right font-bold ${p.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Exchange Portfolio View ────────────────────────────────────────────────────

export default function PortfolioPage() {
  const mode = useMode();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/api/portfolio/summary`);
      if (res.ok) { setSummary(await res.json()); setLastFetched(new Date()); }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      await fetchWithAuth(`${API}/api/brokers/${accountId}/sync`, { method: "POST" });
      await load(true);
    } catch {}
    finally { setSyncing(null); }
  };

  if (mode === "forex") return <ForexPortfolioView />;

  if (loading) return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-[#e7b949]" />
    </div>
  );

  const pnlTone: "neutral" | "green" | "red" = !summary?.hasMetrics
    ? "neutral"
    : (summary.floatingPnL ?? 0) >= 0 ? "green" : "red";

  const totalUsd = summary ? (summary.totalBalance ?? 0) : 0;

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Portfolio</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Portfolio Command</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Real-time balance aggregated across all connected brokers and exchanges.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastFetched && <span className="text-xs text-slate-600">Updated {lastFetched.toLocaleTimeString()}</span>}
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/dashboard/accounts"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#060b14] transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
              <Plus className="h-3.5 w-3.5" />
              Connect
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Balance" value={fmt(totalUsd || null)} icon={Wallet} tone="gold"
          sub={summary?.hasMetrics ? `${summary.accountCount} account${summary.accountCount !== 1 ? "s" : ""}` : "No accounts synced yet"} />
        <KpiCard label="Total Equity" value={fmt(summary?.totalEquity ?? null)} icon={BarChart3} tone="blue"
          sub="Balance + open P&L" />
        <KpiCard label="Floating P&L" value={<PnL value={summary?.floatingPnL ?? null} />}
          icon={(summary?.floatingPnL ?? 0) >= 0 ? TrendingUp : TrendingDown} tone={pnlTone}
          sub="MT5 unrealised gain / loss" />
        <KpiCard label="Open Positions" value={(summary?.totalPositions ?? 0).toString()} icon={Activity} tone="neutral"
          sub="MT5 positions" />
      </div>

      {/* Accounts */}
      {!summary?.hasAccounts ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] p-12 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <h2 className="text-base font-bold text-white">No broker accounts connected</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">Connect Binance, OKX, Bybit, HyperLiquid or MT5 to see real balances.</p>
          <Link href="/dashboard/accounts"
            className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            <Plus className="h-4 w-4" /> Connect Account
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Accounts</p>
              <h2 className="mt-0.5 text-base font-bold text-white">Connected Accounts</h2>
            </div>
            <Link href="/dashboard/accounts"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08]">
              <Plus className="h-3.5 w-3.5" /> Add
            </Link>
          </div>

          <div className="space-y-3">
            {summary.accounts.map((acc) => {
              const totalUsdAcc = acc.totalUsd ?? 0;
              const isSyncing = syncing === acc.id;
              return (
                <div key={acc.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Exchange icon + name */}
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                        {EXCHANGE_ICON[acc.type] ?? <CircleDot className="h-4 w-4 text-slate-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{acc.label}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{acc.type}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={acc.status} />
                      <span className="text-xs capitalize text-slate-400">{acc.status}</span>
                      {acc.errorMsg && <span className="text-xs text-red-400">— {acc.errorMsg}</span>}
                    </div>

                    {/* Total USD */}
                    <div className="ml-auto text-right">
                      <p className={`text-lg font-extrabold ${acc.status === 'error' ? 'text-slate-400' : 'text-[#e7b949]'}`}>
                        {acc.totalUsd !== null ? fmt(totalUsdAcc) : "—"}
                      </p>
                      {acc.lastSync && (
                        <p className={`text-[10px] ${acc.status === 'error' ? 'text-red-400/60' : 'text-slate-600'}`}>
                          {acc.status === 'error' ? 'Last known' : 'Synced'} {new Date(acc.lastSync).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* Sync button (CEX only) */}
                    {acc.source === "cex" && (
                      <button onClick={() => handleSync(acc.id)} disabled={isSyncing}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-slate-400 transition hover:text-white disabled:opacity-40">
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Asset breakdown */}
                  {acc.balances.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                      {acc.balances.filter((b) => b.free + b.locked > 0).map((b) => (
                        <div key={b.asset} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs">
                          <span className="font-bold text-white">{b.asset}</span>
                          <span className="ml-2 font-mono text-slate-400">
                            {(b.free + b.locked).toLocaleString("en-US", { maximumFractionDigits: 6 })}
                          </span>
                          {b.usdValue !== null && (
                            <span className="ml-2 text-slate-500">≈ {fmt(b.usdValue)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total row */}
          {summary.hasMetrics && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/[0.04] px-5 py-3">
              <span className="text-sm font-bold uppercase tracking-wider text-[#e7b949]">Total Portfolio</span>
              <span className="text-xl font-extrabold text-[#e7b949]">{fmt(summary.totalBalance)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
