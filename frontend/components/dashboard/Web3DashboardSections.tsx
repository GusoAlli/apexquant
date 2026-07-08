"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight, ArrowUpRight, CheckCircle2, Clock,
  ExternalLink, Layers, LogOut, RefreshCw, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { CHAIN_NETWORK_MAP } from "@/lib/web3Config";

// ── Token & chain helpers ─────────────────────────────────────────────────────

const TOKEN_COLOR: Record<string, string> = {
  // Ethereum / Arbitrum
  ETH:   "#627EEA",
  WBTC:  "#F7931A",
  BTC:   "#F7931A",
  ARB:   "#28A0F0",
  LINK:  "#375BD2",
  USDT:  "#26A17B",
  USDC:  "#2775CA",
  UNI:   "#FF007A",
  GMX:   "#03D1CF",
  AAVE:  "#B6509E",
  DAI:   "#F5AC37",
  // BSC
  BNB:   "#F0B90B",
  WBNB:  "#F0B90B",
  BTCB:  "#F7931A",
  BUSD:  "#F0B90B",
  CAKE:  "#D1884F",
  XVS:   "#F0B90B",
  // Solana
  SOL:   "#9945FF",
  RAY:   "#4F46E5",
  JUP:   "#24AE8F",
  BONK:  "#F76E1C",
  WIF:   "#A855F7",
  mSOL:  "#9945FF",
  // HyperLiquid
  HYPE:  "#05F283",
  // Polygon
  MATIC: "#8247E5",
  POL:   "#8247E5",
  QUICK: "#2BBDF7",
  SAND:  "#04ADEF",
};

