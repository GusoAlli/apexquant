"use client";

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { mainnet, polygon, arbitrum, bsc, solana, type AppKitNetwork } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";

// Order: ETH → SOL → BNB → POL → ARB
export const SUPPORTED_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet, solana, bsc, polygon, arbitrum,
];

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet, bsc, polygon, arbitrum],
});

export const solanaAdapter = new SolanaAdapter();

createAppKit({
  adapters:  [wagmiAdapter, solanaAdapter],
  networks:  SUPPORTED_NETWORKS,
  projectId,
  metadata: {
    name:        "ApexQuant",
    description: "Cloud Trading Intelligence Platform",
    url:         "https://apexquant.com",
    icons:       [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent":               "#7c3aed",
    "--w3m-border-radius-master": "12px",
  },
  features: {
    analytics: false,
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Maps ChainId string → AppKitNetwork object for programmatic switching
export const CHAIN_NETWORK_MAP: Record<string, AppKitNetwork> = {
  ethereum: mainnet,
  solana:   solana,
  bsc:      bsc,
  polygon:  polygon,
  arbitrum: arbitrum,
};
