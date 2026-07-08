"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, ChevronRight, KeyRound, Loader2, User } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Password strength ─────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars",  ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number",    ok: /[0-9]/.test(password) },
    { label: "Symbol",    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"][score];
  const label    = ["", "Weak",       "Fair",          "Good",          "Strong"        ][score];
  const labelClr = score >= 3 ? "text-emerald-400" : score >= 2 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? barColor : "bg-white/[0.08]"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${labelClr}`}>{label}</span>
        <div className="flex gap-2.5">
          {checks.map((c) => (
            <span key={c.label} className={`text-[10px] ${c.ok ? "text-emerald-400" : "text-slate-600"}`}>{c.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [profile, setProfile] = useState<{ name: string | null; email: string; provider: string | null; hasPassword: boolean; avatarUrl: string | null; onboardingComplete: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  // Name
  const [name,       setName]       = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameOk,     setNameOk]     = useState(false);

  // Password
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw,  setSavingPw]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [pwErr,     setPwErr]     = useState("");

  // Avatar
  const [avatarPreview,  setAvatarPreview]  = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarOk,       setAvatarOk]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API}/api/auth/me`);
        if (!res.ok) { window.location.href = "/login"; return; }
        const data = await res.json();
        // Already completed or admin — go to dashboard
        if (data.onboardingComplete || data.role === "admin") {
          window.location.href = "/dashboard";
          return;
        }
        setProfile(data);
        setName(data.name ?? "");
      } catch {
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetchWithAuth(`${API}/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) setNameOk(true);
    } finally {
      setSavingName(false);
    }
  };

  const handleSetPassword = async () => {
    setPwErr("");
    if (!newPw || !confirmPw) { setPwErr("Fill both fields."); return; }
    if (newPw !== confirmPw)  { setPwErr("Passwords do not match."); return; }
    if (newPw.length < 8)     { setPwErr("At least 8 characters."); return; }
    setSavingPw(true);
    try {
      const res = await fetchWithAuth(`${API}/api/user/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      if (res.ok) { setPwOk(true); setNewPw(""); setConfirmPw(""); }
      else        { const d = await res.json(); setPwErr(d.message ?? "Failed."); }
    } finally {
      setSavingPw(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetchWithAuth(`${API}/api/user/avatar`, { method: "POST", body: form });
      if (res.ok) setAvatarOk(true);
      else        { setAvatarPreview(null); }
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await fetchWithAuth(`${API}/api/user/complete-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      window.location.href = "/dashboard";
    } finally {
      setCompleting(false);
    }
  };

  const initials = (profile?.name ?? profile?.email ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const canContinue = name.trim().length > 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#e7b949]" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      {/* BG glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-3xl" />
      </div>

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0f1a]/90 p-8 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-block" style={{ filter: "drop-shadow(0 0 14px rgba(231,185,73,0.4))" }}>
            <ApexLogo size={52} showBg />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e7b949]">Welcome to ApexQuant</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Set Up Your Profile</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Takes less than a minute. You can change everything later in Settings.
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Avatar ── */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#e7b949]/30 bg-[#e7b949]/10 transition hover:border-[#e7b949]/60 group"
            >
              {avatarPreview || profile?.avatarUrl ? (
                <Image
                  src={avatarPreview ?? `${API}${profile!.avatarUrl}`}
                  alt="Avatar" fill className="object-cover" unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-[#e7b949]">
                  {initials}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar
                  ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                  : <Camera className="h-5 w-5 text-white" />}
              </div>
              {avatarOk && (
                <div className="absolute -right-1.5 -top-1.5 rounded-full bg-emerald-500 p-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} />
            <p className="text-xs text-slate-500">Click to upload profile photo (optional)</p>
          </div>

          {/* ── Display Name ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Display Name <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameOk(false); }}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
                placeholder="Your name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#e7b949]/10 border border-[#e7b949]/30 px-3 py-2.5 text-xs font-semibold text-[#e7b949] transition hover:bg-[#e7b949]/20 disabled:opacity-40"
              >
                {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : nameOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <User className="h-3.5 w-3.5" />}
                {nameOk ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* ── Password ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Set Password
              </label>
              <span className="text-[10px] text-slate-600">Optional — skip if using Google only</span>
            </div>
            <input
              type="password" value={newPw}
              onChange={(e) => { setNewPw(e.target.value); setPwOk(false); setPwErr(""); }}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
              placeholder="New password"
            />
            <PasswordStrength password={newPw} />
            <input
              type="password" value={confirmPw}
              onChange={(e) => { setConfirmPw(e.target.value); setPwOk(false); setPwErr(""); }}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
              placeholder="Confirm password"
            />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            {pwErr && <p className="text-xs text-red-400">{pwErr}</p>}
            {newPw && (
              <button
                onClick={handleSetPassword}
                disabled={savingPw || !newPw || !confirmPw}
                className="flex items-center gap-2 rounded-lg border border-[#e7b949]/30 bg-[#e7b949]/10 px-4 py-2 text-xs font-semibold text-[#e7b949] transition hover:bg-[#e7b949]/20 disabled:opacity-40"
              >
                {savingPw ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pwOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <KeyRound className="h-3.5 w-3.5" />}
                {pwOk ? "Password Set" : "Set Password"}
              </button>
            )}
          </div>

          {/* ── Continue button ── */}
          <button
            onClick={handleComplete}
            disabled={completing || !canContinue}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-[#060b14] transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#f7d36d 0%,#d4a017 100%)", boxShadow: "0 6px 24px -8px rgba(231,185,73,0.6)" }}
          >
            {completing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>Enter Dashboard <ChevronRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-xs text-slate-600">
            Name is required. Photo and password can be set later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
