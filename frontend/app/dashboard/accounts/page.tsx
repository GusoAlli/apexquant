"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  CircleDot, Clock, Copy, Download, Eye, EyeOff,
  Plus, RefreshCw, RotateCcw, Terminal, Trash2,
  Wifi, WifiOff, X,
} from "lucide-react";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { IconifySymbol } from "@/components/ui/icon";
import { fetchWithAuth } from "@/lib/auth";
import { useMode } from "@/lib/useMode";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Shared types ─────────────────────────────────────────────────────────────

type BrokerAccount = {
  id: string;
  type: string;
  label: string;
  status: string;
  errorMsg: string | null;
  lastSync: string | null;
  balances: Array<{ asset: string; free: number; locked: number; usdValue: number | null }>;
};

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

type ExchangeDef = {
  type: string;
  name: string;
  icon: ReactElement;
  fields: Array<{ key: string; label: string; secret?: boolean; placeholder?: string }>;
};

// ── Exchange definitions ──────────────────────────────────────────────────────

const EXCHANGES: ExchangeDef[] = [
  {
    type: "binance", name: "Binance",
    icon: <IconifySymbol icon="simple-icons:binance" className="h-5 w-5 text-yellow-400" />,
    fields: [
      { key: "apiKey",    label: "API Key",    placeholder: "Your Binance API Key" },
      { key: "apiSecret", label: "API Secret", secret: true, placeholder: "Your Binance API Secret" },
    ],
  },
  {
    type: "okx", name: "OKX",
    icon: <IconifySymbol icon="simple-icons:okx" className="h-5 w-5 text-white" />,
    fields: [
      { key: "apiKey",     label: "API Key",    placeholder: "OKX API Key" },
      { key: "apiSecret",  label: "API Secret", secret: true, placeholder: "OKX Secret Key" },
      { key: "passphrase", label: "Passphrase", secret: true, placeholder: "API Passphrase" },
    ],
  },
  {
    type: "bybit", name: "Bybit",
    icon: <BrandIcon name="bybit" size={20} />,
    fields: [
      { key: "apiKey",    label: "API Key",    placeholder: "Bybit API Key" },
      { key: "apiSecret", label: "API Secret", secret: true, placeholder: "Bybit API Secret" },
    ],
  },
  {
    type: "hyperliquid", name: "HyperLiquid",
    icon: <BrandIcon name="hyperliquid" size={20} />,
    fields: [{ key: "walletAddress", label: "Wallet Address", placeholder: "0x..." }],
  },
];

