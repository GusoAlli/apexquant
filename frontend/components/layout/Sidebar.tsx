"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Briefcase,
  Building2,
  CandlestickChart,
  Clock,
  CreditCard,
  DollarSign,
  FlaskConical,
  Globe,
  Key,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Percent,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth, logout } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type NavItem  = { label: string; icon: React.ElementType; href: string };
type NavGroup = { label?: string; items: NavItem[] };
type Mode     = "exchange" | "forex" | "web3";

// ── Nav definitions ───────────────────────────────────────────────────────────

const EXCHANGE_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",   icon: LayoutDashboard, href: "/dashboard" },
      { label: "Portfolio",   icon: Briefcase,       href: "/dashboard/portfolio" },
      { label: "Live Trades", icon: Activity,        href: "/dashboard/trades" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Trading",    icon: CandlestickChart, href: "/dashboard/trading" },
      { label: "AI Signals", icon: Zap,              href: "/dashboard/signals" },
      { label: "Strategies", icon: Target,           href: "/dashboard/strategies" },
      { label: "Engine",     icon: Brain,            href: "/dashboard/engine" },
      { label: "Backtest",   icon: FlaskConical,     href: "/dashboard/backtest" },
      { label: "Analytics",  icon: BarChart3,        href: "/dashboard/analytics" },
      { label: "Market",     icon: Globe,            href: "/dashboard/market" },
    ],
  },
  {
    label: "Exchange",
    items: [
      { label: "Connect",       icon: Link2,      href: "/dashboard/connect" },
      { label: "Accounts",      icon: Building2,  href: "/dashboard/accounts" },
      { label: "Funding Fee",   icon: DollarSign, href: "/dashboard/funding" },
      { label: "Yield Engine",  icon: Percent,    href: "/dashboard/yield" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "API Keys",      icon: Key,        href: "/dashboard/api" },
      { label: "Subscription",  icon: CreditCard, href: "/dashboard/licenses" },
      { label: "Notifications", icon: Bell,       href: "/dashboard/notifications" },
      { label: "Settings",      icon: Settings,   href: "/dashboard/profile" },
    ],
  },
];

const FOREX_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",   icon: LayoutDashboard, href: "/dashboard" },
      { label: "Portfolio",   icon: Briefcase,       href: "/dashboard/portfolio" },
      { label: "Live Trades", icon: Activity,        href: "/dashboard/trades" },
    ],
  },
  {
    label: "Forex / CFD",
    items: [
      { label: "Accounts",         icon: Building2,        href: "/dashboard/accounts" },
      { label: "Trading",          icon: CandlestickChart, href: "/dashboard/trading" },
      { label: "Bot",              icon: Bot,              href: "/dashboard/bot" },
      { label: "Risk Management",  icon: ShieldCheck,      href: "/dashboard/risk" },
      { label: "Analytics",        icon: BarChart3,        href: "/dashboard/analytics" },
      { label: "Backtest",         icon: FlaskConical,     href: "/dashboard/backtest" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "API Keys",      icon: Key,        href: "/dashboard/api" },
      { label: "Subscription",  icon: CreditCard, href: "/dashboard/licenses" },
      { label: "Notifications", icon: Bell,       href: "/dashboard/notifications" },
      { label: "Settings",      icon: Settings,   href: "/dashboard/profile" },
    ],
  },
];

const WEB3_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard",  icon: LayoutDashboard, href: "/dashboard" },
      { label: "Portfolio",  icon: Briefcase,       href: "/dashboard/portfolio" },
    ],
  },
  {
    label: "Web3 / DeFi",
    items: [
      { label: "Swap",       icon: ArrowLeftRight,  href: "/dashboard/swap" },
      { label: "History",    icon: Clock,           href: "/dashboard/swap/history" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "API Keys",      icon: Key,        href: "/dashboard/api" },
      { label: "Subscription",  icon: CreditCard, href: "/dashboard/licenses" },
      { label: "Notifications", icon: Bell,       href: "/dashboard/notifications" },
      { label: "Settings",      icon: Settings,   href: "/dashboard/profile" },
    ],
  },
];

