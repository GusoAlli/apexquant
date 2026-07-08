"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Edit2, RefreshCw,
  Search, Shield, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  plan: string | null;
  planSlug: string | null;
  subStatus: string | null;
};

const PLANS = [
  { slug: "none",          name: "No Plan",       desc: "Revoke subscription" },
  { slug: "pro",           name: "Pro",            desc: "$49/mo" },
  { slug: "institutional", name: "Institutional",  desc: "$299/mo" },
];

const PLAN_COLORS: Record<string, string> = {
  institutional: "bg-[#e7b949]/10 text-[#e7b949]",
  pro:           "bg-blue-500/10 text-blue-400",
};

// ── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (patch: Partial<User>) => void;
}) {
  const currentPlan = (user.subStatus === "active" && user.planSlug) ? user.planSlug : "none";
  const [role,      setRole]      = useState(user.role.toLowerCase() === "admin" ? "admin" : "user");
  const [planSlug,  setPlanSlug]  = useState(currentPlan);
  const [expiresAt, setExpiresAt] = useState("2099-12-31");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const authHdr = () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
    return { Authorization: `Bearer ${t}` };
  };

  const handleSave = async () => {
    setError("");
    setLoading(true);

    const patch: Partial<User> = {};

    // ── Role ─────────────────────────────────────────────────────────────
    const roleChanged = role !== user.role.toLowerCase();
    if (roleChanged) {
      const res = await fetch(`${API}/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHdr() },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Failed to update role"); setLoading(false); return; }
      patch.role = data.role;
    }

    // ── Subscription ─────────────────────────────────────────────────────
    const planChanged = planSlug !== currentPlan;
    if (planChanged) {
      if (planSlug === "none") {
        // Revoke
        const res = await fetch(`${API}/api/admin/users/${user.id}/subscription`, {
          method: "DELETE",
          headers: authHdr(),
        });
        if (!res.ok) { setError("Failed to revoke subscription"); setLoading(false); return; }
        patch.plan     = null;
        patch.planSlug = null;
        patch.subStatus = null;
      } else {
        // Assign
        const res = await fetch(`${API}/api/admin/users/${user.id}/subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHdr() },
          body: JSON.stringify({ planSlug, expiresAt: `${expiresAt}T23:59:59Z` }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message ?? "Failed to assign plan"); setLoading(false); return; }
        patch.plan      = data.plan;
        patch.planSlug  = data.planSlug;
        patch.subStatus = "active";
      }
    }

    onSaved(patch);
    onClose();
  };

  const isAdmin = role === "admin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Edit User</p>
            <p className="mt-1 text-sm font-semibold text-white">{user.name ?? user.email}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* ── Role ──────────────────────────────────────────────────── */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "user",  label: "User",  desc: "Standard access" },
                { value: "admin", label: "Admin", desc: "Full control panel" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                    role === r.value
                      ? r.value === "admin"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-[#e7b949]/30 bg-[#e7b949]/8 text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {r.value === "admin" && <Shield className="h-3.5 w-3.5" />}
                    {r.label}
                  </span>
                  <span className="mt-0.5 text-[10px] opacity-60">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Subscription ────────────────────────────────────────── */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription</label>
            <div className="space-y-1.5">
              {PLANS.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setPlanSlug(p.slug)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left transition ${
                    planSlug === p.slug
                      ? p.slug === "none"
                        ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                        : "border-[#e7b949]/30 bg-[#e7b949]/8 text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12]"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className={`text-xs ${planSlug === p.slug ? "text-[#e7b949]" : "text-slate-600"}`}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expiry — only show when assigning a real plan */}
          {planSlug !== "none" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Active Until</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="apex-input w-full text-sm"
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="mt-1 text-[10px] text-slate-600">Default 2099-12-31 = lifetime access</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-[#060b14] disabled:opacity-60 transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState<User[]>([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [query,       setQuery]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [editTarget,  setEditTarget]  = useState<User | null>(null);

  const authHdr = () => {
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
    return { Authorization: `Bearer ${t}` };
  };

  const load = useCallback(async (p = 1, q = query) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), search: q });
    const res = await fetch(`${API}/api/admin/users?${params}`, { headers: authHdr() });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    }
    setLoading(false);
  }, [query]);

  useEffect(() => { load(1, ""); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
    load(1, search);
  };

  return (
    <>
      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(patch) => {
            setUsers((prev) =>
              prev.map((u) => u.id === editTarget.id ? { ...u, ...patch } : u)
            );
          }}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Admin</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">{total} total users</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="apex-input w-56 pl-8 text-sm"
                placeholder="Search email or name…"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-bold text-[#060b14]"
              style={{ background: "linear-gradient(135deg,#f7d36d 0%,#b98522 100%)" }}
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0f1a]">
          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-600">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["User", "Role", "Subscription", "Verified", "Joined", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isAdmin = u.role.toLowerCase() === "admin";
                  const hasSub  = u.plan && u.subStatus === "active";
                  return (
                    <tr key={u.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{u.name ?? "—"}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isAdmin
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/[0.04] text-slate-500"
                        }`}>
                          {isAdmin && <Shield className="h-2.5 w-2.5" />}
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {hasSub ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            PLAN_COLORS[u.planSlug ?? ""] ?? "bg-white/[0.04] text-slate-500"
                          }`}>
                            {u.plan}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">No plan</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${u.isVerified ? "text-emerald-400" : "text-slate-600"}`}>
                          {u.isVerified ? "Yes" : "No"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-[#e7b949]/20 hover:text-white"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-white/[0.08] p-2 text-slate-500 transition hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500">Page {page} of {pages}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= pages || loading}
              className="rounded-lg border border-white/[0.08] p-2 text-slate-500 transition hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
