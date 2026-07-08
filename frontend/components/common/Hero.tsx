"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  ChevronRight,
  DollarSign,
  FlaskConical,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { IconifySymbol } from "@/components/ui/icon";
import { BrandIcon } from "@/components/ui/BrandIcon";

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    title: "AI Signals",
    desc: "Real-time AI-powered trading signals with confidence scoring, entry, TP and SL levels.",
    icon: Zap,
    color: "#e7b949",
    iconBg: "rgba(231,185,73,0.12)",
    iconBorder: "rgba(231,185,73,0.25)",
  },
  {
    title: "Strategy Builder",
    desc: "Build, test and deploy quantitative trading strategies without writing a single line of code.",
    icon: Target,
    color: "#22c55e",
    iconBg: "rgba(34,197,94,0.12)",
    iconBorder: "rgba(34,197,94,0.25)",
  },
  {
    title: "Risk Management",
    desc: "Advanced portfolio heat controls, drawdown protection, and automated position sizing.",
    icon: ShieldCheck,
    color: "#3b82f6",
    iconBg: "rgba(59,130,246,0.12)",
    iconBorder: "rgba(59,130,246,0.25)",
  },
  {
    title: "Deep Analytics",
    desc: "Sharpe ratio, Sortino, max drawdown, win rate and equity curves — all fully visualized.",
    icon: BarChart3,
    color: "#a855f7",
    iconBg: "rgba(168,85,247,0.12)",
    iconBorder: "rgba(168,85,247,0.25)",
  },
  {
    title: "Backtesting Engine",
    desc: "Test your strategies against years of historical data with tick-level precision and detailed reports.",
    icon: FlaskConical,
    color: "#f59e0b",
    iconBg: "rgba(245,158,11,0.12)",
    iconBorder: "rgba(245,158,11,0.25)",
  },
  {
    title: "Automated Bots",
    desc: "24/7 trading bots that run your strategies autonomously on any supported broker or exchange.",
    icon: Bot,
    color: "#ef4444",
    iconBg: "rgba(239,68,68,0.12)",
    iconBorder: "rgba(239,68,68,0.25)",
  },
];

type Exchange = {
  label: string;
  icon?: string;   // Iconify icon string
  brand?: string;  // filename in /public/icons/brands/{brand}.svg
};

const exchanges: Exchange[] = [
  { label: "Binance",      icon: "simple-icons:binance" },
  { label: "OKX",          icon: "simple-icons:okx" },
  { label: "Bybit",        brand: "bybit" },
  { label: "MetaTrader 5", brand: "metatrader" },
  { label: "TradingView",  icon: "simple-icons:tradingview" },
  { label: "HyperLiquid",  brand: "hyperliquid" },
];


// ── Globe ─────────────────────────────────────────────────────────────────────

