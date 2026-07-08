"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight,
  RefreshCw, Search, WifiOff, Clock,
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Position = { symbol: string; type: "BUY" | "SELL"; volume: number; openPrice: number; profit: number };
type MT5Account = { id: string; accountNumber: string; broker: string; status: string; balance: number | null; equity: number | null; positions: Position[] };

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── Exchange: Coming Soon ─────────────────────────────────────────────────────

function ExchangeTradesView() {
  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Exchange</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Live Trades</h1>
        <p className="mt-2 text-sm text-slate-400">Real-time crypto trade execution history from connected exchanges.</p>
      </div>
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] p-12 text-center">
        <Clock className="mx-auto mb-3 h-9 w-9 text-slate-600" />
        <h2 className="text-base font-bold text-white">Crypto Trade History</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Live crypto execution logs and order history are coming soon. Connect your exchange accounts in{" "}
          <Link href="/dashboard/accounts" className="text-[#e7b949] hover:underline">Accounts</Link> to get started.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-full border border-[#e7b949]/20 bg-[#e7b949]/[0.06] px-4 py-1.5">
          <Activity className="h-3.5 w-3.5 text-[#e7b949]" />
          <span className="text-xs font-bold text-[#e7b949]">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

// ── Forex: MT5 Open Positions ─────────────────────────────────────────────────

function ForexTradesView() {
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWithAuth(`${API}/api/mt5/accounts`);
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allPositions = accounts.flatMap((acc) =>
    (acc.positions ?? []).map((p) => ({ ...p, accountNumber: acc.accountNumber, broker: acc.broker }))
  );

  const filtered = allPositions.filter((p) => {
    const matchSymbol = filter === "" || p.symbol.toLowerCase().includes(filter.toLowerCase());
    const matchType   = typeFilter === "ALL" || p.type === typeFilter;
    return matchSymbol && matchType;
  });

  const totalProfit = filtered.reduce((s, p) => s + p.profit, 0);
  const buys  = filtered.filter((p) => p.type === "BUY").length;
  const sells = filtered.filter((p) => p.type === "SELL").length;

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Forex / CFD · Live</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Live Trades</h1>
            <p className="mt-2 text-sm text-slate-400">Real-time open positions streamed from your MT5 terminals.</p>
          </div>
          <button onClick={() => load()} disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Open Positions", value: allPositions.length.toString(), color: "text-white" },
          { label: "Total Float P&L", value: (totalProfit >= 0 ? "+" : "") + "$" + fmt(totalProfit), color: totalProfit >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Buy Positions",  value: buys.toString(),  color: "text-emerald-400" },
          { label: "Sell Positions", value: sells.toString(), color: "text-red-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest">{k.label}</p>
            <p className={`mt-2 text-2xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        {/* Filter bar inside the card */}
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by symbol…"
              className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
            />
          </div>
          <div className="flex rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5 gap-0.5">
            {(["ALL", "BUY", "SELL"] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`rounded-md px-4 py-1.5 text-xs font-bold transition ${
                  typeFilter === t
                    ? t === "BUY"  ? "bg-emerald-500/15 text-emerald-400"
                    : t === "SELL" ? "bg-red-500/15 text-red-400"
                    : "bg-white/[0.08] text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : allPositions.length === 0 ? (
          <div className="py-16 text-center">
            <WifiOff className="mx-auto mb-3 h-7 w-7 text-slate-600" />
            <p className="text-sm font-semibold text-white">No open positions</p>
            <p className="mt-1 text-xs text-slate-600">
              Connect MT5 in{" "}
              <Link href="/dashboard/accounts" className="text-[#e7b949] hover:underline">Accounts</Link>
              {" "}to stream live trades.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">No positions match filter.</p>
        ) : (
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
                {filtered.map((p, i) => (
                  <tr key={i} className="group transition hover:bg-white/[0.02]">
                    <td className="py-3 font-mono font-bold text-white">{p.symbol}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold
                        ${p.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {p.type === "BUY" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{fmt(p.volume, 2)}</td>
                    <td className="py-3 font-mono text-slate-400">{fmt(p.openPrice, 5)}</td>
                    <td className="py-3 text-xs text-slate-500">#{p.accountNumber} {p.broker}</td>
                    <td className={`py-3 text-right font-bold font-mono ${p.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.profit >= 0 ? "+" : "-"}${Math.abs(p.profit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td colSpan={5} className="pt-3 text-xs text-slate-600">{filtered.length} position{filtered.length !== 1 ? "s" : ""}</td>
                  <td className={`pt-3 text-right font-extrabold ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalProfit >= 0 ? "+" : "-"}${Math.abs(totalProfit).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const mode = useMode();
  return mode === "forex" ? <ForexTradesView /> : <ExchangeTradesView />;
}