const EXCHANGE_ICON: Record<string, ReactElement> = {
  binance:     <IconifySymbol icon="simple-icons:binance"    className="h-4 w-4 text-yellow-400" />,
  okx:         <IconifySymbol icon="simple-icons:okx"        className="h-4 w-4 text-white" />,
  bybit:       <BrandIcon name="bybit" size={16} />,
  hyperliquid: <BrandIcon name="hyperliquid" size={16} />,
  mt5:         <BrandIcon name="metatrader" size={16} />,
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

function StatusBadge({ status }: { status: string }) {
  const cfg = ({
    active:       { icon: <CheckCircle2 className="h-3 w-3" />, cls: "text-emerald-400 bg-emerald-400/10" },
    error:        { icon: <AlertCircle  className="h-3 w-3" />, cls: "text-red-400 bg-red-500/10" },
    pending:      { icon: <Clock className="h-3 w-3 animate-pulse" />, cls: "text-yellow-400 bg-yellow-400/10" },
    disconnected: { icon: <CircleDot   className="h-3 w-3" />, cls: "text-slate-500 bg-white/[0.04]" },
  } as Record<string, { icon: ReactElement; cls: string }>)[status] ?? { icon: <CircleDot className="h-3 w-3" />, cls: "text-slate-500 bg-white/[0.04]" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>
      {cfg.icon} {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      title="Copy" className="rounded-md border border-white/[0.08] p-1.5 text-slate-400 transition hover:text-white">
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e7b949]/40 bg-[#e7b949]/10 text-xs font-bold text-[#e7b949]">{n}</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold text-white">{title}</p>
        <div className="mt-2 text-sm text-slate-400">{children}</div>
      </div>
    </div>
  );
}

// ── Tab: Exchanges (CEX) ──────────────────────────────────────────────────────

function ExchangesTab() {
  const [accounts, setAccounts]   = useState<BrokerAccount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState<string | null>(null);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState<ExchangeDef | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/api/brokers`);
      if (res.ok) setAccounts(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (ex: ExchangeDef) => {
    setSelected(ex); setFormLabel(ex.name); setFormFields({});
    setShowSecret({}); setFormError(null); setModalOpen(true);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setSubmitting(true); setFormError(null);
    try {
      const res = await fetchWithAuth(`${API}/api/brokers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selected.type, label: formLabel, credentials: formFields }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? "Failed to add account."); return; }
      setModalOpen(false); await load();
    } catch { setFormError("Connection error. Try again."); }
    finally { setSubmitting(false); }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try { await fetchWithAuth(`${API}/api/brokers/${id}/sync`, { method: "POST" }); await load(); }
    catch {} finally { setSyncing(null); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this account? This cannot be undone.")) return;
    setRemoving(id);
    try {
      await fetchWithAuth(`${API}/api/brokers/${id}`, { method: "DELETE" });
      setAccounts((p) => p.filter((a) => a.id !== id));
    } catch {} finally { setRemoving(null); }
  };

  return (
    <div className="space-y-5">
      {/* Exchange picker */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Add Exchange</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXCHANGES.map((ex) => (
            <button key={ex.type} onClick={() => openModal(ex)}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5 text-left transition hover:border-[#e7b949]/30 hover:bg-[#e7b949]/[0.04]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                {ex.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{ex.name}</p>
                <p className="text-[10px] text-slate-500">API Key</p>
              </div>
              <Plus className="ml-auto h-4 w-4 text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Account list */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Connected Exchanges</p>
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] py-10 text-center">
            <p className="text-sm text-slate-500">No exchange accounts connected yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => {
              const totalUsd = acc.balances.reduce((s, b) => s + (b.usdValue ?? 0), 0);
              return (
                <div key={acc.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                      {EXCHANGE_ICON[acc.type] ?? <CircleDot className="h-4 w-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{acc.label}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge status={acc.status} />
                        {acc.lastSync && (
                          <span className="text-[10px] text-slate-600">{new Date(acc.lastSync).toLocaleTimeString()}</span>
                        )}
                      </div>
                      {acc.errorMsg && <p className="mt-1 text-xs text-red-400">{acc.errorMsg}</p>}
                    </div>
                    <p className={`text-lg font-extrabold ${acc.status === "active" ? "text-[#e7b949]" : "text-slate-500"}`}>
                      {fmt(acc.balances.length > 0 ? totalUsd : null)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleSync(acc.id)} disabled={syncing === acc.id} title="Sync now"
                        className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 transition hover:text-white disabled:opacity-40">
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing === acc.id ? "animate-spin" : ""}`} />
                      </button>
                      <button onClick={() => handleRemove(acc.id)} disabled={removing === acc.id} title="Remove"
                        className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 transition hover:text-red-400 disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {acc.balances.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                      {acc.balances.filter((b) => b.free + b.locked > 0).map((b) => (
                        <span key={b.asset} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs">
                          <span className="font-bold text-white">{b.asset}</span>
                          <span className="ml-1.5 font-mono text-slate-400">
                            {(b.free + b.locked).toLocaleString("en-US", { maximumFractionDigits: 6 })}
                          </span>
                          {b.usdValue !== null && <span className="ml-1.5 text-slate-500">≈ {fmt(b.usdValue)}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect modal */}
      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1520] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  {selected.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Connect {selected.name}</p>
                  <p className="text-xs text-slate-500">Read-only API key recommended</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Label</label>
                <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)}
                  className="apex-input w-full" placeholder="e.g. My Binance Main" />
              </div>
              {selected.fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">{f.label}</label>
                  <div className="relative">
                    <input type={f.secret && !showSecret[f.key] ? "password" : "text"}
                      value={formFields[f.key] ?? ""}
                      onChange={(e) => setFormFields((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="apex-input w-full pr-10" placeholder={f.placeholder} />
                    {f.secret && (
                      <button type="button"
                        onClick={() => setShowSecret((p) => ({ ...p, [f.key]: !p[f.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        {showSecret[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {formError && (
              <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">{formError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={submitting}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
                {submitting ? "Connecting…" : "Connect"}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-slate-600">
              API keys are encrypted with AES-256-GCM and never stored in plain text.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MT5 disconnect confirm modal ──────────────────────────────────────────────

function DisconnectModal({
  account,
  onConfirm,
  onCancel,
  loading,
}: {
  account: MT5Account;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d1520] p-6 shadow-2xl">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
            <WifiOff className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white">Disconnect MT5 Account</p>
            <p className="mt-0.5 text-xs text-slate-400">
              This will remove the account record from ApexQuant. The EA running in MetaTrader will stop sending data until re-connected.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full shrink-0 ${
              account.lastPing && (Date.now() - new Date(account.lastPing).getTime()) < 120_000
                ? "bg-emerald-400"
                : "bg-slate-600"
            }`} />
            <div>
              <p className="text-sm font-bold text-white">#{account.accountNumber}</p>
              <p className="text-xs text-slate-500">{account.broker}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold text-[#e7b949]">{fmt(account.equity ?? account.balance)}</p>
              <p className="text-[10px] text-slate-600">Equity</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MT5 account card ──────────────────────────────────────────────────────────

function MT5AccountCard({
  acc,
  onDisconnect,
}: {
  acc: MT5Account;
  onDisconnect: (acc: MT5Account) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const pingMs        = acc.lastPing ? Date.now() - new Date(acc.lastPing).getTime() : Infinity;
  const isLive        = pingMs < 120_000;
  const isStale       = pingMs >= 120_000 && pingMs < 3_600_000;
  const totalProfit   = acc.positions.reduce((s, p) => s + p.profit, 0);

  const statusBadge = isLive
    ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>
    : isStale
    ? <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />OFFLINE</span>
    : <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-600" />NO SIGNAL</span>;

  return (
    <div className={`rounded-xl border bg-white/[0.02] transition ${isLive ? "border-emerald-500/20" : "border-white/[0.06]"}`}>
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        {/* Icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          isLive ? "border-emerald-500/20 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.04]"
        }`}>
          <BrandIcon name="metatrader" size={20} />
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">#{acc.accountNumber}</p>
            {statusBadge}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
            <span>{acc.broker}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeSince(acc.lastPing)}
            </span>
            {acc.positions.length > 0 && (
              <span className="text-slate-400">{acc.positions.length} position{acc.positions.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        {/* Financials */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-xs text-slate-600">Balance</p>
            <p className="text-sm font-bold text-white">{fmt(acc.balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Equity</p>
            <p className={`text-sm font-bold ${isLive ? "text-[#e7b949]" : "text-slate-400"}`}>{fmt(acc.equity ?? acc.balance)}</p>
          </div>
          {acc.positions.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-600">Floating P&L</p>
              <p className={`text-sm font-bold ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {acc.positions.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              title={expanded ? "Hide positions" : "Show positions"}
              className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 transition hover:text-white"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            onClick={() => onDisconnect(acc)}
            title="Disconnect this MT5 account"
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-1.5 text-xs font-bold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10"
          >
            <WifiOff className="h-3 w-3" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Positions table */}
      {expanded && acc.positions.length > 0 && (
        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Open Positions ({acc.positions.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2 font-medium">Symbol</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Volume</th>
                  <th className="pb-2 font-medium">Open Price</th>
                  <th className="pb-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {acc.positions.map((p, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono font-bold text-white">{p.symbol}</td>
                    <td className={`py-1.5 font-bold ${p.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{p.type}</td>
                    <td className="py-1.5 text-slate-300">{p.volume}</td>
                    <td className="py-1.5 font-mono text-slate-400">{p.openPrice}</td>
                    <td className={`py-1.5 text-right font-bold ${p.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.profit >= 0 ? "+" : ""}${p.profit.toFixed(2)}
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

// ── Tab: MT5 / Forex ──────────────────────────────────────────────────────────

function MT5Tab() {
  const [hasToken, setHasToken]     = useState(false);
  const [tokenAge, setTokenAge]     = useState<string | null>(null);
  const [rawToken, setRawToken]     = useState<string | null>(null);
  const [showToken, setShowToken]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [accounts, setAccounts]     = useState<MT5Account[]>([]);
  const [loadingAcc, setLoadingAcc] = useState(true);
  const [disconnectTarget, setDisconnectTarget] = useState<MT5Account | null>(null);
  const [disconnecting, setDisconnecting]       = useState(false);
  const [showEA, setShowEA]         = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetchWithAuth(`${API}/api/mt5/token/status`);
    if (res.ok) {
      const d = await res.json();
      setHasToken(d.hasToken);
      setTokenAge(d.createdAt ? new Date(d.createdAt).toLocaleDateString() : null);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoadingAcc(true);
    const res = await fetchWithAuth(`${API}/api/mt5/accounts`);
    if (res.ok) setAccounts(await res.json());
    setLoadingAcc(false);
  }, []);

  useEffect(() => { loadStatus(); loadAccounts(); }, [loadStatus, loadAccounts]);

  const handleGenerate = async () => {
    if (hasToken && !confirm("Generating a new token will disconnect all running EAs. Continue?")) return;
    setGenerating(true);
    const res = await fetchWithAuth(`${API}/api/mt5/token`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setRawToken(d.token); setShowToken(true);
      setHasToken(true); setTokenAge(new Date().toLocaleDateString());
    }
    setGenerating(false);
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    await fetchWithAuth(`${API}/api/mt5/accounts/${disconnectTarget.id}`, { method: "DELETE" });
    setAccounts((p) => p.filter((a) => a.id !== disconnectTarget.id));
    setDisconnecting(false);
    setDisconnectTarget(null);
  };

  const liveCount   = accounts.filter(a => a.lastPing && (Date.now() - new Date(a.lastPing).getTime()) < 120_000).length;
  const eaCode      = generateEACode(API);

  return (
    <div className="space-y-5">
      {/* Setup guide */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <p className="mb-6 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Setup Guide</p>
        <div className="space-y-6">
          <Step n={1} title="Generate your Connection Token">
            <p className="mb-3">
              The EA uses this token to authenticate with ApexQuant. Generate one below — store it safely, shown only once.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {hasToken && tokenAge && !rawToken && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Token generated on {tokenAge}
                </div>
              )}
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
                {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {hasToken ? "Rotate Token" : "Generate Token"}
              </button>
            </div>
            {rawToken && (
              <div className="mt-4 rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/[0.04] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#e7b949]">Your Token — copy now, won't be shown again</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowToken((v) => !v)} className="text-slate-500 hover:text-white">
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <CopyButton text={rawToken} />
                  </div>
                </div>
                <code className="block break-all font-mono text-xs text-white">
                  {showToken ? rawToken : "•".repeat(64)}
                </code>
              </div>
            )}
          </Step>

          <Step n={2} title="Download & Install the Expert Advisor">
            <p className="mb-3">
              Download <strong className="text-white">ApexQuant_Bridge.mq5</strong> and copy it to your MT5{" "}
              <code className="rounded bg-white/[0.06] px-1 text-[11px] text-white">MQL5/Experts/</code> folder, then compile (F7) in MetaEditor.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => {
                const blob = new Blob([eaCode], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "ApexQuant_Bridge.mq5";
                a.click();
              }} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]">
                <Download className="h-4 w-4" /> Download .mq5
              </button>
              <button onClick={() => setShowEA((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]">
                <Terminal className="h-4 w-4" /> {showEA ? "Hide" : "View"} Code
              </button>
            </div>
            {showEA && (
              <div className="relative mt-4">
                <pre className="max-h-72 overflow-auto rounded-xl border border-white/[0.06] bg-black/40 p-4 font-mono text-[11px] text-slate-300">{eaCode}</pre>
                <div className="absolute right-3 top-3"><CopyButton text={eaCode} /></div>
              </div>
            )}
          </Step>

          <Step n={3} title="Attach EA to a Chart & Configure">
            <p className="mb-3">Drag the EA onto any chart. In the EA settings, fill in:</p>
            <div className="space-y-2">
              {[
                { label: "ServerURL", value: `${API}/api/mt5/ping` },
                { label: "Token",     value: rawToken ?? "(your generated token from step 1)" },
                { label: "SendIntervalSeconds", value: "30" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="w-44 shrink-0 text-xs text-slate-500">{row.label}</span>
                  <code className="flex-1 break-all font-mono text-xs text-white">{row.value}</code>
                  {row.value !== "(your generated token from step 1)" && <CopyButton text={row.value} />}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">
              Enable "Allow WebRequests" in MT5 → Tools → Options → Expert Advisors and add{" "}
              <strong className="text-slate-400">{API}</strong>.
            </p>
          </Step>

          <Step n={4} title="Verify Connection">
            Once the EA is running, your MT5 account will appear in <strong className="text-white">Connected Accounts</strong> below within 30 seconds.
            A <span className="font-bold text-emerald-400">LIVE</span> badge means the connection is active.
            You can connect <strong className="text-white">multiple MT5 accounts</strong> — each account running the EA will appear as a separate entry.
          </Step>
        </div>
      </div>

      {/* Connected MT5 accounts */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">MT5 Accounts</p>
            {accounts.length > 0 && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""} registered
                {liveCount > 0 && <> · <span className="text-emerald-400 font-semibold">{liveCount} live</span></>}
              </p>
            )}
          </div>
          <button onClick={loadAccounts} disabled={loadingAcc} title="Refresh" className="text-slate-500 hover:text-white transition">
            <RefreshCw className={`h-4 w-4 ${loadingAcc ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingAcc ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] py-12 text-center">
            <WifiOff className="mx-auto mb-3 h-7 w-7 text-slate-700" />
            <p className="text-sm font-semibold text-slate-400">No MT5 accounts connected</p>
            <p className="mt-1 text-xs text-slate-600">Follow the setup guide above to connect your first terminal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <MT5AccountCard
                key={acc.id}
                acc={acc}
                onDisconnect={setDisconnectTarget}
              />
            ))}
          </div>
        )}

        {/* Multi-account tip */}
        {accounts.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-3.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400/60" />
            <p className="text-[11px] text-slate-500">
              To add another MT5 account, attach the EA to a chart in that terminal using the same token.
              Each account number will appear as a separate entry above.
            </p>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.05] p-4 text-sm text-slate-400">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>
          The EA only <strong className="text-white">reads</strong> your account data — it never places or modifies trades.
          Use a <strong className="text-white">read-only</strong> API token within MT5 if your broker supports it.
        </span>
      </div>

      {/* Disconnect confirmation modal */}
      {disconnectTarget && (
        <DisconnectModal
          account={disconnectTarget}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setDisconnectTarget(null)}
          loading={disconnecting}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const mode = useMode();

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
          {mode === "forex" ? "Forex / CFD" : "Exchange"} · Accounts
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">
          {mode === "forex" ? "MT5 / Forex Accounts" : "Exchange Accounts"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "forex"
            ? "Connect MetaTrader 5 terminals via the EA Bridge to stream live balance and positions."
            : "Connect your crypto exchange accounts via API keys to track balances in real-time."}
        </p>
      </div>

      {/* Content — render only the relevant section for the active mode */}
      {mode === "forex" ? <MT5Tab /> : <ExchangesTab />}
    </div>
  );
}

// ── EA code generator ─────────────────────────────────────────────────────────

function generateEACode(serverUrl: string): string {
  return `//+------------------------------------------------------------------+
//|  ApexQuant Bridge EA                                              |
//|  Streams account data to ApexQuant dashboard every N seconds.    |
//+------------------------------------------------------------------+
#property copyright "ApexQuant"
#property version   "1.0"
#property strict

input string ServerURL           = "${serverUrl}/api/mt5/ping";
input string Token               = "";
input int    SendIntervalSeconds = 30;

int timerSeconds = 0;

int OnInit() {
   EventSetTimer(1);
   SendData();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTimer() {
   timerSeconds++;
   if(timerSeconds >= SendIntervalSeconds) { timerSeconds = 0; SendData(); }
}

void SendData() {
   string accountNumber = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string broker        = AccountInfoString(ACCOUNT_COMPANY);
   double balance       = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity        = AccountInfoDouble(ACCOUNT_EQUITY);

   string posJson = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++) {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket)) continue;
      string sym    = PositionGetString(POSITION_SYMBOL);
      int    ptype  = (int)PositionGetInteger(POSITION_TYPE);
      double vol    = PositionGetDouble(POSITION_VOLUME);
      double profit = PositionGetDouble(POSITION_PROFIT);
      double oprice = PositionGetDouble(POSITION_PRICE_OPEN);
      string typeStr = (ptype == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      if(i > 0) posJson += ",";
      posJson += StringFormat(
         "{\\"symbol\\":\\"%s\\",\\"type\\":\\"%s\\",\\"volume\\":%.2f,\\"openPrice\\":%.5f,\\"profit\\":%.2f}",
         sym, typeStr, vol, oprice, profit);
   }
   posJson += "]";

   string body = StringFormat(
      "{\\"accountNumber\\":\\"%s\\",\\"broker\\":\\"%s\\",\\"balance\\":%.2f,\\"equity\\":%.2f,\\"positions\\":%s}",
      accountNumber, broker, balance, equity, posJson);

   char post[]; char result[]; string responseHeaders;
   StringToCharArray(body, post, 0, StringLen(body));
   string headers = "Content-Type: application/json\\r\\nAuthorization: Bearer " + Token;
   int res = WebRequest("POST", ServerURL, headers, 5000, post, result, responseHeaders);
   if(res == -1) Print("[ApexQuant] Error: ", GetLastError());
   else Print("[ApexQuant] Ping OK. Status: ", res);
}
`;
}