function Globe() {
  const cities: [number, number][] = [
    [122, 95], [195, 115], [165, 150], [98, 158], [225, 168], [150, 198],
  ];

  return (
    <div className="relative h-[300px] w-[300px] sm:h-[340px] sm:w-[340px]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 35%, #1a2a4a 0%, #0a1628 38%, #060b14 68%)",
          boxShadow:
            "0 0 80px 28px rgba(231,185,73,0.045), inset 0 0 80px rgba(0,0,0,0.75)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 300">
        <defs>
          <clipPath id="lp-globe-clip">
            <circle cx="150" cy="150" r="146" />
          </clipPath>
        </defs>
        <g
          clipPath="url(#lp-globe-clip)"
          opacity="0.2"
          stroke="#4a7fa5"
          strokeWidth="0.55"
          fill="none"
        >
          {[35, 70, 110, 150, 190, 230, 265].map((y) => {
            const r = Math.sqrt(Math.max(0, 146 * 146 - (y - 150) * (y - 150)));
            return <ellipse key={y} cx="150" cy={y} rx={r} ry={r * 0.28} />;
          })}
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <ellipse
              key={a}
              cx="150"
              cy="150"
              rx="146"
              ry="146"
              transform={`rotate(${a} 150 150)`}
            />
          ))}
        </g>
        {cities.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#e7b949" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.25;0.9"
              dur={`${2 + i * 0.5}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        <line x1="122" y1="95" x2="195" y2="115" stroke="#e7b949" strokeWidth="0.7" opacity="0.35" />
        <line x1="195" y1="115" x2="165" y2="150" stroke="#e7b949" strokeWidth="0.7" opacity="0.35" />
        <line x1="165" y1="150" x2="225" y2="168" stroke="#e7b949" strokeWidth="0.7" opacity="0.35" />
        <line x1="98" y1="158" x2="150" y2="198" stroke="#3b82f6" strokeWidth="0.7" opacity="0.35" />
        <line x1="122" y1="95" x2="98" y2="158" stroke="#e7b949" strokeWidth="0.5" opacity="0.2" />
      </svg>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "0 0 0 1px rgba(231,185,73,0.12), 0 0 55px rgba(231,185,73,0.055)",
        }}
      />
    </div>
  );
}

// ── Live Price Panel ────────────────────────────────────────────────────────────

type LivePrice = { symbol: string; price: number | null; change: number | null };

const LIVE_PRICE_CONFIG = [
  { symbol: "BTC/USDT", name: "Bitcoin", icon: "cryptocurrency:btc" },
  { symbol: "ETH/USDT", name: "Ethereum", icon: "cryptocurrency:eth" },
  { symbol: "XAU/USD", name: "Gold", icon: "cryptocurrency:xau" },
  { symbol: "NASDAQ", name: "Nasdaq", icon: "mdi:chart-line-variant" },
];

function fmtLivePrice(price: number | null): string {
  if (price === null) return "…";
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtLiveChange(change: number | null): string {
  if (change === null) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

function LivePricePanel() {
  const [prices, setPrices] = useState<LivePrice[]>(
    LIVE_PRICE_CONFIG.map((c) => ({ symbol: c.symbol, price: null, change: null }))
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/market-prices");
        const data: { prices: LivePrice[] } = await res.json();
        if (!data.prices) return;
        setPrices(
          LIVE_PRICE_CONFIG.map((cfg) => {
            const live = data.prices.find((p) => p.symbol === cfg.symbol);
            return { symbol: cfg.symbol, price: live?.price ?? null, change: live?.change ?? null };
          })
        );
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080d18]"
      style={{ boxShadow: "0 32px 64px -16px rgba(0,0,0,0.98), 0 0 0 1px rgba(231,185,73,0.06)" }}
    >
      {/* Gold accent bar */}
      <div
        className="h-[2px] w-full"
        style={{ background: "linear-gradient(90deg, #f7d36d 0%, #e7b949 45%, transparent 100%)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-wide text-white">Live Markets</span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <span className="text-[10px] text-slate-600">5s refresh</span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 border-t border-white/[0.05] px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        <span>Asset</span>
        <span className="text-center">Price</span>
        <span className="text-right">24h</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {LIVE_PRICE_CONFIG.map((cfg) => {
          const live = prices.find((p) => p.symbol === cfg.symbol);
          const positive = (live?.change ?? 0) >= 0;
          return (
            <div
              key={cfg.symbol}
              className="grid grid-cols-3 items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.05]">
                  <IconifySymbol icon={cfg.icon} className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-bold text-white">{cfg.symbol.split("/")[0]}</p>
                  <p className="truncate text-[10px] text-slate-500">{cfg.name}</p>
                </div>
              </div>
              <p className="text-center font-mono text-sm font-semibold text-slate-100">
                {fmtLivePrice(live?.price ?? null)}
              </p>
              <div className="flex justify-end">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    positive ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                  }`}
                >
                  {fmtLiveChange(live?.change ?? null)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.05] px-5 py-3.5">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#e7b949] transition hover:text-[#f7d36d]"
        >
          Open Trading Dashboard <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Hero Stats Grid ───────────────────────────────────────────────────────────

function useCountUp(target: number, from = 0, duration = 1800): number {
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (target === from) { setVal(from); return; }
    let raf: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(ease >= 1 ? target : from + ease * (target - from));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, from, duration]);
  return val;
}

