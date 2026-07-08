"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError("Too many requests. Please wait before trying again.");
        } else {
          setError(data.message ?? "Something went wrong. Please try again.");
        }
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
        <div className="absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <div
          className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0f1a]/90 p-8 backdrop-blur-xl"
          style={{ boxShadow: "0 32px 80px -32px rgba(0,0,0,0.9)" }}
        >
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-4 inline-block"
              style={{ filter: "drop-shadow(0 0 14px rgba(231,185,73,0.5))" }}
            >
              <ApexLogo size={60} showBg />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e7b949]">
              ApexQuant
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7b949]/10">
                <Send className="h-6 w-6 text-[#e7b949]" />
              </div>
              <h1 className="mb-3 text-2xl font-bold text-white">Check your inbox</h1>
              <p className="mb-6 text-sm text-slate-400 leading-relaxed">
                If <span className="font-medium text-white">{email}</span> is
                registered, you&apos;ll receive a password reset link shortly.
                The link expires in 1 hour.
              </p>
              <p className="text-sm text-slate-500">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-[#e7b949] hover:brightness-110"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-white">Forgot your password?</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                    htmlFor="email"
                  >
                    <Mail className="h-4 w-4 text-[#e7b949]" />
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="apex-input mt-2 w-full"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="apex-gold-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              {error && (
                <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}
            </>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-[#e7b949] hover:brightness-110">
              Back to sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-400">
            ← Back to ApexQuant
          </Link>
        </p>
      </div>
    </main>
  );
}
