"use client";

import { useEffect, useState } from "react";
import {
  HeroSection, KpiBar, LiveTradeFeed, AiSignals,
  MarketHeatmap, PerformanceOverview, TopStrategies, TopTraders,
} from "@/components/dashboard/DashboardSections";
import {
  ForexHero, ForexKpiBar, MT5AccountsWidget, ForexMarketWatch,
  ForexSignalFeed, OpenPositionsWidget, RiskSummary,
} from "@/components/dashboard/ForexDashboardSections";
import {
  Web3Hero, Web3KpiBar, QuickSwapCard,
  WalletPortfolioCard, Web3MarketPrices,
  RecentPlatformSwaps, DeFiRoadmapCard,
} from "@/components/dashboard/Web3DashboardSections";

type Mode = "exchange" | "forex" | "web3";

export default function DashboardPage() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("aq_sidebar_mode");
    if (saved === "forex" || saved === "web3") setMode(saved);
    else setMode("exchange");

    const handler = (e: Event) => setMode((e as CustomEvent<Mode>).detail);
    window.addEventListener("aq-mode-change", handler);
    return () => window.removeEventListener("aq-mode-change", handler);
  }, []);

  if (!mode) return null;

  // ── Web3 / DeFi dashboard ──────────────────────────────────────────────────
  if (mode === "web3") {
    return (
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <Web3Hero />
        <Web3KpiBar />

        {/* Quick Swap | Portfolio | Market Prices */}
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
          <QuickSwapCard />
          <WalletPortfolioCard />
          <Web3MarketPrices />
        </div>

        {/* Recent Activity | DeFi Roadmap */}
        <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
          <RecentPlatformSwaps />
          <DeFiRoadmapCard />
        </div>
      </div>
    );
  }

  // ── Forex / MT5 dashboard ──────────────────────────────────────────────────
  if (mode === "forex") {
    return (
      <div className="space-y-5">
        <ForexHero />
        <ForexKpiBar />

        <div className="grid gap-5 xl:grid-cols-[2fr_1fr_1fr]">
          <PerformanceOverview />
          <MT5AccountsWidget />
          <RiskSummary />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr_1fr]">
          <OpenPositionsWidget />
          <ForexSignalFeed />
          <ForexMarketWatch />
        </div>
      </div>
    );
  }

  // ── Exchange / CEX dashboard ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <HeroSection />
      <KpiBar />

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr_1fr]">
        <PerformanceOverview />
        <TopStrategies />
        <TopTraders />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.6fr_1fr]">
        <LiveTradeFeed />
        <AiSignals />
        <MarketHeatmap />
      </div>
    </div>
  );
}