function StatCard({
  icon: Icon,
  label,
  target,
  from = 0,
  fmt,
  pulse,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  target: number;
  from?: number;
  fmt: (n: number) => string;
  pulse?: boolean;
}) {
  const val = useCountUp(target, from);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-4 py-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e7b949]/20 bg-[#e7b949]/[0.08]">
        <Icon className="h-4 w-4 text-[#e7b949]" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-white">{fmt(val)}</span>
          {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
        </div>
        <div className="truncate text-[10px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function HeroStats() {
  const [live, setLive] = useState<{ totalUsers: number | null; onlineUsers: number | null }>({
    totalUsers: null,
    onlineUsers: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/platform-stats");
        const data = await res.json();
        setLive(data);
      } catch {}
    };
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const TOTAL_BASE = 5_369;
  const ONLINE_BASE = 3_657;

  const totalUsers = Math.max(live.totalUsers ?? TOTAL_BASE, TOTAL_BASE);
  const onlineUsers = Math.max(live.onlineUsers ?? ONLINE_BASE, ONLINE_BASE);

  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-3">
      <StatCard
        icon={Users}
        label="Total Users"
        target={totalUsers}
        from={TOTAL_BASE}
        fmt={(n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M+` : Math.round(n).toLocaleString("en-US")}
      />
      <StatCard
        icon={Activity}
        label="Users Online"
        target={onlineUsers}
        from={ONLINE_BASE}
        fmt={(n) => Math.round(n).toLocaleString("en-US")}
        pulse
      />
      <StatCard
        icon={DollarSign}
        label="Volume Traded"
        target={2.4}
        fmt={(n) => `$${n.toFixed(1)}B+`}
      />
      <StatCard
        icon={TrendingUp}
        label="Win Rate"
        target={67.8}
        fmt={(n) => `${n.toFixed(1)}%`}
      />
    </div>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#060b14] pb-0 pt-16">
      {/* background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-[#e7b949]/[0.038] blur-3xl" />
        <div className="absolute right-0 top-16 h-[420px] w-[420px] rounded-full bg-[#3b82f6]/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="grid min-h-[88vh] items-start gap-14 pt-6 lg:grid-cols-[1.12fr_0.88fr]">
          {/* ── Left copy ── */}
          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7b949]/22 bg-[#e7b949]/8 px-4 py-2"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e7b949]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
                AI-Powered Trading Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.07 }}
              className="text-5xl font-extrabold leading-[1.18] text-white sm:text-6xl lg:text-[68px]"
            >
              ApexQuant
              <span
                className="block pb-2"
                style={{
                  background: "linear-gradient(90deg, #f7d36d 0%, #d4a017 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1.3,
                }}
              >
                AI Quant Trading
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.14 }}
              className="max-w-xl text-base leading-[1.85] text-slate-400 sm:text-[17px]"
            >
              AI-Powered. Data-Driven. Built for Traders. Monitor model confidence, broker sessions, portfolio heat, and live execution from one institutional-grade command center.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/register" className="apex-gold-button gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="apex-ghost-button gap-2">
                View Dashboard <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.34 }}
              className="flex flex-wrap items-center gap-4 text-sm"
            >
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                24/7 System Online
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">Pro & Institutional plans</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">Cancel anytime</span>
            </motion.div>
          </div>

          {/* ── Right – Live Market + Stats ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="flex w-full flex-col items-center gap-4 lg:items-end"
          >
            <LivePricePanel />
            <HeroStats />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Platform Stats ────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { icon: Users, label: "Total Users", value: "1.2M+", sub: "Registered traders worldwide" },
    { icon: Activity, label: "Users Online", value: "8,732", sub: "Active right now" },
    { icon: DollarSign, label: "Volume Traded", value: "$2.4B+", sub: "All-time cumulative volume" },
    { icon: TrendingUp, label: "Community Win Rate", value: "67.8%", sub: "Average across all users" },
  ];

  return (
    <section className="bg-[#060b14] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
                className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 text-center"
              >
                <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/8">
                  <Icon className="h-5 w-5 text-[#e7b949]" />
                </div>
                <div className="text-2xl font-extrabold text-white sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs font-semibold text-slate-300">{s.label}</div>
                <div className="mt-1 text-[11px] text-slate-600">{s.sub}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Features Grid ─────────────────────────────────────────────────────────────

function FeaturesGrid() {
  return (
    <section id="products" className="bg-[#060b14] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Platform Features</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Everything You Need to Trade Smarter
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            An all-in-one AI trading command center built for both retail and institutional traders.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 transition hover:border-white/[0.11]"
              >
                <div
                  className="mb-5 grid h-11 w-11 place-items-center rounded-xl border"
                  style={{
                    borderColor: f.iconBorder,
                    backgroundColor: f.iconBg,
                    color: f.color,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{f.desc}</p>
                <div
                  className="mt-5 flex items-center gap-1.5 text-xs font-medium transition-all group-hover:gap-2.5"
                  style={{ color: f.color }}
                >
                  Learn more <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────

function Integrations() {
  return (
    <section id="platform" className="border-y border-white/[0.06] bg-[#0a0f1a] py-16">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Integrations</p>
          <h2 className="mt-3 text-2xl font-bold text-white">
            Connect to Any Broker or Exchange
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Seamless connectivity to the world&apos;s leading trading platforms.
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {exchanges.map((ex, i) => (
            <motion.div
              key={ex.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#060b14] px-4 py-2.5 transition hover:border-[#e7b949]/20"
            >
              {ex.brand ? (
                <BrandIcon name={ex.brand} size={20} className="rounded" />
              ) : (
                <IconifySymbol icon={ex.icon!} className="h-5 w-5 text-slate-300" />
              )}
              <span className="text-sm font-medium text-slate-300">{ex.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ── Export ────────────────────────────────────────────────────────────────────

export default function Hero() {
  return (
    <>
      <HeroSection />
      <FeaturesGrid />
      <Integrations />
    </>
  );
}
