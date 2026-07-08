"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy, CheckCircle2, Eye, EyeOff, Key, Plus,
  RefreshCw, Trash2, AlertCircle,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsed: string | null;
  createdAt: string;
};

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:text-white">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys]           = useState<ApiKey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [newKey, setNewKey]       = useState<string | null>(null);
  const [showKey, setShowKey]     = useState(false);
  const [revoking, setRevoking]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/keys`, { headers: getAuthHeaders() });
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch(`${API}/api/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message ?? "Failed"); setCreating(false); return; }
    setNewKey(data.key);
    setShowKey(true);
    setNewName("");
    setShowForm(false);
    await load();
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    setRevoking(id);
    await fetch(`${API}/api/keys/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    setKeys((p) => p.filter((k) => k.id !== id));
    setRevoking(null);
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Developer</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">API Keys</h1>
            <p className="mt-2 text-sm text-slate-400">
              Use API keys to authenticate programmatic access to ApexQuant. Max 10 active keys.
            </p>
          </div>
          <button onClick={() => { setShowForm((v) => !v); setNewKey(null); }}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#060b14]"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
            <Plus className="h-4 w-4" /> New API Key
          </button>
        </div>
      </div>

      {/* New key alert */}
      {newKey && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> API key created — copy it now, it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowKey((v) => !v)} className="text-slate-500 hover:text-white">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyBtn text={newKey} />
            </div>
          </div>
          <code className="block break-all rounded-lg bg-black/30 p-3 font-mono text-xs text-white">
            {showKey ? newKey : "•".repeat(newKey.length)}
          </code>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <p className="mb-4 text-sm font-semibold text-white">Create New API Key</p>
          <div className="flex gap-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. My Trading Bot"
              className="apex-input flex-1" />
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#060b14] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}>
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Generate"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Active Keys</p>
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.06] py-10 text-center">
            <Key className="mx-auto mb-2 h-6 w-6 text-slate-600" />
            <p className="text-sm text-slate-500">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <Key className="h-4 w-4 text-[#e7b949]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{k.name}</p>
                  <code className="text-xs text-slate-500">{k.keyPrefix}••••••••••••••••••••••••••••••••••••••••••••••••</code>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>Created {new Date(k.createdAt).toLocaleDateString()}</p>
                  {k.lastUsed && <p className="text-slate-700">Last used {new Date(k.lastUsed).toLocaleDateString()}</p>}
                </div>
                <button onClick={() => handleRevoke(k.id)} disabled={revoking === k.id}
                  className="rounded-lg border border-white/[0.08] p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.05] p-4 text-sm text-slate-400">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <span>
          Include the key in the <code className="rounded bg-white/[0.06] px-1 text-white">Authorization</code> header:{" "}
          <code className="rounded bg-white/[0.06] px-1 text-white">Authorization: Bearer apx_...</code>
        </span>
      </div>
    </div>
  );
}
