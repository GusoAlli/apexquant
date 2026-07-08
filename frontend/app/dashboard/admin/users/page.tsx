"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type User = {
  id: string; email: string; name: string | null; role: string;
  isVerified: boolean; plan: string | null; planSlug: string | null;
  subStatus: string | null; createdAt: string;
};

type Page = { total: number; page: number; pages: number; users: User[] };

export default function AdminUsersPage() {
  const [data, setData]     = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: page.toString(), search });
    const res = await fetch(`${API}/api/admin/users?${q}`, { headers: getAuthHeaders() });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const planColor = (slug: string | null) => {
    if (!slug) return "text-slate-600";
    if (slug === "institutional") return "text-[#e7b949]";
    if (slug === "pro") return "text-blue-400";
    return "text-slate-400";
  };

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#e7b949]">Admin</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">User Management</h1>
        <p className="mt-2 text-sm text-slate-400">{data?.total ?? "…"} total users</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email or name…" className="apex-input w-full pl-9 text-sm" />
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl border border-white/[0.08] p-2 text-slate-400 hover:text-white disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-slate-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] text-left text-xs uppercase tracking-wider text-slate-600">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Role</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Verified</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data?.users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-white truncate max-w-[200px]">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-slate-500 truncate max-w-[200px]">{u.email}</p>}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-bold uppercase ${u.role === "admin" ? "text-red-400" : "text-slate-500"}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold uppercase ${planColor(u.planSlug)}`}>
                      {u.plan ?? "—"}
                    </span>
                    {u.subStatus && <span className={`ml-2 text-[10px] ${u.subStatus === "active" ? "text-emerald-400" : "text-slate-600"}`}>{u.subStatus}</span>}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {u.isVerified
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      : <XCircle className="h-4 w-4 text-slate-600" />}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-xs text-slate-600">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40">
            Prev
          </button>
          <span className="text-xs text-slate-500">Page {page} of {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
