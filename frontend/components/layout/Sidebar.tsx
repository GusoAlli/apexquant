"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BarChart3, Bolt, CreditCard, ShieldCheck, Settings, TrendingUp, User2 } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  { label: "Trading Accounts", icon: Bolt, href: "/dashboard/accounts" },
  { label: "EA Management", icon: ShieldCheck, href: "/dashboard/ea" },
  { label: "Licenses", icon: CreditCard, href: "/dashboard/licenses" },
  { label: "Analytics", icon: TrendingUp, href: "/analytics" },
  { label: "Billing", icon: ArrowRight, href: "/subscription" },
  { label: "Downloads", icon: ArrowRight, href: "/dashboard/downloads" },
  { label: "Support", icon: User2, href: "/dashboard/support" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-80 flex-col gap-8 border-r border-white/10 bg-[#040507] p-6 text-slate-200 xl:flex">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-yellow-500 text-black text-2xl font-bold">A</div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-yellow-300/90">ApexQuant</p>
            <p className="text-2xl font-semibold text-white">Trading Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition ${
                active ? "bg-white/5 text-yellow-300 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {active && <ArrowRight className="h-4 w-4 text-yellow-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-white/10 bg-[#05101f] p-5 text-sm text-slate-300">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-500">Account</p>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-yellow-300">JT</div>
          <div>
            <p className="text-sm font-semibold text-white">John Trader</p>
            <p className="text-xs text-slate-500">johntrader@gmail.com</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
        >
          <span>Log out</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}