"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setError(loginData.message ?? "Login failed");
        setLoading(false);
        return;
      }

      const { accessToken, refreshToken } = loginData;

      const meRes = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meRes.json();

      if (me?.role?.toLowerCase() !== "admin") {
        setError("Access denied — this account does not have admin privileges.");
        setLoading(false);
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      router.replace("/admin");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060b14] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e7b949]/20 bg-[#e7b949]/5">
            <Shield className="h-7 w-7 text-[#e7b949]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Admin Access</h1>
          <p className="mt-1 text-sm text-slate-500">ApexQuant Control Panel</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-6"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="apex-input w-full"
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="apex-input w-full pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}
          >
            {loading ? "Verifying…" : "Sign In as Admin"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-700">
          Admin access only — unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