// Trust Wallet Assets — same source used by Uniswap, MetaMask, 1inch
const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";
export const TOKEN_LOGO: Record<string, string> = {
  // Ethereum / multi-chain
  ETH:   `${TW}/ethereum/info/logo.png`,
  BTC:   `${TW}/bitcoin/info/logo.png`,
  WBTC:  `${TW}/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png`,
  USDT:  `${TW}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
  USDC:  `${TW}/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png`,
  DAI:   `${TW}/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png`,
  LINK:  `${TW}/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png`,
  UNI:   `${TW}/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png`,
  AAVE:  `${TW}/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png`,
  // Arbitrum
  ARB:   `${TW}/arbitrum/assets/0x912CE59144191C1204E64559FE8253a0e49E6548/logo.png`,
  GMX:   `${TW}/arbitrum/assets/0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a/logo.png`,
  // BSC / BNB Chain
  BNB:   `${TW}/smartchain/info/logo.png`,
  WBNB:  `${TW}/smartchain/info/logo.png`,
  BTCB:  `${TW}/smartchain/assets/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c/logo.png`,
  BUSD:  `${TW}/smartchain/assets/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56/logo.png`,
  CAKE:  `${TW}/smartchain/assets/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82/logo.png`,
  XVS:   `${TW}/smartchain/assets/0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63/logo.png`,
  // Solana
  SOL:   `${TW}/solana/info/logo.png`,
  RAY:   `${TW}/solana/assets/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png`,
  BONK:  `${TW}/solana/assets/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png`,
  // Polygon
  MATIC: `${TW}/polygon/info/logo.png`,
  POL:   `${TW}/polygon/info/logo.png`,
  QUICK: `${TW}/polygon/assets/0x831753DD7087CaC61aB5644b308642cc1c33Dc13/logo.png`,
  SAND:  `${TW}/polygon/assets/0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683/logo.png`,
};

// ── Chain definitions ─────────────────────────────────────────────────────────

export type ChainId = "ethereum" | "solana" | "bsc" | "polygon" | "arbitrum";

export type Chain = {
  id: ChainId;
  name: string;
  shortName: string;
  color: string;
  logoUrl: string;
  nativeCurrency: string;
  gasEst: string;
  aggregator: string;       // display label (e.g. "Auto · Best Price")
  aggregators: string[];    // actual aggregators queried for best price
  dexes: string;
  evmChainId?: number;      // undefined for non-EVM chains
};

export const CHAINS: Chain[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    shortName: "ETH",
    color: "#627EEA",
    logoUrl: TOKEN_LOGO.ETH,
    nativeCurrency: "ETH",
    gasEst: "~$5–15",
    aggregator: "Auto · Best Price",
    aggregators: ["1inch", "Paraswap", "OpenOcean", "KyberSwap"],
    dexes: "Uniswap V3 · Curve · Balancer",
    evmChainId: 1,
  },
  {
    id: "solana",
    name: "Solana",
    shortName: "SOL",
    color: "#9945FF",
    logoUrl: TOKEN_LOGO.SOL,
    nativeCurrency: "SOL",
    gasEst: "~$0.001",
    aggregator: "Jupiter",
    aggregators: ["Jupiter"],
    dexes: "Raydium · Orca · Meteora",
  },
  {
    id: "bsc",
    name: "BNB Chain",
    shortName: "BNB",
    color: "#F0B90B",
    logoUrl: TOKEN_LOGO.BNB,
    nativeCurrency: "BNB",
    gasEst: "~$0.10",
    aggregator: "Auto · Best Price",
    aggregators: ["1inch", "Paraswap", "OpenOcean"],
    dexes: "PancakeSwap · Biswap · ApeSwap",
    evmChainId: 56,
  },
  {
    id: "polygon",
    name: "Polygon",
    shortName: "POL",
    color: "#8247E5",
    logoUrl: TOKEN_LOGO.MATIC,
    nativeCurrency: "POL",
    gasEst: "~$0.01",
    aggregator: "Auto · Best Price",
    aggregators: ["1inch", "Paraswap", "OpenOcean", "KyberSwap"],
    dexes: "QuickSwap · Uniswap V3 · Balancer",
    evmChainId: 137,
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    shortName: "ARB",
    color: "#28A0F0",
    logoUrl: TOKEN_LOGO.ARB,
    nativeCurrency: "ETH",
    gasEst: "~$0.02",
    aggregator: "Auto · Best Price",
    aggregators: ["1inch", "Paraswap", "OpenOcean", "KyberSwap"],
    dexes: "Uniswap V3 · Camelot · SushiSwap",
    evmChainId: 42161,
  },
];

export function TokenAvatar({
  symbol, size = 28,
}: { symbol: string; size?: number }) {
  const [err, setErr] = useState(false);
  const logoUrl = TOKEN_LOGO[symbol];
  const color   = TOKEN_COLOR[symbol] ?? "#7c3aed";

  if (logoUrl && !err) {
    return (
      <div
        style={{ width: size, height: size }}
        className="shrink-0 overflow-hidden rounded-full bg-white/[0.06]"
      >
        <img
          src={logoUrl}
          alt={symbol}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          onError={() => setErr(true)}
        />
      </div>
    );
  }

  // Fallback: colored initial badge
  return (
    <div
      style={{ width: size, height: size, background: color + "22", borderColor: color + "50", color }}
      className="flex shrink-0 items-center justify-center rounded-full border text-[9px] font-extrabold tracking-tight"
    >
      {symbol.slice(0, 3)}
    </div>
  );
}

// ── Live prices from Binance ──────────────────────────────────────────────────

type Ticker = { price: number; change: number; volume: number };

const PRICE_PAIRS = [
  "ETHUSDT", "BTCUSDT", "ARBUSDT", "LINKUSDT", "UNIUSDT",
  "BNBUSDT", "SOLUSDT", "MATICUSDT", "CAKEUSDT", "RAYUSDT",
  "JUPUSDT", "BONKUSDT",
];

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(PRICE_PAIRS)}`
        );
        const data = await res.json();
        const map: Record<string, Ticker> = {};
        for (const t of data) {
          const sym = (t.symbol as string).replace("USDT", "");
          map[sym] = {
            price:  parseFloat(t.lastPrice),
            change: parseFloat(t.priceChangePercent),
            volume: parseFloat(t.quoteVolume),
          };
        }
        setPrices(map);
      } catch {}
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  return prices;
}

