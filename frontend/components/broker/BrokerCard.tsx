export default function BrokerCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Account Summary</p>
      <div className="mt-6 space-y-3 text-sm text-slate-200">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 rounded-3xl bg-white/5 p-3">
          <span className="text-slate-500">Broker</span>
          <span className="text-slate-500">Account</span>
          <span className="text-slate-500">Balance</span>
          <span className="text-slate-500">Status</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 rounded-3xl bg-slate-950 p-3">
          <span>IC Markets</span>
          <span>12345678</span>
          <span>$12,450.50</span>
          <span className="text-emerald-300">Active</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 rounded-3xl bg-slate-950 p-3">
          <span>Exness</span>
          <span>87654321</span>
          <span>$7,850.20</span>
          <span className="text-emerald-300">Active</span>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 rounded-3xl bg-slate-950 p-3">
          <span>IC Markets</span>
          <span>11223344</span>
          <span>$4,050.80</span>
          <span className="text-emerald-300">Active</span>
        </div>
      </div>
    </div>
  );
}
