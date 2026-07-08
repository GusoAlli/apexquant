"use client";

import dynamic from "next/dynamic";

// Load Web3Provider only on client to avoid SSR hydration issues
const Web3Provider = dynamic(() => import("./Web3Provider"), { ssr: false });

export default function DashboardClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Web3Provider>{children}</Web3Provider>;
}
