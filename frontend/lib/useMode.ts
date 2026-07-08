"use client";

import { useEffect, useState } from "react";

export type SidebarMode = "exchange" | "forex" | "web3";

export function useMode(): SidebarMode {
  const [mode, setMode] = useState<SidebarMode>("exchange");

  useEffect(() => {
    const saved = localStorage.getItem("aq_sidebar_mode");
    if (saved === "forex" || saved === "web3") setMode(saved);
    else setMode("exchange");

    const handler = (e: Event) => setMode((e as CustomEvent<SidebarMode>).detail);
    window.addEventListener("aq-mode-change", handler);
    return () => window.removeEventListener("aq-mode-change", handler);
  }, []);

  return mode;
}
