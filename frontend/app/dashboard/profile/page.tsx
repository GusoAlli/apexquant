"use client";

import { useEffect, useState } from "react";

type Exchange = { id: string; name: string; connected: boolean };

export default function ProfilePage() {
  const [nickname, setNickname] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([
    { id: "binance", name: "Binance", connected: false },
    { id: "okx", name: "OKX", connected: false },
    { id: "hyperliquid", name: "HyperLiquid", connected: false },
  ]);

  useEffect(() => {
    // fetch profile (placeholder)
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        setNickname(data.name || data.nickname || "");
        setPhotoUrl(data.photoUrl || "");
      } catch (e) {
        // ignore
      }
    })();

    // fetch exchange connections (placeholder)
    (async () => {
      try {
        const res = await fetch("/api/user/exchanges");
        if (!res.ok) return;
        const list = await res.json();
        setExchanges((prev) => prev.map((e) => ({ ...e, connected: !!list[e.id] })));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, photoUrl }),
      });
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      setPhotoUrl(data.url);
    } catch (e) {
      // ignore
    }
  };

  const connectExchange = async (id: string) => {
    // open connect flow - placeholder
    window.open(`/api/user/exchange/${id}/connect`, "_blank");
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="mt-6 max-w-2xl">
        <label className="block text-sm font-medium">Avatar</label>
        <div className="mt-2 flex items-center gap-4">
          <img src={photoUrl || "/avatar-placeholder.png"} alt="avatar" className="h-20 w-20 rounded-full object-cover border" />
          <div>
            <input type="file" accept="image/*" onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium">Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-2 w-full rounded border px-3 py-2 bg-slate-900 text-white" />
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={handleSave} disabled={saving} className="rounded bg-yellow-500 px-4 py-2">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Trading Integrations</h2>
          <p className="text-sm text-slate-400">Connect your broker (MT4/MT5) and exchange APIs to run bots.</p>

          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded border p-4">
              <div>
                <div className="font-medium">MT4 / MT5</div>
                <div className="text-sm text-slate-400">Connect your MetaTrader account (server, login).</div>
              </div>
              <div>
                <button className="rounded bg-slate-700 px-3 py-1">Configure</button>
              </div>
            </div>

            {exchanges.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded border p-4">
                <div>
                  <div className="font-medium">{ex.name}</div>
                  <div className="text-sm text-slate-400">API key / secret connection</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded ${ex.connected ? 'bg-emerald-600' : 'bg-slate-600'}`}>{ex.connected ? 'Connected' : 'Not connected'}</span>
                  <button onClick={() => connectExchange(ex.id)} className="rounded bg-slate-700 px-3 py-1">Connect</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
