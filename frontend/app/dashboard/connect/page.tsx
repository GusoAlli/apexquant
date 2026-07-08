"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Building2, ExternalLink, Info, Shield, Wallet,
} from "lucide-react";
import { CRYPTO_EXCHANGES, FOREX_BROKERS } from "@/lib/brokers";

type Tab = "crypto" | "forex";

// ── Brand Logo ─────────────────────────────────────────────────────────────────
// Uses Clearbit Logo API (logo.clearbit.com) for company logos.
// Falls back to emoji if the logo fails to load.

function BrandLogo({ url, fallback, name }: { url: string; fallback: string; name: string }) {
  const [err, setErr] = useState(false);

  if (err) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-2xl">
        {fallback}
      </span>
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white">
      <img
        src={url}
        alt={name}
        width={44}
        height={44}
        className="h-full w-full object-contain"
        onError={() => setErr(true)}
      />
    </div>
  );
}

// ── Exchange Card ──────────────────────────────────────────────────────────────

function ExchangeCard({ ex }: { ex: typeof CRYPTO_EXCHANGES[0] }) {
  return (
    <a
      href={ex.referralUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5 transition hover:border-[#e7b949]/30 hover:bg-[#0d1520]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <BrandLogo url={ex.logoUrl} fallback={ex.logo} name={ex.name} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white">{ex.name}</p>
              {ex.badge && (
                <span className="rounded-full bg-[#e7b949]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#e7b949]">
                  {ex.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{ex.tagline}</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-[#e7b949]" />
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {ex.features.map((f) => (
          <span key={f} className="rounded-md border border-white/[0.05] px-2 py-0.5 text-[10px] text-slate-500">
            {f}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-[#e7b949]/20 bg-[#e7b949]/[0.06] px-3 py-2">
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#e7b949]" />
        <span className="text-xs font-semibold text-[#e7b949]">Create Account via ApexQuant</span>
      </div>
    </a>
  );
}

// ── Forex Card ─────────────────────────────────────────────────────────────────

function ForexCard({ broker }: { broker: typeof FOREX_BROKERS[0] }) {
  return (
    <a
      href={broker.referralUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5 transition hover:border-blue-400/20 hover:bg-[#0d1520]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <BrandLogo url={broker.logoUrl} fallback={broker.logo} name={broker.name} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white">{broker.name}</p>
              {broker.badge && (
                <span className="rounded-full bg-blue-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                  {broker.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{broker.tagline}</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-blue-400" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {broker.regulation.map((r) => (
          <span key={r} className="flex items-center gap-1 rounded-md border border-emerald-500/15 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] text-emerald-400">
            <Shield className="h-2.5 w-2.5" /> {r}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Min. deposit: <span className="font-semibold text-slate-300">{broker.minDeposit}</span></span>
      </div>

      <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2">
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        <span className="text-xs font-semibold text-blue-400">Open Account via ApexQuant</span>
      </div>
    </a>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const [tab, setTab] = useState<Tab>("crypto");

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f1a] p-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#e7b949]">
              Exchange & Broker
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold text-white">
              Connect Your Trading Account
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-slate-400">
              Don&apos;t have an account yet? Create one via our partner links below. Already have an account?{" "}
              <Link href="/dashboard/accounts" className="font-semibold text-[#e7b949] hover:underline">
                Connect it directly →
              </Link>
            </p>
          </div>
          <Link
            href="/dashboard/accounts"
            className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            <Building2 className="h-4 w-4" />
            Connect Existing Account
          </Link>
        </div>
      </div>

      {/* Referral disclosure */}
      <div className="flex gap-2.5 rounded-xl border border-blue-400/10 bg-blue-400/[0.04] p-4 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400/60" />
        <span>
          ApexQuant receives a referral commission when you sign up through these links. This helps fund platform development at no extra cost to you.
          Your trading accounts and funds remain entirely at the exchange or broker — ApexQuant never holds custody of your assets.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-1">
        <button
          onClick={() => setTab("crypto")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
            tab === "crypto"
              ? "bg-[#e7b949] text-[#060b14]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Wallet className="h-3.5 w-3.5" />
          Crypto Exchanges ({CRYPTO_EXCHANGES.length})
        </button>
        <button
          onClick={() => setTab("forex")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
            tab === "forex"
              ? "bg-[#e7b949] text-[#060b14]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Forex Brokers ({FOREX_BROKERS.length})
        </button>
      </div>

      {tab === "crypto" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CRYPTO_EXCHANGES.map((ex) => (
            <ExchangeCard key={ex.id} ex={ex} />
          ))}
        </div>
      )}

      {tab === "forex" && (
        <>
          <div className="flex gap-2.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4 text-xs text-amber-300/70">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/60" />
            <span>
              Forex and CFD trading involves significant risk and may not be suitable for all investors.
              Only brokers regulated by recognized financial authorities are listed. Verify broker registration
              in your jurisdiction before opening an account.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FOREX_BROKERS.map((b) => (
              <ForexCard key={b.id} broker={b} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
