"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// Admin users and users who completed onboarding bypass this guard.
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API}/api/auth/me`);
        if (!res.ok) {
          // Not authenticated — let auth system handle it
          setReady(true);
          return;
        }
        const user = await res.json();

        // Admins always bypass onboarding
        if (user.role === "admin") { setReady(true); return; }

        if (!user.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        // Network error — let through, don't block dashboard on transient failure
      }
      setReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060b14]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e7b949]" />
      </div>
    );
  }

  return <>{children}</>;
}
