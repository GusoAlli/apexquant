"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RefreshCw, Trash2, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Signal = {
  id: string; pair: string; direction: string; entry: number; tp: number;
  sl: number; strength: number; timeframe: string; model: string;
  status: string; pips: number | null; createdAt: string;
};

const MODELS = ["Gold Momentum AI", "FX Mean Reversion", "Index Breakout Desk", "Crypto Momentum AI", "Multi-Asset AI"];
const TFS    = ["M15", "M30", "H1", "H4", "D1", "W1"];

const defaultForm = {
  pair: "", direction: "BUY", entry: "", tp: "", sl: "",
  strength: "80", timeframe: "H4", model: MODELS[0],
};

export default function AdminSignalsPage() {
  const [signals,     setSignals]     = useState<Signal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(defaultForm);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);

  const authHdr = () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
    return { Authorization: `Bearer ${t}` };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/signals`, { headers: authHdr() });
    if (res.ok) setSignals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`${API}/api/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHdr() },
      body: JSON.stringify({
        pair:      form.pair.trim().toUpperCase(),
        direction: form.direction,
        entry:     parseFloat(form.entry),
        tp:        parseFloat(form.tp),
        sl:        parseFloat(form.sl),
        strength:  parseInt(form.strength),
        timeframe: form.timeframe,
        model:     form.model,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message ?? "Failed"); setSubmitting(false); return; }
    setSignals((prev) => [data, ...prev]);
    setShowForm(false);
    setForm(defaultForm);
    setSubmitting(false);
  };

  const handleStatusUpdate = async (id: string, status: string, pips?: number) => {
    setUpdatingId(id);
    const res = await fetch(`${API}/api/signals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHdr() },
      body: JSON.stringify({ status, pips }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSignals((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this signal?")) return;
    await fetch(`${API}/api/signals/${id}`, { method: "DELETE", headers: authHdr() });
    setSignals((prev) => prev.filter((s) => s.id !== id));
  };

  const f = (k: keyof typeof defaultForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Admin</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Signal Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Publish signals — notifies all active subscribers instantly.</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#060b14]"
          style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}
        >
          <Plus className="h-4 w-4" /> New Signal
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[#e7b949]/15 bg-[#0a0f1a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Publish New Signal</p>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Pair",       key: "pair"     as const, placeholder: "e.g. XAUUSD" },
              { label: "Entry",      key: "entry"    as const, placeholder: "e.g. 2318.40" },
              { label: "Take Profit",key: "tp"       as const, placeholder: "e.g. 2342.00" },
              { label: "Stop Loss",  key: "sl"       as const, placeholder: "e.g. 2304.00" },
              { label: "Confidence %",key: "strength"as const, placeholder: "80" },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</label>
                <input value={form[field.key]} onChange={(e) => f(field.key, e.target.value)}
                  className="apex-input w-full text-sm" placeholder={field.placeholder} />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Direction</label>
              <select value={form.direction} onChange={(e) => f("direction", e.target.value)} className="apex-input w-full text-sm">
                <option>BUY</option><option>SELL</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Timeframe</label>
              <select value={form.timeframe} onChange={(e) => f("timeframe", e.target.value)} className="apex-input w-full text-sm">
                {TFS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Model</label>
              <select value={form.model} onChange={(e) => f("model", e.target.value)} className="apex-input w-full text-sm">
                {MODELS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={handleCreate} disabled={submitting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#060b14] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
              {submitting ? "Publishing…" : "Publish Signal"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">All Signals ({signals.length})</p>
          <button onClick={load} disabled={loading} className="text-slate-500 hover:text-white disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : signals.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600">No signals published yet.</p>
        ) : (
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.direction === "BUY" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {s.direction === "BUY"
                    ? <ArrowUpRight   className="h-4 w-4 text-emerald-400" />
                    : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-bold text-white">
                    {s.pair} <span className="font-mono text-xs text-slate-500">@ {s.entry}</span>
                  </p>
                  <p className="text-xs text-slate-500">{s.model} · {s.timeframe} · {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  s.status === "ACTIVE"  ? "bg-emerald-500/10 text-emerald-400"
                  : s.status === "TP_HIT" ? "bg-blue-500/10 text-blue-400"
                  : s.status === "SL_HIT" ? "bg-red-500/10 text-red-400"
                  : "bg-white/[0.04] text-slate-500"
                }`}>{s.status}</span>
                {s.status === "ACTIVE" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { const p = prompt("Pips (TP hit):"); handleStatusUpdate(s.id, "TP_HIT", p ? parseFloat(p) : undefined); }}
                      disabled={updatingId === s.id}
                      className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 disabled:opacity-40">
                      TP
                    </button>
                    <button
                      onClick={() => { const p = prompt("Pips (SL hit):"); handleStatusUpdate(s.id, "SL_HIT", p ? parseFloat(p) : undefined); }}
                      disabled={updatingId === s.id}
                      className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-40">
                      SL
                    </button>
                  </div>
                )}
                <button
                  onClick={() => handleDelete(s.id)}
                  className="rounded-lg border border-white/[0.08] p-1.5 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
