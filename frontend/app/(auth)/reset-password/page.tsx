"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : "bg-white/[0.08]"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${score >= 3 ? "text-emerald-400" : score >= 2 ? "text-yellow-400" : "text-red-400"}`}>
          {labels[score]}
        </span>
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] ${c.ok ? "text-emerald-400" : "text-slate-600"}`}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message ?? "Reset failed. The link may have expired.");
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

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="mb-3 text-2xl font-bold text-white">Password reset!</h1>
              <p className="text-sm text-slate-400">
                Your password has been updated. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-white">Set a new password</h1>
                <p className="mt-2 text-sm text-slate-400">
                  Choose a strong password for your ApexQuant account.
                </p>
              </div>

              {!token && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  Invalid reset link. Please request a new one.
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                    htmlFor="password"
                  >
                    <LockKeyhole className="h-4 w-4 text-[#e7b949]" />
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="apex-input mt-2 w-full"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label
                    className="flex items-center gap-2 text-sm font-medium text-slate-300"
                    htmlFor="confirm"
                  >
                    <LockKeyhole className="h-4 w-4 text-[#e7b949]" />
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="apex-input mt-2 w-full"
                    placeholder="••••••••"
                    required
                  />
                  {confirm && password !== confirm && (
                    <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !token || password !== confirm}
                  className="apex-gold-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating password…" : "Reset password"}
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
            <Link href="/login" className="font-semibold text-[#e7b949] hover:brightness-110">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
