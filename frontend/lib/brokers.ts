export type Exchange = {
  id: string;
  name: string;
  tagline: string;
  logo: string;      // emoji fallback if image fails
  logoUrl: string;   // direct image URL
  referralUrl: string;
  features: string[];
  badge?: string;
};

export type ForexBroker = {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  logoUrl: string;
  referralUrl: string;
  regulation: string[];
  minDeposit: string;
  badge?: string;
};

// ── Crypto Exchanges ──────────────────────────────────────────────────────────
// Replace referralUrl with your actual affiliate/referral links before going live.

// Google Favicon API — reliable worldwide, works for all domains
const GF = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

export const CRYPTO_EXCHANGES: Exchange[] = [
  {
    id: "binance",
    name: "Binance",
    tagline: "World's largest crypto exchange by volume",
    logo: "🟡",
    logoUrl: GF("binance.com"),
    referralUrl: "https://www.binance.com/en/register?ref=YOUR_REF_CODE",
    features: ["Spot", "Futures", "Options", "Earn"],
    badge: "Most Popular",
  },
  {
    id: "okx",
    name: "OKX",
    tagline: "Advanced trading with deep liquidity",
    logo: "⚫",
    logoUrl: GF("okx.com"),
    referralUrl: "https://www.okx.com/join/YOUR_REF_CODE",
    features: ["Spot", "Futures", "DEX", "Web3"],
  },
  {
    id: "bybit",
    name: "Bybit",
    tagline: "Leading derivatives exchange",
    logo: "🔵",
    logoUrl: GF("bybit.com"),
    referralUrl: "https://www.bybit.com/en/register?affiliate_id=YOUR_REF_CODE",
    features: ["Spot", "Perpetuals", "Options", "Copy Trading"],
  },
  {
    id: "bitget",
    name: "Bitget",
    tagline: "Top copy trading platform globally",
    logo: "🟢",
    logoUrl: GF("bitget.com"),
    referralUrl: "https://partner.bitget.com/bg/YOUR_REF_CODE",
    features: ["Spot", "Futures", "Copy Trading"],
  },
  {
    id: "mexc",
    name: "MEXC",
    tagline: "Access to 1000+ altcoins early",
    logo: "🔷",
    logoUrl: GF("mexc.com"),
    referralUrl: "https://www.mexc.com/register?inviteCode=YOUR_REF_CODE",
    features: ["Spot", "Futures", "New Listings"],
  },
  {
    id: "kucoin",
    name: "KuCoin",
    tagline: "The People's Exchange",
    logo: "🌿",
    logoUrl: GF("kucoin.com"),
    referralUrl: "https://www.kucoin.com/r/YOUR_REF_CODE",
    features: ["Spot", "Futures", "Bot Trading", "Lending"],
  },
  {
    id: "gateio",
    name: "Gate.io",
    tagline: "Widest altcoin selection on-market",
    logo: "🔴",
    logoUrl: GF("gate.io"),
    referralUrl: "https://www.gate.io/ref/YOUR_REF_CODE",
    features: ["Spot", "Futures", "Options", "NFT"],
  },
  {
    id: "hyperliquid",
    name: "Hyperliquid",
    tagline: "On-chain perpetuals with CEX speed",
    logo: "💎",
    logoUrl: GF("hyperliquid.xyz"),
    referralUrl: "https://app.hyperliquid.xyz/join/YOUR_REF_CODE",
    features: ["Perpetuals", "Vault", "On-chain"],
    badge: "DeFi",
  },
];

// ── Forex Brokers ─────────────────────────────────────────────────────────────
// NOTE: This section requires legal review before going live.
// Only show regulated brokers. Verify Bappebti/OJK compliance for Indonesian users.
// Replace referralUrl with your actual IB/referral links.

export const FOREX_BROKERS: ForexBroker[] = [
  {
    id: "exness",
    name: "Exness",
    tagline: "Ultra-low spread, instant withdrawals",
    logo: "🟠",
    logoUrl: GF("exness.com"),
    referralUrl: "https://www.exness.com/a/YOUR_IB_CODE",
    regulation: ["FCA", "CySEC", "FSA"],
    minDeposit: "$10",
    badge: "Most Popular",
  },
  {
    id: "icmarkets",
    name: "IC Markets",
    tagline: "True ECN broker, raw spreads from 0.0",
    logo: "🔵",
    logoUrl: GF("icmarkets.com"),
    referralUrl: "https://www.icmarkets.com/?camp=YOUR_IB_CODE",
    regulation: ["ASIC", "CySEC", "SCB"],
    minDeposit: "$200",
  },
  {
    id: "xm",
    name: "XM",
    tagline: "Global broker with MT4 & MT5 support",
    logo: "🔴",
    logoUrl: GF("xm.com"),
    referralUrl: "https://www.xm.com/?ref=YOUR_IB_CODE",
    regulation: ["CySEC", "ASIC", "DFSA"],
    minDeposit: "$5",
  },
  {
    id: "pepperstone",
    name: "Pepperstone",
    tagline: "Award-winning ECN execution",
    logo: "🌶️",
    logoUrl: GF("pepperstone.com"),
    referralUrl: "https://pepperstone.com/?a=YOUR_IB_CODE",
    regulation: ["ASIC", "FCA", "DFSA"],
    minDeposit: "$200",
  },
  {
    id: "fpmarkets",
    name: "FP Markets",
    tagline: "Low latency execution, wide instrument range",
    logo: "🟢",
    logoUrl: GF("fpmarkets.com"),
    referralUrl: "https://www.fpmarkets.com/?redir=YOUR_IB_CODE",
    regulation: ["ASIC", "CySEC"],
    minDeposit: "$100",
  },
  {
    id: "hfm",
    name: "HFM (HotForex)",
    tagline: "Multi-regulated with flexible account types",
    logo: "⚡",
    logoUrl: GF("hfm.com"),
    referralUrl: "https://www.hfm.com/affiliate/YOUR_IB_CODE",
    regulation: ["FCA", "CySEC", "FSCA"],
    minDeposit: "$5",
  },
];
