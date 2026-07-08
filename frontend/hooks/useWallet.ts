"use client";

import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { useDisconnect } from "wagmi";

export function useWallet() {
  const { open }                                         = useAppKit();
  const { address, isConnected, status }                 = useAppKitAccount();
  const { caipNetwork, switchNetwork: appkitSwitch }     = useAppKitNetwork();
  const { disconnect }                                   = useDisconnect();

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return {
    address,
    shortAddress,
    isConnected,
    status,
    network:        caipNetwork?.name ?? null,
    activeChainId:  caipNetwork?.id   ?? null,       // numeric for EVM, string for Solana
    chainNamespace: caipNetwork?.chainNamespace ?? null, // "eip155" | "solana"
    connect:          () => open({ view: "Connect" }),
    disconnect:       () => disconnect(),
    switchNetwork:    () => open({ view: "Networks" }),
    switchToNetwork:  (network: AppKitNetwork) => appkitSwitch(network),
  };
}