// ── Mode switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const opts: { key: Mode; label: string; icon: React.ElementType }[] = [
    { key: "exchange", label: "CEX",   icon: Wallet     },
    { key: "forex",    label: "Forex", icon: TrendingUp },
    { key: "web3",     label: "Web3",  icon: Layers     },
  ];
  return (
    <div className="mx-2.5 mb-3 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
      {opts.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-bold transition-all",
            mode === key
              ? "bg-[#e7b949] text-[#060b14] shadow-[0_2px_12px_rgba(231,185,73,0.35)]"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Mode label chip ───────────────────────────────────────────────────────────

const MODE_META: Record<Mode, { dot: string; label: string }> = {
  exchange: { dot: "bg-[#e7b949]",  label: "Crypto Exchange" },
  forex:    { dot: "bg-blue-400",   label: "Forex / CFD"     },
  web3:     { dot: "bg-violet-400", label: "Web3 / DeFi"     },
};

function ModeChip({ mode }: { mode: Mode }) {
  const { dot, label } = MODE_META[mode];
  return (
    <div className="mx-2.5 mb-2 flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</span>
    </div>
  );
}

// ── Diamond logo ──────────────────────────────────────────────────────────────

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L2 9l10 13L22 9z" />
    </svg>
  );
}

// ── Shared nav content ────────────────────────────────────────────────────────

function NavContent({
  mode, groups, subscribed, handleModeChange, onNavClick,
}: {
  mode: Mode;
  groups: NavGroup[];
  subscribed: boolean | null;
  handleModeChange: (m: Mode) => void;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto py-3">
        <ModeSwitcher mode={mode} onChange={handleModeChange} />
        <ModeChip mode={mode} />
        <div className="space-y-4 px-0">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="mb-1 px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5 px-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                        active
                          ? "border border-[#e7b949]/20 bg-[#e7b949]/8 text-white shadow-[inset_3px_0_0_#e7b949]"
                          : "border border-transparent text-slate-500 hover:border-white/[0.05] hover:bg-white/[0.03] hover:text-slate-200"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#e7b949]" : "text-slate-600 group-hover:text-slate-400")} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-white/[0.05] px-2.5 pt-2">
          <button
            type="button"
            onClick={() => { onNavClick?.(); logout(); }}
            className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm text-slate-500 transition-all hover:border-red-500/10 hover:bg-red-500/[0.05] hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
      {subscribed === false && (
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className="rounded-xl border border-[#e7b949]/15 p-4 text-center"
            style={{ background: "linear-gradient(160deg, rgba(231,185,73,0.06) 0%, transparent 100%)" }}>
            <DiamondIcon className="mx-auto mb-2 h-8 w-8 text-[#e7b949]" />
            <p className="text-sm font-bold text-white">INSTITUTIONAL</p>
            <p className="mt-0.5 text-xs text-[#e7b949]">Full Suite Access</p>
            <Link
              href="/dashboard/licenses"
              onClick={onNavClick}
              className="mt-3 block w-full rounded-lg py-2 text-center text-xs font-bold text-[#0d1520] transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #f7d36d 0%, #d4a017 100%)", boxShadow: "0 6px 20px -8px rgba(231,185,73,0.7)" }}
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar (desktop + mobile drawer) ────────────────────────────────────────

import { Menu, X } from "lucide-react";

export default function Sidebar() {
  const [mode, setMode]             = useState<Mode>("exchange");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("aq_sidebar_mode");
    if (saved === "exchange" || saved === "forex" || saved === "web3") setMode(saved);
  }, []);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    localStorage.setItem("aq_sidebar_mode", m);
    window.dispatchEvent(new CustomEvent("aq-mode-change", { detail: m }));
  };

  useEffect(() => {
    fetchWithAuth(`${API}/api/billing/subscription`)
      .then((r) => (r.ok ? r.json() : null))
      .then((sub) => setSubscribed(!!sub && ["active", "trialing"].includes(sub.status)))
      .catch(() => setSubscribed(false));
  }, []);

  // Close mobile drawer on route change
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const groups = mode === "exchange" ? EXCHANGE_NAV : mode === "forex" ? FOREX_NAV : WEB3_NAV;
  const navProps = { mode, groups, subscribed, handleModeChange };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#080c14] xl:flex">
        <NavContent {...navProps} />
      </aside>

      {/* Mobile hamburger button — fixed bottom-right */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#e7b949]/30 bg-[#080c14] shadow-[0_4px_24px_rgba(0,0,0,0.6)] text-[#e7b949] xl:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 flex-col bg-[#080c14] border-r border-white/[0.06] transition-transform duration-300 xl:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <DiamondIcon className="h-5 w-5 text-[#e7b949]" />
            <span className="text-sm font-bold text-white">ApexQuant</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavContent {...navProps} onNavClick={() => setMobileOpen(false)} />
        </div>
      </div>
    </>
  );
}
