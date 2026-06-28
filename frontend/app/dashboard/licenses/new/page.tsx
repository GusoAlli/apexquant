"use client";

import { useState } from 'react';

export default function NewLicensePage() {
  const [form, setForm] = useState({ userId: '', product: '', maxActivations: '1' });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8 xl:px-12">
      <div className="mx-auto grid max-w-5xl gap-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          <h1 className="text-3xl font-semibold text-white">Create New License</h1>
          <p className="mt-3 text-sm text-slate-400">
            Generate a license key for a customer and assign the maximum activation count.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-8 shadow-[0_16px_50px_-35px_rgba(0,0,0,0.8)]">
          <form className="grid gap-6">
            <label className="grid gap-2 text-sm text-slate-300">
              User ID
              <input
                value={form.userId}
                onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
                className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
                placeholder="user UUID"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Product
              <input
                value={form.product}
                onChange={(e) => setForm((prev) => ({ ...prev, product: e.target.value }))}
                className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
                placeholder="ApexQuant Pro"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Max Activations
              <input
                type="number"
                min={1}
                value={form.maxActivations}
                onChange={(e) => setForm((prev) => ({ ...prev, maxActivations: e.target.value }))}
                className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-yellow-500"
              />
            </label>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className="rounded-3xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400"
              >
                Create License
              </button>
              <a href="/dashboard/licenses" className="text-sm text-slate-400 hover:text-white">
                Cancel
              </a>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
