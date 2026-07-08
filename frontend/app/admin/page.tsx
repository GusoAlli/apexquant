"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, DollarSign, RefreshCw, Users, Wifi, Zap } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Stats = {
  userCount: number;
  activeSubs: number;
  mt5Count: number;
  cexCount: number;
  signalCount: number;
  totalRevenueCents: number;
  recentUsers: Array<{ email: string; name: string | null; createdAt: string }>;
};

function StatCard({ label, value, icon: Icon, sub, href }: {
  label: string; value: string; icon: React.ElementType; sub?: string; href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5 transition hover:border-white/[0.12]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-[#e7b949]" />
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminDashboardPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken") ?? "";
    const res   = await fetch(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-[#e7b949]" />
      </div>
    );
  }

  const revenue = ((stats?.totalRevenueCents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Overview</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Platform Dashboard</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-white/[0.08] p-2.5 text-slate-500 transition hover:text-white disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Users"   value={(stats?.userCount    ?? 0).toString()} icon={Users}    href="/admin/users"   sub="Click to manage" />
        <StatCard label="Active Subs"   value={(stats?.activeSubs   ?? 0).toString()} icon={Activity} sub="Paid subscriptions" />
        <StatCard label="Total Revenue" value={revenue}                               icon={DollarSign} sub="Stripe payments" />
        <StatCard label="MT5 Accounts"  value={(stats?.mt5Count     ?? 0).toString()} icon={Wifi}     sub="Active terminals" />
        <StatCard label="CEX Accounts"  value={(stats?.cexCount     ?? 0).toString()} icon={BarChart3} sub="Active broker accounts" />
        <StatCard label="AI Signals"    value={(stats?.signalCount  ?? 0).toString()} icon={Zap}      href="/admin/signals" sub="Click to manage" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Manage Users",   href: "/admin/users",   desc: "Promote/demote admins, view subscriptions" },
          { label: "Signal Manager", href: "/admin/signals", desc: "Publish AI signals to all subscribers" },
          { label: "Engine Control", href: "/admin/engine",  desc: "Start/stop scheduler, run engine, view performance" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-[#e7b949]/20 hover:bg-[#e7b949]/[0.03]"
          >
            <p className="text-sm font-bold text-white">{l.label}</p>
            <p className="mt-1 text-xs text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>

      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Recent Signups</p>
          <div className="space-y-1">
            {stats.recentUsers.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-white">{u.name ?? u.email}</p>
                  {u.name && <p className="text-xs text-slate-500">{u.email}</p>}
                </div>
                <p className="text-xs text-slate-600">{new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
