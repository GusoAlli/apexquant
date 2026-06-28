export default function BalanceCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Total Profit</p>
      <p className="mt-3 text-3xl font-semibold text-white">$5,230.42</p>
      <p className="mt-2 text-sm text-emerald-300">+18.75%</p>
    </div>
  );
}
