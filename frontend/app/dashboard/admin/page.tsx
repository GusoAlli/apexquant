"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, Shield, Users, Zap, Activity, DollarSign, Wifi } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

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

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/admin/stats`, { headers: getAuthHeaders() });
      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      if (res.ok) setStats(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><RefreshCw className="h-5 w-5 animate-spin text-[#e7b949]" /></div>;

  if (forbidden) return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <Shield className="h-10 w-10 text-red-400" />
      <p className="text-lg font-bold text-white">Access Denied</p>
      <p className="text-sm text-slate-500">Admin role required to access this panel.</p>
    </div>
  );

  const revenue = ((stats?.totalRevenueCents ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-[#e7b949]/15 bg-[#0a0f1a] p-6 lg:p-8" style={{ background: "linear-gradient(160deg,rgba(231,185,73,0.06) 0%,transparent 100%)" }}>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[#e7b949]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Admin</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Admin Panel</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Users"     value={(stats?.userCount ?? 0).toString()} icon={Users}      href="/dashboard/admin/users" sub="Click to manage" />
        <StatCard label="Active Subs"     value={(stats?.activeSubs ?? 0).toString()} icon={Activity}  sub="Paid subscriptions" />
        <StatCard label="Total Revenue"   value={revenue}                             icon={DollarSign} sub="Stripe payments succeeded" />
        <StatCard label="MT5 Accounts"    value={(stats?.mt5Count ?? 0).toString()}   icon={Wifi}       sub="Active terminals" />
        <StatCard label="CEX Accounts"    value={(stats?.cexCount ?? 0).toString()}   icon={BarChart3}  sub="Active broker accounts" />
        <StatCard label="AI Signals"      value={(stats?.signalCount ?? 0).toString()} icon={Zap}       href="/dashboard/admin/signals" sub="Click to manage" />
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Manage Users",   href: "/dashboard/admin/users",   desc: "View all users, subscriptions" },
          { label: "Signal Manager", href: "/dashboard/admin/signals", desc: "Publish AI signals to all users" },
          { label: "Licenses",       href: "/dashboard/licenses",       desc: "Manage platform licenses" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-[#e7b949]/20 hover:bg-[#e7b949]/[0.03]">
            <p className="text-sm font-bold text-white">{l.label}</p>
            <p className="mt-1 text-xs text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent users */}
      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#e7b949]">Recent Signups</p>
          <div className="space-y-2">
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
