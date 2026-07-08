"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Crown, Loader2,
  ReceiptText, RefreshCw, ShieldCheck, Wallet, X, Zap,
} from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";
import type { Paddle } from "@paddle/paddle-js";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Plan = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  priceIdr: number | null;
  priceUsdt: number | null;
  currency: string;
  interval: string;
  features: string | null;
};

type Subscription = {
  id: string;
  status: string;
  provider: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  plan: Plan;
};

type PaymentMethod = "xendit" | "paddle" | "usdt";

// ── Payment method modal ──────────────────────────────────────────────────────

function PaymentModal({
  plan,
  onClose,
  onPay,
  loading,
}: {
  plan: Plan;
  onClose: () => void;
  onPay: (method: PaymentMethod) => void;
  loading: PaymentMethod | null;
}) {
  const usd   = plan.priceCents / 100;
  const idr   = plan.priceIdr ? plan.priceIdr.toLocaleString("id-ID") : null;
  const usdt  = plan.priceUsdt ?? usd;

  const methods: { id: PaymentMethod; label: string; sub: string; price: string; flag: string; available: boolean }[] = [
    {
      id:        "paddle",
      label:     "Pay with Card",
      sub:       "Credit / Debit Card · PayPal · Global (Paddle)",
      price:     `$${usd}/month`,
      flag:      "💳",
      available: true,
    },
    {
      id:        "xendit",
      label:     "Pay with Xendit",
      sub:       "QRIS · Virtual Account · GoPay · OVO · Dana (Indonesia)",
      price:     idr ? `Rp ${idr}/mo` : "Not available",
      flag:      "🇮🇩",
      available: !!plan.priceIdr,
    },
    {
      id:        "usdt",
      label:     "Pay with USDT / USDC",
      sub:       "Ethereum · BNB Chain · Solana · TRC-20",
      price:     `$${usdt} USDT/month`,
      flag:      "🔐",
      available: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-6 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Choose Payment Method</p>
        <h3 className="mt-1 text-lg font-extrabold text-white">{plan.name} Plan</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Select your preferred payment method below
        </p>

        {/* Methods */}
        <div className="mt-5 space-y-2.5">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => m.available && onPay(m.id)}
              disabled={!m.available || loading !== null}
              className={`relative flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                m.available
                  ? "border-white/[0.08] bg-white/[0.03] hover:border-[#e7b949]/30 hover:bg-[#e7b949]/[0.04]"
                  : "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-40"
              }`}
            >
              <span className="text-2xl">{m.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{m.label}</p>
                  {!m.available && (
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{m.sub}</p>
              </div>
              <div className="shrink-0 text-right">
                {loading === m.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#e7b949]" />
                ) : (
                  <p className="text-xs font-bold text-[#e7b949]">{m.price}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-700">
          Secure payment · No trial period · Cancel anytime
        </p>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrentPlan,
  onSubscribe,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  onSubscribe: (plan: Plan) => void;
}) {
  const isInstitutional = plan.slug === "institutional";
  const features: string[] = plan.features ? JSON.parse(plan.features) : [];
  const price = plan.priceCents / 100;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition ${
        isCurrentPlan
          ? "border-emerald-500/40 bg-emerald-400/[0.03]"
          : isInstitutional
          ? "border-[#e7b949]/35 bg-[#e7b949]/[0.03] shadow-[0_0_40px_rgba(231,185,73,0.06)]"
          : "border-white/[0.07] bg-white/[0.02]"
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-6">
          <span className="rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
            Current Plan
          </span>
        </div>
      )}
      {!isCurrentPlan && isInstitutional && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[#e7b949] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#060b14]">
            Most Popular
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {isInstitutional
          ? <Crown className="h-4 w-4 text-[#e7b949]" />
          : <Zap className="h-4 w-4 text-[#e7b949]" />}
        <span className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">{plan.name}</span>
      </div>

      <div className="mb-1">
        <span className="text-4xl font-extrabold text-white">${price}</span>
        <span className="ml-1 text-sm text-slate-500">/{plan.interval}</span>
      </div>
      {plan.priceIdr && (
        <p className="mb-5 text-xs text-slate-600">
          or Rp {plan.priceIdr.toLocaleString("id-ID")}/mo via Xendit
        </p>
      )}

      <ul className="mb-8 space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {f}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          Active
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
            isInstitutional
              ? "bg-[#e7b949] text-[#060b14] hover:bg-[#f7d36d]"
              : "border border-[#e7b949]/30 bg-[#e7b949]/10 text-[#e7b949] hover:bg-[#e7b949]/20"
          }`}
        >
          Subscribe to {plan.name}
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams  = useSearchParams();
  const didSucceed = searchParams.get("payment") === "success" || searchParams.get("success") === "1";

  const [sub, setSub]                 = useState<Subscription | null | undefined>(undefined);
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelDone, setCancelDone]   = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const paddleRef = useRef<Paddle | null>(null);

  // Initialize Paddle.js once
  useEffect(() => {
    (async () => {
      const { initializePaddle } = await import("@paddle/paddle-js");
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (!token) return;
      const paddle = await initializePaddle({
        environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") ?? "sandbox",
        token,
        eventCallback(event) {
          if (event.name === "checkout.completed") {
            setSelectedPlan(null);
            setTimeout(() => window.location.href = "/dashboard/licenses?payment=success&provider=paddle", 2000);
          }
        },
      });
      if (paddle) paddleRef.current = paddle;
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch(`${API}/api/billing/subscription`, { headers: authHeaders() }),
          fetch(`${API}/api/billing/plans`),
        ]);
        setSub(subRes.ok ? await subRes.json() : null);
        setPlans(plansRes.ok ? await plansRes.json() : []);
      } catch {
        setSub(null);
      }
    })();
  }, []);

  const handlePay = async (method: PaymentMethod) => {
    if (!selectedPlan) return;
    setCheckoutError(null);
    setLoadingMethod(method);
    try {
      if (method === "paddle") {
        const res = await fetch(`${API}/api/billing/checkout/paddle`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body:    JSON.stringify({ planId: selectedPlan.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Checkout failed");
        if (!paddleRef.current) throw new Error("Paddle.js not initialized");
        setSelectedPlan(null);
        paddleRef.current.Checkout.open({ transactionId: data.transactionId });
        return;
      }

      const endpoint =
        method === "xendit" ? "/api/billing/checkout/xendit" :
        "/api/billing/checkout/usdt";

      const res = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message ?? "Could not initiate checkout.");
      setSelectedPlan(null);
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure? Your subscription will remain active until the end of the billing period.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`${API}/api/billing/cancel`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Cancel failed");
      setCancelDone(true);
      setSub((s) => s ? { ...s, cancelAtPeriodEnd: true } : s);
    } catch (err: any) {
      setCancelError(err.message ?? "Could not cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  const expiryStr = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <main className="space-y-8 py-6">
      {/* Payment method modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          loading={loadingMethod}
          onClose={() => { setSelectedPlan(null); setCheckoutError(null); }}
          onPay={handlePay}
        />
      )}

      {/* Page header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <div className="flex items-center gap-4">
          <ApexLogo size={36} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Billing</p>
            <h1 className="text-xl font-bold text-white">Subscription & Billing</h1>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {didSucceed && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Payment successful!</p>
            <p className="text-xs text-emerald-600">Welcome to ApexQuant. All features are now unlocked.</p>
          </div>
        </div>
      )}

      {/* Active subscription */}
      {sub === undefined ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#e7b949]" />
        </div>
      ) : sub ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949] mb-4">
            Active Subscription
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/10">
                {sub.plan.slug === "institutional"
                  ? <Crown className="h-5 w-5 text-[#e7b949]" />
                  : <Zap className="h-5 w-5 text-[#e7b949]" />}
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">{sub.plan.name} Plan</p>
                <p className="text-sm text-slate-400">
                  ${sub.plan.priceCents / 100}/{sub.plan.interval}
                  {sub.provider && sub.provider !== "stripe" && (
                    <span className="ml-2 rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-600">
                      via {sub.provider}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {sub.cancelAtPeriodEnd ? (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                  Cancels {expiryStr ?? "at period end"}
                </span>
              ) : (
                <>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                    Active — renews {expiryStr ?? "—"}
                  </span>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Cancel Plan
                  </button>
                </>
              )}
            </div>
          </div>
          {cancelDone && (
            <p className="mt-4 text-xs text-amber-400">
              Subscription scheduled for cancellation. You retain full access until {expiryStr}.
            </p>
          )}
          {cancelError && <p className="mt-4 text-xs text-red-400">{cancelError}</p>}
        </div>
      ) : null}

      {/* Plan cards */}
      <div>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">
            {sub ? "Upgrade or Change Plan" : "Choose Your Plan"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">
            {sub ? "Compare plans and switch anytime" : "Subscribe to unlock the full ApexQuant trading suite"}
          </h2>
          {!sub && (
            <p className="mt-1 text-sm text-slate-500">
              No trial period — full access from day one. Cancel anytime before renewal.
            </p>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-10 text-center">
            <ReceiptText className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">No plans available. Please contact support.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={sub?.plan?.id === plan.id && !sub.cancelAtPeriodEnd}
                onSubscribe={setSelectedPlan}
              />
            ))}
          </div>
        )}

        {checkoutError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{checkoutError}</p>
          </div>
        )}
      </div>

      {/* Payment methods info */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Available payment methods</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: "💳 Paddle", sub: "Card · PayPal · Global", active: true },
                { label: "🇮🇩 Xendit", sub: "QRIS · VA · GoPay · OVO · Dana", active: true },
                { label: "🔐 USDT / USDC", sub: "Multi-chain crypto", active: false },
              ].map((m) => (
                <div
                  key={m.label}
                  className={`rounded-lg border px-3 py-2 ${
                    m.active
                      ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                      : "border-white/[0.04] opacity-40"
                  }`}
                >
                  <p className="text-xs font-bold text-white">{m.label}</p>
                  <p className="text-[10px] text-slate-600">{m.sub}</p>
                  {!m.active && (
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Coming soon</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
