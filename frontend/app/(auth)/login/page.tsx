"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, Mail, RefreshCw } from "lucide-react";
import { IconifySymbol } from "@/components/ui/icon";
import { ApexLogo } from "@/components/ui/ApexLogo";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type GoogleCredentialResponse = {
  credential: string;
  clientId: string;
};

type GoogleIdentity = {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (element: HTMLElement | null, options: { theme: string; size: string; width: string }) => void;
};

type GoogleWindow = Window &
  typeof globalThis & {
    google?: { accounts?: { id?: GoogleIdentity } };
    __gsi_initialized?: boolean;
  };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

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
      if (!res.ok) { setError(data.message || "Google login failed."); return; }
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
  }, [handleGoogleResponse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(data.email ?? email);
        } else if (data.code === "GOOGLE_ACCOUNT") {
          setError("__GOOGLE__");
        } else {
          setError(data.message || "Login failed.");
        }
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      window.location.href = "/dashboard";
    } catch {
      setError("Unable to connect to the login service.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail || resendStatus !== "idle") return;
    setResendStatus("sending");
    try {
      await fetch(`${API}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  };

  return (
    <main className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#3b82f6]/[0.03] blur-3xl" />
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
            <h1 className="mt-3 text-2xl font-bold text-white">Sign in to your account</h1>
            <p className="mt-1.5 text-sm text-slate-400">Use Google or your email and password.</p>
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
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="password">
                  <LockKeyhole className="h-4 w-4 text-[#e7b949]" />
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-slate-500 hover:text-[#e7b949] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="apex-input mt-2 w-full" placeholder="••••••••" required
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="apex-gold-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Error state */}
          {error && error !== "__GOOGLE__" && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {error === "__GOOGLE__" && (
            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-4">
              <p className="text-sm font-semibold text-blue-400 mb-1">Akun Google terdeteksi</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Akun ini dibuat via Google. Gunakan tombol <span className="font-medium text-white">Google Identity</span> di atas untuk masuk.
              </p>
            </div>
          )}

          {/* Email not verified state */}
          {unverifiedEmail && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-4">
              <p className="text-sm font-semibold text-amber-400 mb-1">Email not verified</p>
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Please verify <span className="text-white font-medium">{unverifiedEmail}</span> before signing in.
              </p>
              {resendStatus === "sent" ? (
                <p className="text-sm text-emerald-400">
                  Verification email resent — check your inbox.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendStatus === "sending"}
                  className="flex items-center gap-2 text-sm font-semibold text-[#e7b949] hover:brightness-110 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resendStatus === "sending" ? "animate-spin" : ""}`} />
                  {resendStatus === "sending" ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#e7b949] hover:brightness-110">
              Register
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
