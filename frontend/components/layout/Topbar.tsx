"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, ChevronDown, CreditCard, LogOut, Menu, User, X } from "lucide-react";
import { IconifySymbol } from "@/components/ui/icon";
import { ApexLogo } from "@/components/ui/ApexLogo";
import { getAuthHeaders, logout } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type TopbarProps = {
  variant?: "marketing" | "dashboard";
};

type CurrentUser = {
  name: string | null;
  email: string;
  plan: string;
  planSlug: string;
};

type LiveTicker = {
  symbol: string;
  price: number | null;
  change: number | null;
  positive: boolean;
  icon: string;
};

const TICKER_CONFIG = [
  { symbol: "BTC/USDT", icon: "cryptocurrency:btc" },
  { symbol: "ETH/USDT", icon: "cryptocurrency:eth" },
  { symbol: "XAU/USD",  icon: "cryptocurrency:xau" },
  { symbol: "NASDAQ",   icon: "mdi:chart-line-variant" },
];

function fmtPrice(price: number | null): string {
  if (price === null) return "…";
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtChange(change: number | null): string {
  if (change === null) return "";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

const marketingLinks = [
  { label: "Platform", href: "/#platform" },
  { label: "Products", href: "/#products" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Performance", href: "/#performance" },
  { label: "Resources", href: "/#resources" },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function Topbar({ variant = "marketing" }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tickers, setTickers] = useState<LiveTicker[]>(
    TICKER_CONFIG.map((c) => ({ ...c, price: null, change: null, positive: true }))
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Binance WebSocket for BTC + ETH (real-time)
  useEffect(() => {
    const ws = new WebSocket(
      "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker"
    );
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        const t = msg.data;
        if (!t?.s) return;
        const sym = t.s === "BTCUSDT" ? "BTC/USDT" : "ETH/USDT";
        setTickers((prev) =>
          prev.map((tk) =>
            tk.symbol === sym
              ? { ...tk, price: parseFloat(t.c), change: parseFloat(t.P), positive: parseFloat(t.P) >= 0 }
              : tk
          )
        );
      } catch {}
    };
    return () => ws.close();
  }, []);

  // REST poll for XAU/USD + NASDAQ (no free real-time WebSocket)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/market-prices");
        const data: {
          prices: Array<{ symbol: string; price: number | null; change: number | null }>;
        } = await res.json();
        if (!data.prices) return;
        const nonCrypto = ["XAU/USD", "NASDAQ"];
        setTickers((prev) =>
          prev.map((tk) => {
            if (!nonCrypto.includes(tk.symbol)) return tk;
            const live = data.prices.find((p) => p.symbol === tk.symbol);
            if (!live) return tk;
            return { ...tk, price: live.price, change: live.change, positive: (live.change ?? 0) >= 0 };
          })
        );
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // Check login state for marketing variant
  useEffect(() => {
    if (variant !== "marketing") return;
    setIsLoggedIn(!!localStorage.getItem("accessToken"));
  }, [variant]);

  // Fetch real user data + unread count for dashboard variant
  useEffect(() => {
    if (variant !== "dashboard") return;
    (async () => {
      try {
        const [meRes, countRes] = await Promise.all([
          fetch(`${API}/api/auth/me`, { headers: getAuthHeaders() }),
          fetch(`${API}/api/notifications/count`, { headers: getAuthHeaders() }),
        ]);
        if (meRes.ok) {
          const data = await meRes.json();
          setCurrentUser({ name: data.name, email: data.email, plan: data.plan, planSlug: data.planSlug });
        }
        if (countRes.ok) {
          const { count } = await countRes.json();
          setUnreadCount(count);
        }
      } catch {}
    })();
  }, [variant]);

  // SSE for live notification count
  useEffect(() => {
    if (variant !== "dashboard") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    const es = new EventSource(`${API}/api/notifications/stream?token=${token}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "notification") setUnreadCount((n) => n + 1);
        if (msg.type === "signal") setUnreadCount((n) => n + 1);
      } catch {}
    };
    return () => es.close();
  }, [variant]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = currentUser
    ? (currentUser.name ?? currentUser.email)
        .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "…";

  const displayName = currentUser?.name ?? currentUser?.email ?? "—";

  if (variant === "dashboard") {
    return (
      <header className="z-40 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0a0f1a]/95 px-4 backdrop-blur-xl sm:px-5">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="ApexQuant">
          <ApexLogo size={32} />
          <div className="leading-tight">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white">ApexQuant</p>
            <p className="mt-0.5 pb-px text-[9px] uppercase tracking-widest text-[#e7b949]">AI Quant Trading</p>
          </div>
        </Link>

        <div className="mx-1 hidden h-5 w-px bg-white/[0.08] sm:block" />

        {/* Market Status */}
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Market is Open</span>
        </div>

        {/* Crypto Tickers */}
        <div className="hidden flex-1 items-center gap-5 pl-2 lg:flex">
          {tickers.map((t) => (
            <div key={t.symbol} className="flex items-center gap-1.5 text-xs">
              <IconifySymbol icon={t.icon} className="h-4 w-4" />
              <span className="font-medium text-white">{t.symbol}</span>
              <span className="font-mono text-slate-300">{fmtPrice(t.price)}</span>
              <span className={t.positive ? "text-emerald-400" : "text-red-400"}>{fmtChange(t.change)}</span>
            </div>
          ))}
        </div>

        {/* Right: Language + Bell + User Menu */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/dashboard/notifications"
            aria-label="Notifications"
            onClick={() => setUnreadCount(0)}
            className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 transition hover:border-white/20"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#e7b949] to-[#b98522] flex items-center justify-center text-[10px] font-extrabold text-[#060b14] shrink-0">
                {initials}
              </div>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-white sm:inline">
                {displayName}
              </span>
              {currentUser?.planSlug && currentUser.planSlug !== "free" && (
                <span className="hidden items-center rounded-full border border-[#e7b949]/30 bg-[#e7b949]/10 px-2 py-0.5 text-[9px] font-bold text-[#e7b949] sm:inline-flex">
                  {currentUser.plan}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d1520] shadow-2xl">
                {/* User info header */}
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="truncate text-[11px] text-slate-500">{currentUser?.email ?? "—"}</p>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    Profile & Settings
                  </Link>
                  <Link
                    href="/dashboard/licenses"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    Subscription & Billing
                  </Link>
                </div>

                <div className="border-t border-white/[0.06] p-1.5">
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ── Marketing variant ──────────────────────────────────────────────────────
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-white/10 bg-[#07090d]/95 backdrop-blur-xl"
    >
      <div className="flex h-full w-full items-center justify-between pl-4 pr-3 sm:pl-6 sm:pr-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="ApexQuant home">
          <ApexLogo size={30} />
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#e7b949]">ApexQuant</p>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-slate-300 xl:flex">
          {marketingLinks.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          {isLoggedIn ? (
            <Link
              href="/dashboard/profile"
              className="hidden rounded-lg border border-white/10 px-3.5 py-1.5 text-sm text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Profile
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg border border-white/10 px-3.5 py-1.5 text-sm text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Login
            </Link>
          )}
          <Link
            href={isLoggedIn ? "/dashboard" : "/register"}
            className="hidden rounded-lg px-4 py-1.5 text-sm font-semibold text-[#0d1520] transition hover:brightness-110 sm:inline-flex"
            style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}
          >
            {isLoggedIn ? "Dashboard" : "Get Started"}
          </Link>
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:text-white xl:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#07090d] px-6 pb-5 xl:hidden">
          <div className="pt-2">
            {marketingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link
              href={isLoggedIn ? "/dashboard/profile" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm text-white transition hover:bg-white/10"
            >
              {isLoggedIn ? "Profile" : "Login"}
            </Link>
            <Link
              href={isLoggedIn ? "/dashboard" : "/register"}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-[#0d1520] transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}
            >
              {isLoggedIn ? "Dashboard" : "Get Started"}
            </Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
