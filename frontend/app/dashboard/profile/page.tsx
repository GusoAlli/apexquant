"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, KeyRound, Loader2, ShieldCheck, User } from "lucide-react";
import { IconifySymbol } from "@/components/ui/icon";
import { ApexLogo } from "@/components/ui/ApexLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
}

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  plan: string;
  planSlug: string;
  planExpiry: string | null;
  hasPassword: boolean;
  provider: string | null;
  avatarUrl: string | null;
};

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
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
            <span key={c.label} className={`text-[10px] ${c.ok ? "text-emerald-400" : "text-slate-600"}`}>{c.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, { headers: authHeaders() });
        if (!res.ok) return;
        const data: UserProfile = await res.json();
        setProfile(data);
        setName(data.name ?? "");
      } catch {}
    })();
  }, []);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await fetch(`${API}/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setNameMsg({ ok: false, text: data.message ?? "Failed" }); return; }
      setProfile((p) => p ? { ...p, name: data.name } : p);
      setNameMsg({ ok: true, text: "Name updated successfully." });
    } catch {
      setNameMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePw = async () => {
    setPwMsg(null);
    const isSettingFirst = profile && !profile.hasPassword;

    if (isSettingFirst) {
      if (!newPw || !confirmPw) { setPwMsg({ ok: false, text: "Please fill in all fields." }); return; }
    } else {
      if (!currentPw || !newPw || !confirmPw) { setPwMsg({ ok: false, text: "All fields are required." }); return; }
    }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Passwords do not match." }); return; }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return; }

    setSavingPw(true);
    try {
      const body: Record<string, string> = { newPassword: newPw };
      if (!isSettingFirst) body.currentPassword = currentPw;

      const res = await fetch(`${API}/api/user/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setPwMsg({ ok: false, text: data.message ?? "Failed" }); return; }

      setPwMsg({ ok: true, text: data.message });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      // Mark as having password now
      if (isSettingFirst) setProfile((p) => p ? { ...p, hasPassword: true } : p);
    } catch {
      setPwMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingPw(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate local preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    setAvatarMsg(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API}/api/user/avatar`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarMsg({ ok: false, text: data.message ?? "Upload failed." });
        setAvatarPreview(null);
        return;
      }
      setProfile((p) => p ? { ...p, avatarUrl: data.avatarUrl } : p);
      setAvatarMsg({ ok: true, text: "Profile photo updated." });
    } catch {
      setAvatarMsg({ ok: false, text: "Upload failed. Try again." });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initials = (profile?.name ?? profile?.email ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const planExpiry = profile?.planExpiry
    ? new Date(profile.planExpiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const isGoogleUser = profile?.provider === "google";
  const hasPassword = profile?.hasPassword ?? false;

  return (
    <main className="space-y-6 py-6">
      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <div className="flex items-center gap-4">
          <ApexLogo size={36} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Settings</p>
            <h1 className="text-xl font-bold text-white">Profile & Account</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Identity Card */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Identity</p>
            <h2 className="mt-1 text-base font-bold text-white">Account Profile</h2>
          </div>

          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            {/* Clickable avatar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e7b949]/20 bg-[#e7b949]/10 transition hover:border-[#e7b949]/50 group"
              title="Change profile photo"
            >
              {avatarPreview || profile?.avatarUrl ? (
                <Image
                  src={avatarPreview ?? `${API}${profile!.avatarUrl}`}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-extrabold text-[#e7b949]">
                  {initials}
                </span>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar
                  ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                  : <Camera className="h-5 w-5 text-white" />
                }
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
            />
            <div>
              <p className="text-sm font-semibold text-white">{profile?.name ?? "—"}</p>
              <p className="text-xs text-slate-400">{profile?.email ?? "—"}</p>
              {avatarMsg && (
                <p className={`text-xs mb-1 ${avatarMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{avatarMsg.text}</p>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                <p className="text-[11px] text-slate-600">Joined {joinedDate}</p>
                {isGoogleUser && (
                  <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                    <IconifySymbol icon="logos:google-icon" className="h-3 w-3" />
                    Google
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
                placeholder="Your name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#e7b949] px-4 py-2 text-sm font-semibold text-[#060b14] transition hover:bg-[#f7d36d] disabled:opacity-50"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                Save
              </button>
            </div>
            {nameMsg && (
              <p className={`text-xs ${nameMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{nameMsg.text}</p>
            )}
          </div>

          {/* Plan status */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#e7b949]" />
                <span className="text-sm font-semibold text-white">
                  {profile?.plan ?? "Free"} Plan
                </span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                profile?.planSlug === "free" || !profile
                  ? "bg-slate-700 text-slate-400"
                  : "bg-emerald-400/10 text-emerald-400"
              }`}>
                {profile?.planSlug === "free" || !profile ? "Free" : "Active"}
              </span>
            </div>
            {planExpiry && (
              <p className="mt-1.5 text-[11px] text-slate-500">Renews on {planExpiry}</p>
            )}
            {(profile?.planSlug === "free" || !profile) && (
              <a
                href="/dashboard/licenses"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#e7b949] hover:text-[#f7d36d]"
              >
                Upgrade to Pro →
              </a>
            )}
          </div>
        </div>

        {/* Password Card */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Security</p>
            <h2 className="mt-1 text-base font-bold text-white">
              {hasPassword ? "Change Password" : "Set Password"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {hasPassword
                ? "Use a strong password of at least 8 characters."
                : "Set a password so you can also sign in with email and password."}
            </p>
          </div>

          {/* Info banner for Google users without password */}
          {isGoogleUser && !hasPassword && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3">
              <IconifySymbol icon="logos:google-icon" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm text-slate-300 leading-relaxed">
                This account was created via Google. Set a password below to also sign in with email and password.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {/* Current password — only shown if already has password */}
            {hasPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {hasPassword ? "New Password" : "Password"}
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
                placeholder="••••••••"
              />
              <PasswordStrength password={newPw} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition focus:border-[#e7b949]/40 focus:ring-1 focus:ring-[#e7b949]/20"
                placeholder="••••••••"
              />
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </div>
          </div>

          {pwMsg && (
            <p className={`text-xs ${pwMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{pwMsg.text}</p>
          )}

          <button
            onClick={handleChangePw}
            disabled={savingPw}
            className="flex items-center gap-2 rounded-lg border border-[#e7b949]/30 bg-[#e7b949]/10 px-5 py-2.5 text-sm font-semibold text-[#e7b949] transition hover:bg-[#e7b949]/20 disabled:opacity-50"
          >
            {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {hasPassword ? "Update Password" : "Set Password"}
          </button>

          <div className="border-t border-white/[0.05] pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profile Photo</p>
            <p className="mt-1 text-xs text-slate-500">
              Click your avatar above to upload a new photo. JPG, PNG or WebP · max 5 MB.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
