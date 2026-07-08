"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import {
  dashboardKpis,
  heroStats,
  liveTrades,
  marketHeatmap,
  performanceStats,
  topStrategies,
  topTraders,
  aiSignals,
} from "@/constants/dashboard";
import { IconifySymbol } from "@/components/ui/icon";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

const PerformanceChart = dynamic(
  () => import("@/components/charts/PerformanceChart"),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-lg bg-white/[0.03]" />,
  }
);

// ── Globe ─────────────────────────────────────────────────────────────────────

function Globe() {
  const dots = [
    { x: 52, y: 38 }, { x: 57, y: 32 }, { x: 62, y: 36 }, { x: 70, y: 34 },
    { x: 80, y: 41 }, { x: 85, y: 36 }, { x: 88, y: 30 }, { x: 28, y: 47 },
    { x: 35, y: 54 }, { x: 48, y: 42 },
  ];

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="absolute h-72 w-72 rounded-full bg-blue-600/5 blur-3xl" />
      <div
        className="relative h-64 w-64 overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #1a3a6e 0%, #0e2040 35%, #071428 65%, #030a18 90%)",
          boxShadow:
            "0 0 48px rgba(30,60,140,0.4), 0 0 96px rgba(30,60,140,0.12), inset 0 0 48px rgba(0,0,0,0.55)",
        }}
      >
        {/* Latitude lines */}
        {[18, 31, 44, 56, 69].map((top, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{ top: `${top}%`, height: 1, background: "rgba(100,160,255,0.07)" }}
          />
        ))}

        {/* Longitude lines */}
        {[12, 24, 36, 50, 64, 78].map((left, i) => (
          <div
            key={i}
            className="absolute bottom-0 top-0"
            style={{ left: `${left}%`, width: 1, background: "rgba(100,160,255,0.06)" }}
          />
        ))}

        {/* SVG ellipses */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.09]" viewBox="0 0 256 256">
          <ellipse cx="128" cy="128" rx="52" ry="128" fill="none" stroke="rgba(100,160,255,1)" strokeWidth="0.6" />
          <ellipse cx="128" cy="128" rx="96" ry="128" fill="none" stroke="rgba(100,160,255,1)" strokeWidth="0.6" />
          <ellipse cx="128" cy="128" rx="128" ry="52" fill="none" stroke="rgba(100,160,255,1)" strokeWidth="0.6" />
          <ellipse cx="128" cy="128" rx="128" ry="96" fill="none" stroke="rgba(100,160,255,1)" strokeWidth="0.6" />
        </svg>

        {/* Specular highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.09) 0%, transparent 44%)" }}
        />
        {/* Dark edge shadow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 72% 72%, rgba(0,0,0,0.55) 0%, transparent 48%)" }}
        />

        {/* City dots */}
        {dots.map((d, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#e7b949",
              boxShadow: "0 0 5px 2px rgba(231,185,73,0.55)",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Connection lines */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 256 256">
          <line x1="133" y1="97" x2="146" y2="90" stroke="#e7b949" strokeWidth="0.6" strokeOpacity="0.35" />
          <line x1="146" y1="90" x2="160" y2="92" stroke="#e7b949" strokeWidth="0.6" strokeOpacity="0.35" />
          <line x1="146" y1="90" x2="179" y2="95" stroke="#e7b949" strokeWidth="0.6" strokeOpacity="0.3" />
          <line x1="72" y1="120" x2="90" y2="140" stroke="#e7b949" strokeWidth="0.6" strokeOpacity="0.3" />
          <line x1="123" y1="107" x2="133" y2="97" stroke="#e7b949" strokeWidth="0.6" strokeOpacity="0.3" />
        </svg>
      </div>

      {/* Orbit rings */}
      <div className="pointer-events-none absolute h-72 w-72 rounded-full border border-blue-500/[0.08]" />
      <div className="pointer-events-none absolute h-80 w-80 rounded-full border border-blue-500/[0.04]" />
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline() {
  const pts = [30, 44, 37, 52, 45, 60, 53, 70, 64, 79, 73, 85];
  const H = 36;
  const W = 120;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const r = max - min || 1;
  const coords = pts
    .map((v, i) => `${(i / (pts.length - 1)) * W},${H - ((v - min) / r) * H}`)
    .join(" L ");

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={coords}
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Count-up animation ────────────────────────────────────────────────────────

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

function AnimNum({
  target,
  from = 0,
  fmt,
  className,
}: {
  target: number;
  from?: number;
  fmt: (n: number) => string;
  className?: string;
}) {
  const val = useCountUp(target, from);
  return <span className={className}>{fmt(val)}</span>;
}

// ── Section card shell ────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-[#0a0f1a]",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────

export function HeroSection() {
  const TOTAL_BASE = 5_369;
  const ONLINE_BASE = 3_657;

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

  const totalUsers = Math.max(live.totalUsers ?? TOTAL_BASE, TOTAL_BASE);
  const onlineUsers = Math.max(live.onlineUsers ?? ONLINE_BASE, ONLINE_BASE);

  const statConfig: Record<string, { target: number; from?: number; fmt: (n: number) => string; pulse?: boolean }> = {
    "Total Users": {
      target: totalUsers,
      from: TOTAL_BASE,
      fmt: (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M+` : Math.round(n).toLocaleString("en-US"),
    },
    "Users Online": {
      target: onlineUsers,
      from: ONLINE_BASE,
      fmt: (n) => Math.round(n).toLocaleString("en-US"),
      pulse: true,
    },
    "System Online": {
      target: 1,
      fmt: () => "24/7",
    },
    "Volume Traded": {
      target: 2.4,
      fmt: (n) => `$${n.toFixed(1)}B+`,
    },
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_0%_0%,rgba(59,130,246,0.07),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(231,185,73,0.04),transparent)]" />

      <div className="relative grid gap-6 p-6 lg:p-8 xl:grid-cols-[1fr_auto_1fr]">
        {/* Left — welcome */}
        <div className="flex flex-col justify-center">
          <p className="text-sm text-slate-400">Welcome back,</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            QuantumTrader <span>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">AI-Powered. Data-Driven. Built for Traders.</p>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">Your Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e7b949]/25 bg-[#e7b949]/10 px-3 py-1 text-xs font-semibold text-[#e7b949]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e7b949]" />
              Pro Trader
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <span className="text-[#e7b949] text-base leading-none">+</span>
              New Strategy
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[#e7b949]/25 px-4 py-2.5 text-sm font-semibold text-[#e7b949] transition hover:bg-[#e7b949]/8"
            >
              Go to Trading
            </button>
          </div>
        </div>

        {/* Center — Globe */}
        <div className="hidden h-64 w-72 xl:block">
          <Globe />
        </div>

        {/* Right — stats + sparkline */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              const cfg = statConfig[stat.label];
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.025] p-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {cfg ? (
                        <AnimNum
                          target={cfg.target}
                          from={cfg.from ?? 0}
                          fmt={cfg.fmt}
                          className="text-sm font-bold text-white"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">{stat.value}</span>
                      )}
                      {cfg?.pulse && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="truncate text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live users */}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Live Users Online</p>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <AnimNum
                  target={onlineUsers}
                  from={ONLINE_BASE}
                  fmt={(n) => Math.round(n).toLocaleString("en-US")}
                  className="text-2xl font-extrabold text-white"
                />
                <p className="mt-0.5 text-xs font-medium text-emerald-400">▲ 12.5%</p>
              </div>
              <Sparkline />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────

export function KpiBar() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {dashboardKpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="p-4 transition hover:border-white/10">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7b949]/20 bg-[#e7b949]/10">
                <Icon className="h-4 w-4 text-[#e7b949]" />
              </div>
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                ▲ {kpi.delta}
              </span>
            </div>
            <p className="text-xl font-extrabold text-white">{kpi.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-slate-500">{kpi.label}</p>
          </Card>
        );
      })}
    </div>
  );
}

// ── Performance Overview ──────────────────────────────────────────────────────

const PERIODS = ["7D", "30D", "90D", "1Y", "All Time"] as const;

export function PerformanceOverview() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30D");

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Performance Overview</p>
          <h3 className="text-base font-semibold text-white">(All Users)</h3>
        </div>
        <select className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 outline-none transition hover:border-white/10">
          <option>This Month</option>
          <option>This Year</option>
          <option>All Time</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 sm:grid-cols-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Average</p>
          <p className="mt-1 text-xs font-semibold text-white">{performanceStats.average}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Total Profit</p>
          <p className="mt-1 text-xs font-semibold text-emerald-400">{performanceStats.totalProfit}</p>
          <p className="text-[9px] text-slate-600">{performanceStats.totalProfitUnit}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Max Drawdown</p>
          <p className="mt-1 text-xs font-semibold text-red-400">{performanceStats.maxDrawdown}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600">Sharpe Ratio</p>
          <p className="mt-1 text-xs font-semibold text-white">{performanceStats.sharpeRatio}</p>
        </div>
      </div>

      {/* Chart */}
      <PerformanceChart height={200} />

      {/* Period selector */}
      <div className="mt-4 flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs transition",
              period === p
                ? "border border-[#e7b949]/30 bg-[#e7b949]/15 font-semibold text-[#e7b949]"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Top Strategies ────────────────────────────────────────────────────────────

export function TopStrategies() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Top Strategies</p>
          <h3 className="text-sm font-semibold text-white">(Demo)</h3>
        </div>
        <button type="button" className="text-xs text-[#e7b949] hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-2">
        {topStrategies.map((s, i) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-3 transition hover:border-white/[0.08] hover:bg-white/[0.04]"
          >
            {/* Avatar placeholder */}
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{
                background: [
                  "linear-gradient(135deg,#f7d36d,#b98522)",
                  "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  "linear-gradient(135deg,#06b6d4,#3b82f6)",
                  "linear-gradient(135deg,#10b981,#059669)",
                  "linear-gradient(135deg,#f59e0b,#d97706)",
                ][i % 5],
              }}
            >
              {s.name[0]}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{s.name}</p>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                s.badge === "AI"
                  ? "bg-blue-500/15 text-blue-300"
                  : "bg-violet-500/15 text-violet-300"
              )}
            >
              {s.badge}
            </span>

            <span className="shrink-0 text-sm font-semibold text-emerald-400">{s.return}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Top Traders Leaderboard ───────────────────────────────────────────────────

export function TopTraders() {
  const rankColor = ["text-[#e7b949]", "text-slate-300", "text-amber-600", "text-slate-500", "text-slate-500"];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Top Traders Leaderboard</p>
          <h3 className="text-sm font-semibold text-white">(Demo)</h3>
        </div>
        <button type="button" className="text-xs text-[#e7b949] hover:underline">
          View All
        </button>
      </div>

      {/* Header */}
      <div className="mb-2 grid grid-cols-[28px_1fr_auto] gap-2 px-3 text-[9px] uppercase tracking-wider text-slate-600">
        <span>#</span>
        <span>Trader</span>
        <span>Profit %</span>
      </div>

      <div className="space-y-1.5">
        {topTraders.slice(0, 5).map((t, i) => (
          <div
            key={t.rank}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/[0.07]"
          >
            <span className={cn("text-sm font-bold", rankColor[i] ?? "text-slate-500")}>
              {t.rank}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                style={{
                  background: [
                    "linear-gradient(135deg,#f7d36d,#b98522)",
                    "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    "linear-gradient(135deg,#10b981,#059669)",
                    "linear-gradient(135deg,#f59e0b,#d97706)",
                  ][i % 5],
                }}
              >
                {t.avatar}
              </div>
              <span className="truncate text-xs font-medium text-white">{t.name}</span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">{t.profit}</span>
          </div>
        ))}

        {/* Ellipsis separator */}
        <div className="py-1 text-center text-xs text-slate-700">· · ·</div>

        {/* Last entry */}
        {topTraders.slice(-1).map((t) => (
          <div
            key={t.rank}
            className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
          >
            <span className="text-sm font-bold text-slate-600">{t.rank}</span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                {t.avatar}
              </div>
              <span className="truncate text-xs font-medium text-slate-300">{t.name}</span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">{t.profit}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] text-slate-600">
        ⓘ Leaderboard demo untuk ilustrasi tampilan.
      </p>
    </Card>
  );
}

// ── Live Trade Feed ───────────────────────────────────────────────────────────

export function LiveTradeFeed() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Live Trade Feed</h3>
        <button type="button" className="text-xs text-[#e7b949] hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-2">
        {liveTrades.map((trade) => (
          <div
            key={`${trade.asset}-${trade.time}`}
            className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-3"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.05]">
              <IconifySymbol icon={trade.icon} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{trade.asset}</p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                trade.side === "Long"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              )}
            >
              {trade.side}
            </span>
            <span className="text-[10px] text-slate-600">{trade.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── AI Signals ────────────────────────────────────────────────────────────────

export function AiSignals() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">AI Signals (Today)</h3>
        <button type="button" className="text-xs text-[#e7b949] hover:underline">
          View All
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {aiSignals.map((sig) => (
          <div
            key={sig.asset}
            className="rounded-xl border border-white/[0.05] bg-white/[0.025] p-3"
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06]">
                <IconifySymbol icon={sig.icon} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{sig.asset}</p>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  sig.direction === "Long"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-red-500/15 text-red-300"
                )}
              >
                {sig.direction === "Long" ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {sig.direction}
              </span>
            </div>

            {/* Prices */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Entry</span>
                <span className="font-mono text-slate-300">{sig.entry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">TP</span>
                <span className="font-mono text-emerald-400">{sig.tp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">SL</span>
                <span className="font-mono text-red-400">{sig.sl}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2.5 flex items-center justify-between">
              <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                {sig.strength}
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                {sig.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Market Heatmap ────────────────────────────────────────────────────────────

export function MarketHeatmap() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Market Heatmap</h3>
        <button type="button" className="text-xs text-[#e7b949] hover:underline">
          View All
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {marketHeatmap.map((asset) => (
          <div
            key={asset.symbol}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl px-2 py-4 text-center",
              asset.positive
                ? "bg-emerald-500/15 border border-emerald-500/20"
                : "bg-red-500/15 border border-red-500/20"
            )}
          >
            <p className="text-xs font-bold text-white">{asset.symbol}</p>
            <p
              className={cn(
                "mt-1 text-[11px] font-semibold",
                asset.positive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {asset.change}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