export function fmtPrice(n: number) {
  if (n >= 10_000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1)      return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return "$" + n.toFixed(6);
}

function fmtVol(n: number) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  return "$" + n.toFixed(0);
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export function Web3Hero() {
  const {
    isConnected, shortAddress, network,
    activeChainId, chainNamespace,
    connect, disconnect, switchNetwork, switchToNetwork,
  } = useWallet();

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-violet-500/20 p-6 lg:p-8"
      style={{ background: "linear-gradient(135deg,#0c0a1e 0%,#0a0f1a 55%,#080c18 100%)" }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-blue-600/8 blur-2xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        {/* Left: copy */}
        <div className="max-w-lg">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {CHAINS.map((c) => {
              const appkitNet = CHAIN_NETWORK_MAP[c.id];
              const isActive  = c.id === "solana"
                ? chainNamespace === "solana"
                : c.evmChainId !== undefined && activeChainId === c.evmChainId;

              return (
                <button
                  key={c.id}
                  onClick={() => appkitNet && switchToNetwork(appkitNet)}
                  disabled={!appkitNet}
                  title={appkitNet ? `Switch to ${c.name}` : `${c.name} (coming soon)`}
                  className="flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-125 disabled:cursor-default disabled:opacity-60"
                  style={{
                    borderColor: isActive ? c.color + "90" : c.color + "40",
                    background:  isActive ? c.color + "30" : c.color + "18",
                    color:       c.color,
                    boxShadow:   isActive ? `0 0 8px ${c.color}40` : "none",
                  }}
                >
                  {c.logoUrl ? (
                    <img
                      src={c.logoUrl}
                      alt={c.shortName}
                      width={14}
                      height={14}
                      className="rounded-full object-contain"
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  )}
                  {c.shortName}
                </button>
              );
            })}
            <span className="flex h-6 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Networks Active
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white lg:text-3xl">
            ApexQuant{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Swap
            </span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Best execution across 500+ DEXes on Ethereum, Solana, BNB Chain, HyperLiquid, Polygon, Arbitrum & XPL Plasma — non-custodial, no registration.
            Your keys, your crypto. Platform earns 0.5% per swap, built into the route.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/swap"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.6)" }}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Start Swapping
            </Link>
            {isConnected ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-2.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{shortAddress}</span>
                <button
                  onClick={switchNetwork}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400 transition hover:border-violet-500/30 hover:text-violet-400"
                >
                  {network ?? "Switch"} <Layers className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={disconnect}
                  className="ml-1 text-slate-600 transition hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Right: stat grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Networks",          value: "7",       sub: "ETH · SOL · BNB · HYPE · POL · ARB · XPL" },
            { label: "DEXes Aggregated",  value: "500+",    sub: "1inch · Jupiter · QuickSwap…"       },
            { label: "Avg. Gas / Swap",   value: "~$0.02",  sub: "as low as $0.001 on Solana"        },
            { label: "Platform Fee",      value: "0.5 %",   sub: "Auto-deducted from route"          },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-violet-500/10 bg-violet-500/[0.05] px-4 py-3"
            >
              <p className="text-xl font-extrabold text-white">{s.value}</p>
              <p className="mt-0.5 text-[10px] font-bold text-violet-400">{s.label}</p>
              <p className="text-[10px] text-slate-600">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

export function Web3KpiBar() {
  const kpis = [
    { label: "24h Volume",    value: "$—",   sub: "Connect wallet to view",  color: "text-violet-400" },
    { label: "Swaps Today",   value: "—",    sub: "Platform-wide",           color: "text-indigo-400" },
    { label: "Fee Collected", value: "$—",   sub: "Your lifetime earnings",  color: "text-emerald-400" },
    { label: "Gas Saved",     value: "$—",   sub: "vs Ethereum mainnet",     color: "text-blue-400"   },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] px-5 py-4"
        >
          <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-300">{k.label}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Live market prices ────────────────────────────────────────────────────────

export function Web3MarketPrices() {
  const prices = usePrices();
  const tokens = [
    { sym: "ETH",  name: "Ethereum"  },
    { sym: "BTC",  name: "Bitcoin"   },
    { sym: "ARB",  name: "Arbitrum"  },
    { sym: "LINK", name: "Chainlink" },
    { sym: "UNI",  name: "Uniswap"   },
  ];
  const loading = Object.keys(prices).length === 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Market Prices</p>
        <span className="text-[10px] text-slate-600">Arbitrum · Live</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-4 w-4 animate-spin text-slate-700" />
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map(({ sym, name }) => {
            const t = prices[sym];
            if (!t) return null;
            const pos = t.change >= 0;
            return (
              <div key={sym} className="flex items-center gap-3">
                <TokenAvatar symbol={sym} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{sym}</p>
                  <p className="text-[10px] text-slate-500">{name}</p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm font-bold text-white">{fmtPrice(t.price)}</p>
                  <p className={`tabular-nums text-[10px] font-semibold ${pos ? "text-emerald-400" : "text-red-400"}`}>
                    {pos ? "+" : ""}{t.change.toFixed(2)}%
                  </p>
                </div>
                <div className="w-16 text-right">
                  <p className="text-[10px] text-slate-600">{fmtVol(t.volume)}</p>
                  <p className="text-[9px] text-slate-700">24h vol</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/dashboard/swap"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] py-2.5 text-xs font-bold text-violet-400 transition hover:bg-violet-500/10"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Swap Any Token
      </Link>
    </div>
  );
}

// ── Quick swap card ───────────────────────────────────────────────────────────

export function QuickSwapCard() {
  const prices = usePrices();
  const ethPrice = prices["ETH"]?.price ?? 0;
  const estimate = ethPrice > 0 ? (1000 / ethPrice).toFixed(5) : "—";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Quick Swap</p>
        <ArrowLeftRight className="h-3.5 w-3.5 text-slate-600" />
      </div>

      {/* From */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">You Pay</p>
        <div className="flex items-center gap-3">
          <TokenAvatar symbol="USDT" size={30} />
          <p className="flex-1 text-2xl font-extrabold text-white">1,000</p>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm font-bold text-white">
            USDT
          </div>
        </div>
      </div>

      {/* Flip */}
      <div className="my-2 flex justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a0f1a]">
          <ArrowLeftRight className="h-3.5 w-3.5 rotate-90 text-slate-600" />
        </div>
      </div>

      {/* To */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">You Receive (est.)</p>
        <div className="flex items-center gap-3">
          <TokenAvatar symbol="ETH" size={30} />
          <p className="flex-1 text-2xl font-extrabold text-violet-300">~{estimate}</p>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm font-bold text-white">
            ETH
          </div>
        </div>
        {ethPrice > 0 && (
          <p className="mt-1.5 text-[10px] text-slate-600">
            1 ETH = {fmtPrice(ethPrice)} · Fee 0.5% included
          </p>
        )}
      </div>

      <Link
        href="/dashboard/swap"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)" }}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Open Full Swap
      </Link>
    </div>
  );
}

// ── Wallet portfolio ──────────────────────────────────────────────────────────

export function WalletPortfolioCard() {
  const { address, shortAddress, isConnected, network, connect, disconnect, switchNetwork } = useWallet();

  const isEvmAddress = typeof address === "string" && address.startsWith("0x");
  const { data: nativeBal, isLoading: balLoading } = useBalance({
    address: isEvmAddress ? (address as `0x${string}`) : undefined,
  });

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">My Portfolio</p>
          <Wallet className="h-3.5 w-3.5 text-slate-600" />
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1) 0%,rgba(79,70,229,0.05) 100%)" }}
          >
            <Wallet className="h-7 w-7 text-violet-400" />
          </div>
          <p className="text-sm font-bold text-white">No Wallet Connected</p>
          <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-slate-500">
            Connect your MetaMask or any EVM wallet to view balances and swap history.
          </p>
          <button
            onClick={connect}
            className="mt-4 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/[0.08] px-5 py-2 text-xs font-bold text-violet-400 transition hover:bg-violet-500/15"
          >
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">My Portfolio</p>
        <button
          onClick={disconnect}
          className="flex items-center gap-1 text-[10px] text-slate-600 transition hover:text-red-400"
        >
          <LogOut className="h-3 w-3" /> Disconnect
        </button>
      </div>

      {/* Wallet address pill */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-sm font-bold text-white">{shortAddress}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={switchNetwork}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400 transition hover:border-violet-500/30 hover:text-violet-400"
          >
            {network ?? "Switch Network"}
            <Layers className="h-2.5 w-2.5" />
          </button>
          <a
            href={`https://etherscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 transition hover:text-violet-400"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Native balance */}
      <div className="mb-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Native Balance</p>
        {balLoading ? (
          <div className="mt-2 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-700" />
            <span className="text-xs text-slate-700">Loading…</span>
          </div>
        ) : nativeBal ? (
          <div className="mt-1 flex items-end justify-between">
            <p className="text-xl font-extrabold text-white">
              {parseFloat(formatUnits(nativeBal.value, nativeBal.decimals)).toFixed(4)}
              <span className="ml-1.5 text-sm font-semibold text-slate-500">{nativeBal.symbol}</span>
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-700">—</p>
        )}
      </div>

      {/* CTA */}
      <Link
        href="/dashboard/swap"
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)" }}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Swap Tokens
      </Link>
    </div>
  );
}

// ── Recent platform swaps ─────────────────────────────────────────────────────

const DEMO_SWAPS = [
  { from: "USDT", to: "ETH",  amountIn: "2,500",   amountOut: "0.0383", ago: "1m" },
  { from: "ETH",  to: "USDC", amountIn: "0.5",     amountOut: "3,261",  ago: "4m" },
  { from: "USDC", to: "ARB",  amountIn: "500",      amountOut: "456.2",  ago: "11m" },
  { from: "WBTC", to: "USDT", amountIn: "0.02",     amountOut: "1,304",  ago: "17m" },
  { from: "USDT", to: "LINK", amountIn: "1,000",    amountOut: "68.4",   ago: "23m" },
  { from: "ARB",  to: "ETH",  amountIn: "2,000",    amountOut: "0.0621", ago: "31m" },
];

export function RecentPlatformSwaps() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Platform Activity</p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400">LIVE</span>
        </div>
      </div>

      <div className="space-y-3">
        {DEMO_SWAPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <TokenAvatar symbol={s.from} size={22} />
              <ArrowLeftRight className="h-2.5 w-2.5 text-slate-700" />
              <TokenAvatar symbol={s.to} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {s.amountIn} {s.from}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                → {s.amountOut} {s.to}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
              <Clock className="h-3 w-3" />
              {s.ago}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] text-slate-700">
        Anonymized · Platform-wide · Demo data
      </p>
    </div>
  );
}

// ── DeFi roadmap ──────────────────────────────────────────────────────────────

export function DeFiRoadmapCard() {
  const items = [
    {
      icon: TrendingUp,
      label: "Yield Strategies",
      desc: "Auto-compound yield on USDT/USDC via Aave & Compound",
      q: "Q3 2025",
    },
    {
      icon: Layers,
      label: "Liquidity Pools",
      desc: "Provide liquidity to Uniswap V3 and earn trading fees",
      q: "Q3 2025",
    },
    {
      icon: ArrowUpRight,
      label: "Cross-chain Bridge",
      desc: "Move assets between Arbitrum, Base, and Ethereum L1",
      q: "Q4 2025",
    },
    {
      icon: Zap,
      label: "Limit Orders",
      desc: "Set price targets and execute automatically on-chain",
      q: "Q4 2025",
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Coming to Web3</p>
        <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">
          Roadmap
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map(({ icon: Icon, label, desc, q }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/[0.08]">
              <Icon className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{desc}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-slate-600">{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
