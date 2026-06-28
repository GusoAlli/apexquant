import Link from 'next/link';

const licenses = [
  { key: 'LIC-0A1B2C3D4E', product: 'ApexQuant Pro', status: 'Active', activations: 2, maxActivations: 5 },
  { key: 'LIC-5F6G7H8I9J', product: 'ApexQuant Signal', status: 'Revoked', activations: 1, maxActivations: 1 },
];

export default function LicensesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 xl:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[280px_1fr]">
        <section className="space-y-8">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">License Management</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">Your active licenses</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Manage EA licenses, view activation counts, and revoke compromised keys.
                </p>
              </div>
              <Link href="/dashboard/licenses/new" className="rounded-full bg-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400">
                Create license
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
            <div className="grid gap-4">
              {licenses.map((license) => (
                <div key={license.key} className="rounded-3xl border border-white/10 bg-slate-950 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{license.product}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{license.key}</p>
                      <p className="mt-1 text-sm text-slate-500">Activations {license.activations}/{license.maxActivations}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs ${license.status === 'Active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                        {license.status}
                      </span>
                      <button className="rounded-2xl bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                        View details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
