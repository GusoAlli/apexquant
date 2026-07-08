"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EARedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/accounts"); }, [router]);
  return null;
}
