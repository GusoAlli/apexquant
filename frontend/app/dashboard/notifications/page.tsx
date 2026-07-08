"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Info, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const iconMap: Record<string, React.ReactNode> = {
  signal: <Zap className="h-4 w-4 text-[#e7b949]" />,
  trade:  <TrendingUp className="h-4 w-4 text-emerald-400" />,
  TP_HIT: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  risk:   <TrendingDown className="h-4 w-4 text-red-400" />,
  SL_HIT: <TrendingDown className="h-4 w-4 text-red-400" />,
  system: <Info className="h-4 w-4 text-blue-400" />,
};
const bgMap: Record<string, string> = {
  signal: "border-[#e7b949]/15 bg-[#e7b949]/[0.04]",
  trade:  "border-emerald-500/15 bg-emerald-500/[0.04]",
  TP_HIT: "border-emerald-500/15 bg-emerald-500/[0.04]",
  risk:   "border-red-500/15 bg-red-500/[0.04]",
  SL_HIT: "border-red-500/15 bg-red-500/[0.04]",
  system: "border-blue-500/15 bg-blue-500/[0.04]",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/notifications`, { headers: getAuthHeaders() });
    if (res.ok) setNotifs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await fetch(`${API}/api/notifications/read-all`, { method: "PUT", headers: getAuthHeaders() });
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  const markRead = async (id: string) => {
    await fetch(`${API}/api/notifications/${id}/read`, { method: "PUT", headers: getAuthHeaders() });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const unread = notifs.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:p-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Notifications</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">Notifications</h1>
            <p className="mt-2 text-sm text-slate-400">Real-time alerts for signals, trades, and system events.</p>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-slate-300 hover:text-white">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            <button onClick={load} disabled={loading} className="rounded-lg border border-white/[0.08] p-2 text-slate-500 hover:text-white disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-[#0a0f1a] py-16 text-center">
          <Bell className="mx-auto mb-3 h-7 w-7 text-slate-600" />
          <p className="text-sm font-semibold text-white">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-600">Signals and alerts will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] divide-y divide-white/[0.04] overflow-hidden">
          {notifs.map((n) => (
            <div key={n.id}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`flex gap-4 px-5 py-4 transition cursor-pointer ${n.readAt ? "opacity-60" : "hover:bg-white/[0.02]"}`}>
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${bgMap[n.type] ?? bgMap.system}`}>
                {iconMap[n.type] ?? iconMap.system}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.readAt ? "text-slate-400" : "text-white"}`}>{n.title}</p>
                  <span className="text-[10px] shrink-0 text-slate-600">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
              </div>
              {!n.readAt && <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e7b949]" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
