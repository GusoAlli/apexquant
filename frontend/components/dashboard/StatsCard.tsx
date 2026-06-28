export default function StatsCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Total Balance</p>
          <p className="mt-3 text-3xl font-semibold text-white">$24,350.67</p>
        </div>
        <span className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">+12.45%</span>
      </div>
    </div>
  );
}
