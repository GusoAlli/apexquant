"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Could not resend. Try again shortly.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <div
          className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0f1a]/90 p-8 backdrop-blur-xl text-center"
          style={{ boxShadow: "0 32px 80px -32px rgba(0,0,0,0.9)" }}
        >
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e7b949]/20 bg-[#e7b949]/10">
            <Mail className="h-7 w-7 text-[#e7b949]" />
          </div>

          <div className="mb-1">
            <ApexLogo size={20} className="mx-auto mb-3" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-white">Check your inbox</h1>
          <p className="mb-2 text-sm text-slate-400 leading-relaxed">
            We sent a verification link to
          </p>
          {email && (
            <p className="mb-6 text-sm font-semibold text-white break-all">
              {email}
            </p>
          )}
          <p className="mb-8 text-sm text-slate-500 leading-relaxed">
            Click the link in that email to verify your account and continue.
            The link expires in 24 hours.
          </p>

          {resent ? (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              Verification email resent. Please check your inbox.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || !email}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Resending..." : "Resend verification email"}
            </button>
          )}

          {error && (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <p className="text-sm text-slate-500">
            Wrong email?{" "}
            <Link href="/register" className="font-semibold text-[#e7b949] hover:brightness-110">
              Register again
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link href="/login" className="hover:text-slate-400">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
