// Platform fee configuration
// EVM fee receiver: Gnosis Safe (ApexQuantTeam) — 0xB780...4322
// Safe is counterfactually deployed; auto-activates on first received transaction.

export const FEE_CONFIG = {
  // Gnosis Safe multi-sig — receives fees from all EVM chains
  // (Ethereum, Arbitrum, BNB Chain, Polygon, HyperLiquid)
  receiverEvm: process.env.NEXT_PUBLIC_FEE_RECEIVER_EVM ?? "",

  // Solana fee account — to be added when Solana swap is implemented
  receiverSolana: process.env.NEXT_PUBLIC_FEE_RECEIVER_SOL ?? "",

  // Fee in basis points (50 bps = 0.5%)
  feeBps: 50,

  // Fee as percentage string for display
  feePercent: "0.5%",
} as const;

// Helper: build 1inch swap URL with fee referral
export function build1inchSwapParams(params: {
  src:      string; // from token address
  dst:      string; // to token address
  amount:   string; // in wei
  from:     string; // user wallet address
  slippage: number; // e.g. 0.5
  chainId:  number; // e.g. 1 for Ethereum
}) {
  return {
    ...params,
    referrer: FEE_CONFIG.receiverEvm,
    fee:      FEE_CONFIG.feeBps / 100, // 1inch expects 0–3 (percent)
    disableEstimate: false,
  };
}
