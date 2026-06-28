export default function BrokerStatus() {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">EA Status</p>
          <p className="mt-2 text-xs text-slate-500">View All</p>
        </div>
      </div>
      <div className="mt-6 space-y-4 text-sm text-slate-200">
        {['EURUSD - ICMarkets', 'XAUUSD - Exness', 'US30 - ICMarkets'].map((item) => (
          <div key={item} className="rounded-3xl bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white">ApexQuant Trader v2.1.4</p>
                <p className="text-slate-500">{item}</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Running</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
