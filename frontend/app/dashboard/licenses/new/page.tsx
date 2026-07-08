"use client";

import { useState } from 'react';
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PremiumCard, SectionHeader } from "@/components/ui/premium-card";

export default function NewLicensePage() {
  const [form, setForm] = useState({ userId: '', product: '', maxActivations: '1' });

  return (
    <main className="grid max-w-5xl gap-6 py-6">
      <PremiumCard className="p-6 lg:p-8">
        <SectionHeader
          eyebrow="Subscription"
          title="Create New License"
          description="Generate a license key for a customer and assign the maximum activation count."
        />
      </PremiumCard>

      <PremiumCard className="p-6">
        <form className="grid gap-6">
          <label className="grid gap-2 text-sm text-slate-300">
            User ID
            <input
              value={form.userId}
              onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
              className="apex-input"
              placeholder="user UUID"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Product
            <input
              value={form.product}
              onChange={(e) => setForm((prev) => ({ ...prev, product: e.target.value }))}
              className="apex-input"
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
              className="apex-input"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              <KeyRound className="h-4 w-4" />
              Create License
            </button>
            <Link href="/dashboard/licenses" className="text-sm text-slate-400 transition hover:text-white">
              Cancel
            </Link>
          </div>
        </form>
      </PremiumCard>
    </main>
  );
}
