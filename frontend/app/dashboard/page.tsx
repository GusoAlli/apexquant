import BalanceCard from "@/components/dashboard/BalanceCard";
import PerformanceCard from "@/components/dashboard/PerformanceCard";
import StatsCard from "@/components/dashboard/StatsCard";
import BrokerCard from "@/components/broker/BrokerCard";
import BrokerStatus from "@/components/broker/BrokerStatus";
import EquityCurve from "@/components/charts/EquityCurve";
import CandlestickChart from "@/components/charts/CandlestickChart";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 xl:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[280px_1fr]">
        <div className="hidden xl:block" />

        <section className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back, John Trader</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Monitor strategy performance, active accounts, and EA status in a single place.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950 px-6 py-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Server Time</p>
                  <p className="mt-2">18 May 2025 14:30:45 (UTC+0)</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950 px-6 py-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Status</p>
                  <p className="mt-2 text-emerald-300">All Systems Operational</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <StatsCard />
            <BalanceCard />
            <PerformanceCard />
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Active Accounts</p>
              <p className="mt-3 text-3xl font-semibold text-white">3/5</p>
              <p className="mt-2 text-sm text-emerald-300">Active</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="space-y-6">
              <EquityCurve />
              <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Candlestick Chart</p>
                    <p className="mt-2 text-lg font-semibold text-white">Recent market action</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">EUR/USD</span>
                </div>
                <div className="mt-6">
                  <CandlestickChart />
                </div>
              </div>
              <BrokerStatus />
            </div>
            <div className="space-y-6">
              <BrokerCard />
              <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Subscription</p>
                    <p className="mt-2 text-lg font-semibold text-white">Pro Plan</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Active</span>
                </div>
                <div className="mt-6 space-y-4 text-slate-100">
                  <div className="rounded-3xl bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">Renews on</p>
                    <p className="mt-1 text-xl font-semibold">26 Jan 2026</p>
                    <p className="mt-2 text-sm text-slate-500">Accounts 3/5</p>
                  </div>
                  <button className="w-full rounded-3xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400">
                    Manage Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
