"use client";

import { wagmiConfig } from "@/lib/web3Config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

// Import side-effectful config initialisation
import "@/lib/web3Config";

const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
