"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, Brain, LogOut, Shield, Users, Zap } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const NAV = [
  { label: "Dashboard", icon: BarChart3, href: "/admin" },
  { label: "Users",     icon: Users,     href: "/admin/users" },
  { label: "Signals",   icon: Zap,       href: "/admin/signals" },
  { label: "Engine",    icon: Brain,     href: "/admin/engine" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName,  setAdminName]  = useState("");
  const [checking,   setChecking]   = useState(true);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) { router.replace("/admin/login"); return; }

    fetchWithAuth(`${API}/api/auth/me`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.role?.toLowerCase() !== "admin") {
          router.replace("/admin/login");
        } else {
          setAdminEmail(d.email ?? "");
          setAdminName(d.name ?? d.email ?? "Admin");
          setChecking(false);
        }
      })
      .catch(() => router.replace("/admin/login"));
  }, [pathname, router]);

  const handleLogout = () => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    fetch(`${API}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.replace("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060b14]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e7b949] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#060b14] text-slate-200">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#080c14]">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-5">
          <Shield className="h-5 w-5 text-[#e7b949]" />
          <div>
            <p className="text-xs font-extrabold tracking-widest text-white">APEX ADMIN</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "border border-[#e7b949]/20 bg-[#e7b949]/8 text-white shadow-[inset_3px_0_0_#e7b949]"
                    : "border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[#e7b949]" : "text-slate-600"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 rounded-lg bg-white/[0.02] px-3 py-2">
            <p className="text-xs font-semibold text-white truncate">{adminName}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-600">{adminEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition hover:bg-red-500/[0.05] hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
