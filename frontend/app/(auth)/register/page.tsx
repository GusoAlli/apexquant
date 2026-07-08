"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { IconifySymbol } from "@/components/ui/icon";
import { ApexLogo } from "@/components/ui/ApexLogo";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type GoogleCredentialResponse = { credential: string; clientId: string };
type GoogleIdentity = {
  initialize: (cfg: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void;
  renderButton: (el: HTMLElement | null, opts: { theme: string; size: string; width: string }) => void;
};
type GoogleWindow = Window & typeof globalThis & {
  google?: { accounts?: { id?: GoogleIdentity } };
  __gsi_initialized?: boolean;
};

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars",   ok: password.length >= 8 },
    { label: "Uppercase",  ok: /[A-Z]/.test(password) },
    { label: "Number",     ok: /[0-9]/.test(password) },
    { label: "Symbol",     ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"][score];
  const label    = ["", "Weak",       "Fair",          "Good",          "Strong"        ][score];
  const labelClr = score >= 3 ? "text-emerald-400" : score >= 2 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? barColor : "bg-white/[0.08]"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${labelClr}`}>{label}</span>
        <div className="flex gap-2.5">
          {checks.map((c) => (
            <span key={c.label} className={`text-[10px] ${c.ok ? "text-emerald-400" : "text-slate-600"}`}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleResponse = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response?.credential) { setError("Google sign-in failed."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Google register failed."); return; }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      window.location.href = "/dashboard";
    } catch {
      setError("Unable to connect to the login service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initGoogle = () => {
      const gw = window as GoogleWindow;
      if (!clientId || gw.__gsi_initialized || !gw.google?.accounts?.id) return;
      gw.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleResponse });
      gw.__gsi_initialized = true;
      try {
        gw.google.accounts.id.renderButton(document.getElementById("google-signin-button"), {
          theme: "outline", size: "large", width: "320",
        });
      } catch {}
    };
    if (clientId && (window as GoogleWindow).google?.accounts?.id) { initGoogle(); return; }
    if (!document.getElementById("gsi-client-script")) {
      const script = document.createElement("script");
      script.id = "gsi-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true; script.defer = true; script.onload = initGoogle;
      document.body.appendChild(script);
    }
    return () => {};
  }, [handleGoogleResponse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed.");
        return;
      }
      // Redirect to check-email page
      window.location.href = `/check-email?email=${encodeURIComponent(data.email ?? email)}`;
    } catch {
      setError("Unable to connect to registration service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-[#3b82f6]/[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div
          className="rounded-2xl border border-white/[0.08] bg-[#0a0f1a]/90 p-8 backdrop-blur-xl"
          style={{ boxShadow: "0 32px 80px -32px rgba(0,0,0,0.9)" }}
        >
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-block" style={{ filter: "drop-shadow(0 0 14px rgba(231,185,73,0.5))" }}>
              <ApexLogo size={60} showBg />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e7b949]">ApexQuant</p>
            <h1 className="mt-3 text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-400">Use Google or email and password to get started.</p>
          </div>

          {/* Google */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <IconifySymbol icon="logos:google-icon" className="h-4 w-4" />
              Google Identity
            </div>
            <div id="google-signin-button" className="flex justify-center" />
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-500">
                <span className="bg-[#0a0f1a] px-3">Or continue with email</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="name">
                <UserRound className="h-4 w-4 text-[#e7b949]" />
                Full Name
              </label>
              <input
                id="name" type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                className="apex-input mt-2 w-full" placeholder="John Trader"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="email">
                <Mail className="h-4 w-4 text-[#e7b949]" />
                Email
              </label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="apex-input mt-2 w-full" placeholder="you@example.com" required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="password">
                <LockKeyhole className="h-4 w-4 text-[#e7b949]" />
                Password
              </label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="apex-input mt-2 w-full" placeholder="••••••••" required
              />
              <PasswordStrength password={password} />
            </div>

            <button
              type="submit" disabled={loading}
              className="apex-gold-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating your account…" : "Create account"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#e7b949] hover:brightness-110">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-400">← Back to ApexQuant</Link>
        </p>
      </div>
    </main>
  );
}
