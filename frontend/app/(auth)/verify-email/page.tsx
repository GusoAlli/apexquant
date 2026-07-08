"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ApexLogo } from "@/components/ui/ApexLogo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok) {
          // Store tokens and redirect to dashboard
          if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
          if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
          setStatus("success");
          setTimeout(() => router.push("/dashboard/licenses"), 2500);
        } else {
          setStatus("error");
          setErrorMsg(data.message ?? "Verification failed.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Connection error. Please try again.");
      }
    })();
  }, [token, router]);

  return (
    <main className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#e7b949]/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <div
          className="w-full rounded-2xl border border-white/[0.08] bg-[#0a0f1a]/90 p-8 backdrop-blur-xl text-center"
          style={{ boxShadow: "0 32px 80px -32px rgba(0,0,0,0.9)" }}
        >
          <div className="mb-6">
            <ApexLogo size={36} showBg className="mx-auto" />
          </div>

          {status === "verifying" && (
            <>
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#e7b949]" />
              <h1 className="text-xl font-bold text-white">Verifying your email…</h1>
              <p className="mt-2 text-sm text-slate-500">This will only take a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Email verified!</h1>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Your account is active. Redirecting you to the dashboard…
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Verification failed</h1>
              <p className="mt-2 text-sm text-red-400 leading-relaxed">{errorMsg}</p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/check-email"
                  className="rounded-xl py-3 text-sm font-bold text-[#060b14] transition hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #f7d36d 0%, #b98522 100%)" }}
                >
                  Request a new link
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/[0.08] py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05]"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
