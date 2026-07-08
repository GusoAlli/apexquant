"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Crown, Loader2, Zap } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// Pages that require an active subscription (full paywall).
// Everything else is accessible; a non-blocking banner is shown instead.
const REQUIRES_SUB = ["/dashboard/bot"];

type Plan = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  features: string | null;
};

async function checkout(planId: string): Promise<string | null> {
  const res = await fetchWithAuth(`${API}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create checkout session");
  }
  const { url } = await res.json();
  return url ?? null;
}

function PlanCard({ plan, loading, onSelect }: { plan: Plan; loading: boolean; onSelect: (id: string) => void }) {
  const isInstitutional = plan.slug === "institutional";
  const features: string[] = plan.features ? JSON.parse(plan.features) : [];
  const price = plan.priceCents / 100;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        isInstitutional
          ? "border-[#e7b949]/40 bg-[#e7b949]/[0.04] shadow-[0_0_32px_rgba(231,185,73,0.08)]"
          : "border-white/[0.07] bg-white/[0.02]"
      }`}
    >
      {isInstitutional && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[#e7b949] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#060b14]">
            Most Popular
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {isInstitutional ? (
          <Crown className="h-4 w-4 text-[#e7b949]" />
        ) : (
          <Zap className="h-4 w-4 text-[#e7b949]" />
        )}
        <span className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">{plan.name}</span>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold text-white">${price}</span>
        <span className="ml-1 text-sm text-slate-500">/{plan.interval}</span>
      </div>

      <ul className="mb-8 space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ${
          isInstitutional
            ? "bg-[#e7b949] text-[#060b14] hover:bg-[#f7d36d]"
            : "border border-[#e7b949]/30 bg-[#e7b949]/10 text-[#e7b949] hover:bg-[#e7b949]/20"
        }`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Get ${plan.name}`}
      </button>
    </div>
  );
}

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "active" | "paywall" | "banner">("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const needsSub = REQUIRES_SUB.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const [subRes, plansRes] = await Promise.all([
          fetchWithAuth(`${API}/api/billing/subscription`),
          fetch(`${API}/api/billing/plans`),
        ]);

        const sub = subRes.ok ? await subRes.json() : null;
        const plansData: Plan[] = plansRes.ok ? await plansRes.json() : [];

        setPlans(plansData);
        const isActive = !!sub && ["active", "trialing"].includes(sub.status);

        if (isActive) {
          setStatus("active");
        } else if (needsSub) {
          // Hard paywall only for bot-execution pages
          setStatus("paywall");
        } else {
          // All other pages: accessible, but banner shown
          setStatus("banner");
        }
      } catch {
        setStatus(needsSub ? "paywall" : "active");
      }
    })();
  }, [pathname, needsSub]);

  const handleSelect = async (planId: string) => {
    setCheckoutError(null);
    setCheckoutLoading(planId);
    try {
      const url = await checkout(planId);
      if (url) window.location.href = url;
      else setCheckoutError("Could not initiate checkout. Please try again.");
    } catch (err: any) {
      setCheckoutError(err.message ?? "Checkout failed.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#e7b949]" />
      </div>
    );
  }

  if (status === "paywall") {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-6">
        {/* Gold accent top bar */}
        <div className="mb-6 flex flex-col items-center text-center">
          <ApexLogo size={36} className="mb-4" />
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#e7b949]">
            Subscription Required
          </p>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            Activate Your Plan
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Full access to ApexQuant's AI quant trading suite requires an active subscription.
            Choose the plan that fits your operation.
          </p>
        </div>

        {/* Plan cards */}
        {plans.length > 0 ? (
          <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                loading={checkoutLoading === plan.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-8 text-center text-sm text-slate-400">
            Plans unavailable. Please contact support.
          </div>
        )}

        {checkoutError && (
          <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {checkoutError}
          </p>
        )}

        <p className="mt-8 text-xs text-slate-600">
          Already subscribed?{" "}
          <a href="/dashboard/licenses" className="text-[#e7b949] hover:underline">
            Manage billing →
          </a>
        </p>
      </div>
    );
  }

  if (status === "banner") {
    return (
      <>
        <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/[0.05] px-4 py-3">
          <div className="flex items-center gap-3">
            <Crown className="h-4 w-4 shrink-0 text-[#e7b949]" />
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">Unlock bot automation</span>
              {" "}— subscribe for <span className="font-bold text-[#e7b949]">$30/month</span> to activate auto-execution on all strategies.
            </p>
          </div>
          <a
            href="/dashboard/licenses"
            className="shrink-0 rounded-lg bg-[#e7b949] px-3 py-1.5 text-xs font-bold text-[#060b14] transition hover:brightness-110"
          >
            Subscribe
          </a>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
