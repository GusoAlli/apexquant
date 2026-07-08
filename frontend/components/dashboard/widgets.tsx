import { Bot, Brain, CalendarClock, CreditCard, PieChart, Server, ShieldCheck } from "lucide-react";
import { aiAnalysis, allocations, bots, brokers, calendar, markets, subscription, trades } from "@/constants/dashboard";
import { IconFrame, IconifySymbol } from "@/components/ui/icon";
import { PanelRow, PremiumCard, SectionHeader, StatusBadge } from "@/components/ui/premium-card";

export function MarketOverview() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Markets" title="Market Overview" />
      <div className="mt-5 grid gap-3">
        {markets.map((market) => (
          <PanelRow key={market.symbol} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <IconFrame tone={market.symbol.includes("BTC") ? "amber" : market.symbol.includes("XAU") ? "emerald" : "blue"} className="h-9 w-9">
                <IconifySymbol icon={market.icon} className="h-5 w-5" />
              </IconFrame>
              <div>
                <p className="font-medium text-white">{market.symbol}</p>
                <p className="text-xs text-slate-500">Live composite feed</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-slate-200">{market.price}</p>
              <StatusBadge tone={market.tone} className="mt-1">{market.change}</StatusBadge>
            </div>
          </PanelRow>
        ))}
      </div>
    </PremiumCard>
  );
}

export function RunningBots() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Automation" title="Running Bots" action={<Bot className="h-5 w-5 text-blue-300" />} />
      <div className="mt-5 space-y-3">
        {bots.map((bot) => (
          <PanelRow key={bot.name} className="bg-[#07090d]/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-white">{bot.name}</p>
                <p className="mt-1 text-sm text-slate-500">{bot.pair}</p>
              </div>
              <StatusBadge tone="success">{bot.status}</StatusBadge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-emerald-300">{bot.pnl}</span>
              <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">Risk {bot.risk}</span>
            </div>
          </PanelRow>
        ))}
      </div>
    </PremiumCard>
  );
}

export function RecentTrades() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Execution" title="Recent Trades" />
      <div className="mt-5 overflow-hidden rounded-lg border border-white/5">
        {trades.map((trade) => (
          <div key={`${trade.asset}-${trade.time}`} className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/5 bg-white/[0.02] p-4 last:border-b-0 sm:grid-cols-[1fr_80px_90px_90px]">
            <div>
              <p className="font-medium text-white">{trade.asset}</p>
              <p className="text-xs text-slate-500">{trade.time}</p>
            </div>
            <span className="hidden text-sm text-slate-400 sm:block">{trade.side}</span>
            <span className="hidden font-mono text-sm text-slate-300 sm:block">{trade.size}</span>
            <span className={trade.pnl.startsWith("-") ? "text-sm text-red-300" : "text-sm text-emerald-300"}>{trade.pnl}</span>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

export function PortfolioAllocation() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Portfolio" title="Allocation" action={<PieChart className="h-5 w-5 text-emerald-300" />} />
      <div className="mt-5 space-y-4">
        {allocations.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">{item.label}</span>
              <span className="font-mono text-white">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div className={`h-full ${item.color}`} style={{ width: item.value }} />
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

export function BrokerStatusPanel() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Prime Access" title="Broker Status" action={<Server className="h-5 w-5 text-blue-300" />} />
      <div className="mt-5 grid gap-3">
        {brokers.map((broker) => (
          <PanelRow key={broker.account} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-3">
              <IconFrame tone="neutral" className="h-9 w-9">
                <IconifySymbol icon={broker.icon} className="h-5 w-5 text-slate-200" />
              </IconFrame>
              <div>
                <p className="font-medium text-white">{broker.name}</p>
                <p className="mt-1 text-sm text-slate-500">{broker.account} / {broker.balance}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="font-mono text-xs text-slate-400">{broker.latency}</span>
              <StatusBadge tone="success">{broker.status}</StatusBadge>
            </div>
          </PanelRow>
        ))}
      </div>
    </PremiumCard>
  );
}

export function SubscriptionStatus() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="License" title="Subscription Status" action={<CreditCard className="h-5 w-5 text-amber-300" />} />
      <PanelRow className="mt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-white">{subscription.plan}</p>
            <p className="mt-1 text-sm text-slate-500">Renews {subscription.renews}</p>
          </div>
          <StatusBadge tone="success">{subscription.status}</StatusBadge>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#07090d]/70 px-4 py-3 text-sm">
          <span className="text-slate-400">Usage</span>
          <span className="font-mono text-white">{subscription.usage}</span>
        </div>
      </PanelRow>
    </PremiumCard>
  );
}

export function EconomicCalendar() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Macro" title="Economic Calendar" action={<CalendarClock className="h-5 w-5 text-blue-300" />} />
      <div className="mt-5 space-y-3">
        {calendar.map((item) => {
          const Icon = item.icon;
          return (
            <PanelRow key={item.event} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <IconFrame tone="blue" className="h-9 w-9">
                  <Icon className="h-4 w-4" />
                </IconFrame>
                <div>
                  <p className="font-medium text-white">{item.event}</p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
              </div>
              <StatusBadge tone={item.impact === "High" ? "warning" : "neutral"}>{item.impact}</StatusBadge>
            </PanelRow>
          );
        })}
      </div>
    </PremiumCard>
  );
}

export function LatestAiAnalysis() {
  return (
    <PremiumCard className="p-5">
      <SectionHeader eyebrow="Intelligence" title="Latest AI Analysis" action={<Brain className="h-5 w-5 text-blue-300" />} />
      <div className="mt-5 space-y-3">
        {aiAnalysis.map((item) => (
          <PanelRow key={item} className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-sm leading-6 text-slate-300">{item}</p>
          </PanelRow>
        ))}
      </div>
    </PremiumCard>
  );
}
