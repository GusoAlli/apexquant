"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight, ChevronDown, Info, LogOut,
  RefreshCw, Search, Settings2, Trophy, Wallet, X, Zap,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import {
  TokenAvatar, usePrices, fmtPrice,
  CHAINS, type ChainId,
  RecentPlatformSwaps, Web3MarketPrices,
} from "@/components/dashboard/Web3DashboardSections";
import type { AggregatorQuote, QuoteResponse } from "@/app/api/swap/quote/route";

// ── Per-chain token lists ─────────────────────────────────────────────────────

type Token = {
  symbol:      string;
  name:        string;
  address:     string;
  decimals:    number;
  binancePair?: string;
};

const TOKENS_BY_CHAIN: Record<ChainId, Token[]> = {
  ethereum: [
    { symbol: "ETH",  name: "Ethereum",        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, binancePair: "ETH"  },
    { symbol: "WBTC", name: "Wrapped Bitcoin",  address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",  decimals: 8,  binancePair: "BTC"  },
    { symbol: "USDT", name: "Tether USD",       address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",  decimals: 6  },
    { symbol: "USDC", name: "USD Coin",         address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  decimals: 6  },
    { symbol: "DAI",  name: "Dai Stablecoin",   address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",  decimals: 18 },
    { symbol: "LINK", name: "Chainlink",        address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",  decimals: 18, binancePair: "LINK" },
    { symbol: "UNI",  name: "Uniswap",          address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  decimals: 18, binancePair: "UNI"  },
    { symbol: "AAVE", name: "Aave",             address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",  decimals: 18, binancePair: "AAVE" },
  ],
  arbitrum: [
    { symbol: "ETH",  name: "Ethereum",        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, binancePair: "ETH"  },
    { symbol: "WBTC", name: "Wrapped Bitcoin",  address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0",  decimals: 8,  binancePair: "BTC"  },
    { symbol: "USDT", name: "Tether USD",       address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",  decimals: 6  },
    { symbol: "USDC", name: "USD Coin",         address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  decimals: 6  },
    { symbol: "ARB",  name: "Arbitrum",         address: "0x912CE59144191C1204E64559FE8253a0e49E6548",  decimals: 18, binancePair: "ARB"  },
    { symbol: "LINK", name: "Chainlink",        address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",  decimals: 18, binancePair: "LINK" },
    { symbol: "UNI",  name: "Uniswap",          address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  decimals: 18, binancePair: "UNI"  },
    { symbol: "GMX",  name: "GMX",              address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",  decimals: 18 },
    { symbol: "AAVE", name: "Aave",             address: "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196",  decimals: 18, binancePair: "AAVE" },
    { symbol: "DAI",  name: "Dai Stablecoin",   address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",  decimals: 18 },
  ],
  bsc: [
    { symbol: "BNB",  name: "BNB",              address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, binancePair: "BNB"  },
    { symbol: "WBNB", name: "Wrapped BNB",      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18, binancePair: "BNB"  },
    { symbol: "BTCB", name: "Bitcoin BEP20",    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18, binancePair: "BTC"  },
    { symbol: "USDT", name: "Tether USD",       address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    { symbol: "BUSD", name: "Binance USD",      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
    { symbol: "CAKE", name: "PancakeSwap",      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18, binancePair: "CAKE" },
    { symbol: "XVS",  name: "Venus",            address: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63", decimals: 18 },
  ],
  solana: [
    { symbol: "SOL",  name: "Solana",           address: "So11111111111111111111111111111111111111112",  decimals: 9, binancePair: "SOL"  },
    { symbol: "USDC", name: "USD Coin",         address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    { symbol: "RAY",  name: "Raydium",          address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals: 6, binancePair: "RAY" },
    { symbol: "JUP",  name: "Jupiter",          address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",  decimals: 6, binancePair: "JUP"  },
    { symbol: "BONK", name: "Bonk",             address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, binancePair: "BONK" },
    { symbol: "WIF",  name: "dogwifhat",        address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", decimals: 6 },
  ],
  polygon: [
    { symbol: "MATIC", name: "Polygon",         address: "0x0000000000000000000000000000000000001010", decimals: 18, binancePair: "MATIC" },
    { symbol: "WETH",  name: "Wrapped Ether",   address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18, binancePair: "ETH"  },
    { symbol: "USDT",  name: "Tether USD",      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    { symbol: "USDC",  name: "USD Coin",        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    { symbol: "QUICK", name: "QuickSwap",       address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
    { symbol: "SAND",  name: "The Sandbox",     address: "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683", decimals: 18 },
  ],
};

const STABLES = new Set(["USDT", "USDC", "DAI", "BUSD"]);

function isStable(sym: string) { return STABLES.has(sym); }

function tokenUsdPrice(sym: string, tokens: Token[], prices: Record<string, { price: number }>) {
  if (isStable(sym)) return 1;
  const pair = tokens.find(t => t.symbol === sym)?.binancePair ?? sym;
  return prices[pair]?.price ?? null;
}

// ── Chain selector ────────────────────────────────────────────────────────────

function ChainSelector({
  selected,
  onChange,
}: {
  selected: ChainId;
  onChange: (id: ChainId) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {CHAINS.map((c) => {
        const active = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition"
            style={
              active
                ? { borderColor: c.color + "60", background: c.color + "20", color: c.color }
                : { borderColor: "rgba(255,255,255,0.07)", color: "#64748b" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: active ? c.color : "#334155" }}
            />
            {c.name}
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={active ? { background: c.color + "30", color: c.color } : { background: "#1e293b", color: "#475569" }}
            >
              {c.aggregator}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Token selector modal ──────────────────────────────────────────────────────

function TokenModal({
  tokens,
  exclude,
  onSelect,
  onClose,
  prices,
}: {
  tokens:   Token[];
  exclude:  string;
  onSelect: (t: Token) => void;
  onClose:  () => void;
  prices:   Record<string, { price: number; change: number }>;
}) {
  const [q, setQ] = useState("");
  const filtered = tokens.filter(
    (t) =>
      t.symbol !== exclude &&
      (t.symbol.toLowerCase().includes(q.toLowerCase()) ||
       t.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d1520] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <p className="text-sm font-bold text-white">Select Token</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token name or symbol…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-600 outline-none transition focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-3 pb-4">
          {filtered.map((t) => {
            const usd = tokenUsdPrice(t.symbol, tokens, prices);
            return (
              <button
                key={t.address + t.symbol}
                onClick={() => { onSelect(t); onClose(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
              >
                <TokenAvatar symbol={t.symbol} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{t.symbol}</p>
                  <p className="text-[11px] text-slate-500">{t.name}</p>
                </div>
                {usd !== null && (
                  <p className="text-xs font-semibold text-slate-400">{fmtPrice(usd)}</p>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-600">No tokens found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slippage popover ──────────────────────────────────────────────────────────

function SlippagePanel({
  value,
  onChange,
  onClose,
}: {
  value:    number;
  onChange: (v: number) => void;
  onClose:  () => void;
}) {
  const [custom, setCustom] = useState(
    value === 0.1 || value === 0.5 || value === 1 ? "" : String(value)
  );

  return (
    <div className="absolute right-0 top-12 z-20 w-64 rounded-2xl border border-white/[0.08] bg-[#0d1520] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-white">Slippage Tolerance</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        {[0.1, 0.5, 1].map((v) => (
          <button
            key={v}
            onClick={() => { onChange(v); setCustom(""); }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              value === v && !custom
                ? "bg-violet-500 text-white"
                : "border border-white/[0.08] text-slate-400 hover:text-white"
            }`}
          >
            {v}%
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const n = parseFloat(e.target.value);
            if (!isNaN(n) && n > 0 && n <= 50) onChange(n);
          }}
          placeholder="Custom %"
          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-violet-500/40"
        />
        <span className="text-xs text-slate-500">%</span>
      </div>
      {value > 2 && (
        <p className="mt-2 text-[10px] text-yellow-400">⚠ High slippage — may result in unfavorable trade</p>
      )}
    </div>
  );
}

// ── Multi-aggregator quote hook ───────────────────────────────────────────────

function useAggregatorQuotes(params: {
  chainId:      number | undefined;
  isSolana:     boolean;
  fromToken:    Token;
  toToken:      Token;
  amount:       string;
  enabled:      boolean;
}) {
  const [quotes,  setQuotes]  = useState<AggregatorQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!params.enabled || !params.amount || parseFloat(params.amount) <= 0 || !params.chainId) {
      setQuotes([]);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          chainId:      String(params.chainId),
          fromToken:    params.fromToken.address,
          toToken:      params.toToken.address,
          amount:       params.amount,
          fromDecimals: String(params.fromToken.decimals),
          toDecimals:   String(params.toToken.decimals),
          ...(params.isSolana ? { chain: "solana" } : {}),
        });
        const res  = await fetch(`/api/swap/quote?${qs}`);
        const data: QuoteResponse = await res.json();
        setQuotes(data.quotes ?? []);
      } catch { setQuotes([]); }
      finally  { setLoading(false); }
    }, 600);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [params.chainId, params.fromToken.address, params.toToken.address, params.amount, params.enabled, params.isSolana]);

  return { quotes, loading };
}

// ── Route comparison widget ───────────────────────────────────────────────────

function RouteComparison({ quotes, loading }: { quotes: AggregatorQuote[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-400" />
        <span className="text-xs text-slate-500">Checking best price across aggregators…</span>
      </div>
    );
  }
  if (quotes.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Trophy className="h-3 w-3 text-[#e7b949]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#e7b949]">Route Comparison</span>
      </div>
      <div className="space-y-1.5">
        {quotes.map((q) => (
          <div
            key={q.aggregator}
            className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
              q.isBest
                ? "border border-emerald-500/20 bg-emerald-500/[0.06]"
                : "border border-transparent bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              {q.isBest && (
                <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-400">
                  Best
                </span>
              )}
              <span className={`text-xs font-semibold ${q.isBest ? "text-white" : "text-slate-500"}`}>
                {q.aggregator}
              </span>
              <span className="text-[10px] text-slate-700">{q.route}</span>
            </div>
            <div className="text-right">
              <p className={`text-xs font-bold ${q.isBest ? "text-emerald-400" : "text-slate-500"}`}>
                {parseFloat(q.toAmount).toFixed(6)}
              </p>
              <p className="text-[9px] text-slate-700">{q.gasCostUsd} gas</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Swap Card ────────────────────────────────────────────────────────────

function SwapCard() {
  const prices = usePrices();
  const { address, shortAddress, isConnected, network, connect, disconnect } = useWallet();

  const [chainId,   setChainId]   = useState<ChainId>("ethereum");
  const chain    = CHAINS.find(c => c.id === chainId)!;
  const tokens   = TOKENS_BY_CHAIN[chainId];

  const [fromToken, setFromToken] = useState<Token>(tokens[Math.min(2, tokens.length - 1)]);
  const [toToken,   setToToken]   = useState<Token>(tokens[0]);
  const [fromAmt,   setFromAmt]   = useState("");
  const [slippage,  setSlippage]  = useState(0.5);
  const [showFrom,  setShowFrom]  = useState(false);
  const [showTo,    setShowTo]    = useState(false);
  const [showSlip,  setShowSlip]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  // Multi-aggregator quotes
  const { quotes, loading: quotesLoading } = useAggregatorQuotes({
    chainId:   chain.evmChainId,
    isSolana:  chainId === "solana",
    fromToken,
    toToken,
    amount:    fromAmt,
    enabled:   parseFloat(fromAmt) > 0,
  });

  // Best quote overrides Binance estimation when available
  const bestQuote = quotes.find(q => q.isBest) ?? null;

  // Reset tokens when chain changes
  const handleChainChange = (id: ChainId) => {
    setChainId(id);
    const t = TOKENS_BY_CHAIN[id];
    setFromToken(t[Math.min(2, t.length - 1)]);
    setToToken(t[0]);
    setFromAmt("");
  };

  const estimate = useCallback(() => {
    const amt = parseFloat(fromAmt);
    if (!amt || amt <= 0) return null;
    const fromUsd = tokenUsdPrice(fromToken.symbol, tokens, prices);
    const toUsd   = tokenUsdPrice(toToken.symbol,   tokens, prices);
    if (!fromUsd || !toUsd) return null;
    const gross  = (amt * fromUsd) / toUsd;
    const net    = gross * (1 - slippage / 100) * 0.995;
    return { gross, net, rate: toUsd / fromUsd };
  }, [fromAmt, fromToken, toToken, prices, slippage, tokens]);

  const est = estimate();

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmt("");
  };

  const fromUsd = tokenUsdPrice(fromToken.symbol, tokens, prices);
  const fromAmtUsd = fromUsd && parseFloat(fromAmt) > 0
    ? (parseFloat(fromAmt) * fromUsd).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : null;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Chain selector */}
      <ChainSelector selected={chainId} onChange={handleChainChange} />

      {/* Swap header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Swap</h1>
          <p className="text-xs text-slate-500">
            Best price via {chain.aggregator} · {chain.name} · {chain.dexes.split(" · ")[0]}…
          </p>
        </div>
        <button
          onClick={() => setShowSlip(v => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            showSlip
              ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
              : "border-white/[0.08] text-slate-500 hover:text-slate-300"
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {slippage}%
        </button>
        {showSlip && (
          <SlippagePanel
            value={slippage}
            onChange={setSlippage}
            onClose={() => setShowSlip(false)}
          />
        )}
      </div>

      {/* Swap card body */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0f1a] p-1 shadow-2xl">
        {/* From */}
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">You Pay</p>
            <p className="text-[10px] text-slate-600">Balance: —</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={fromAmt}
              onChange={(e) => setFromAmt(e.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-3xl font-extrabold text-white outline-none placeholder-slate-700"
            />
            <button
              onClick={() => setShowFrom(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.08]"
            >
              <TokenAvatar symbol={fromToken.symbol} size={22} />
              <span className="text-sm font-bold text-white">{fromToken.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
          {fromAmtUsd && (
            <p className="mt-1.5 text-[11px] text-slate-600">{fromAmtUsd}</p>
          )}
        </div>

        {/* Flip */}
        <div className="relative flex justify-center py-1">
          <button
            onClick={flip}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0a0f1a] text-slate-400 transition hover:border-violet-500/30 hover:text-violet-400"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90" />
          </button>
        </div>

        {/* To */}
        <div className="rounded-xl border border-violet-500/10 bg-violet-500/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">You Receive</p>
            <div className="flex items-center gap-1.5">
              {quotesLoading && <RefreshCw className="h-3 w-3 animate-spin text-violet-400" />}
              <p className="text-[10px] text-slate-600">Balance: —</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className={`min-w-0 flex-1 text-3xl font-extrabold ${(bestQuote || est) ? "text-violet-300" : "text-slate-700"}`}>
              {bestQuote
                ? `~${parseFloat(bestQuote.toAmount).toFixed(6)}`
                : est ? `~${est.net.toFixed(6)}` : "0.00"}
            </p>
            <button
              onClick={() => setShowTo(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.08]"
            >
              <TokenAvatar symbol={toToken.symbol} size={22} />
              <span className="text-sm font-bold text-white">{toToken.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
          {est && (
            <p className="mt-1.5 text-[11px] text-slate-600">
              1 {toToken.symbol} ≈ {fmtPrice(1 / est.rate)}
            </p>
          )}
        </div>

        {/* Price details */}
        {est && parseFloat(fromAmt) > 0 && (
          <div className="mt-1 space-y-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-xs">
            {[
              { label: "Rate",          value: `1 ${fromToken.symbol} = ${est.rate.toFixed(6)} ${toToken.symbol}` },
              { label: "Platform Fee",  value: `0.5% (${(parseFloat(fromAmt) * (fromUsd ?? 1) * 0.005).toFixed(2)} USD)` },
              { label: "Min. Received", value: `${(est.net * (1 - slippage / 100)).toFixed(6)} ${toToken.symbol}` },
              { label: "Aggregator",    value: chain.aggregator },
              { label: "DEXes",         value: chain.dexes },
              { label: "Gas Estimate",  value: `${chain.gasEst} (${chain.shortName})` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-slate-600">{label}</span>
                <span className="text-right font-semibold text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Route comparison */}
        <div className="px-1">
          <RouteComparison quotes={quotes} loading={quotesLoading} />
        </div>

        {/* CTA */}
        <div className="p-1 pt-2 space-y-2">
          {isConnected ? (
            <>
              {/* Wallet info bar */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">{shortAddress}</span>
                  {network && <span className="text-[10px] text-slate-600">· {network}</span>}
                </div>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-600 transition hover:text-red-400"
                >
                  <LogOut className="h-3 w-3" /> Disconnect
                </button>
              </div>

              {/* Swap button */}
              <button
                disabled={!est || loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-extrabold text-white transition hover:brightness-110 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)", boxShadow: "0 6px 24px -8px rgba(124,58,237,0.6)" }}
              >
                {loading
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <ArrowLeftRight className="h-4 w-4" />
                }
                {est ? `Swap ${fromToken.symbol} → ${toToken.symbol}` : "Enter amount to swap"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={connect}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-extrabold text-white transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)", boxShadow: "0 6px 24px -8px rgba(124,58,237,0.6)" }}
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet to Swap
              </button>
              <p className="text-center text-[10px] text-slate-700">
                {chainId === "solana"
                  ? "Phantom · Solflare · Backpack · and more"
                  : "MetaMask · WalletConnect · Coinbase Wallet · and more"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-3.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400/60" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Non-custodial — ApexQuant never holds your funds.
          Tokens go directly from your wallet to the DEX smart contract.
          Platform fee of 0.5% is built into the swap route.
        </p>
      </div>

      {/* Token modals */}
      {showFrom && (
        <TokenModal
          tokens={tokens}
          exclude={toToken.symbol}
          onSelect={setFromToken}
          onClose={() => setShowFrom(false)}
          prices={prices}
        />
      )}
      {showTo && (
        <TokenModal
          tokens={tokens}
          exclude={fromToken.symbol}
          onSelect={setToToken}
          onClose={() => setShowTo(false)}
          prices={prices}
        />
      )}
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { n: 1, title: "Connect Wallet",    desc: "Link MetaMask, Phantom, WalletConnect, or any compatible wallet. No sign-up needed." },
    { n: 2, title: "Select a Network",  desc: "Choose Arbitrum, BSC, Solana, or Polygon. Each chain uses the best aggregator available." },
    { n: 3, title: "Get Best Price",    desc: "Our router queries 400+ DEXes and finds the optimal execution path across all liquidity sources." },
    { n: 4, title: "Confirm in Wallet", desc: "Approve the transaction in your wallet. Swap executes on-chain. You keep full custody throughout." },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">How It Works</p>
        <Zap className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="space-y-4">
        {steps.map(({ n, title, desc }) => (
          <div key={n} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-extrabold text-violet-400">
              {n}
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Network info cards ────────────────────────────────────────────────────────

function NetworkInfoGrid() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0f1a] p-5">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-violet-400">Supported Networks</p>
      <div className="grid grid-cols-2 gap-3">
        {CHAINS.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border p-3"
            style={{ borderColor: c.color + "25", background: c.color + "0a" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              <p className="text-xs font-bold text-white">{c.shortName}</p>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">{c.name}</p>
            <p className="mt-1 text-[10px]" style={{ color: c.color + "cc" }}>
              Gas {c.gasEst} · {c.aggregator}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SwapPage() {
  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-violet-500/20 px-6 py-5"
        style={{ background: "linear-gradient(135deg,#0c0a1e 0%,#0a0f1a 60%,#080c18 100%)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Web3 / DeFi</p>
            <h1 className="mt-0.5 text-xl font-extrabold text-white">ApexQuant Swap</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Best execution across 500+ DEXes · 7 networks · Non-custodial
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {CHAINS.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: c.color }} />
                <span className="font-semibold" style={{ color: c.color }}>{c.shortName} Live</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Left: Swap card */}
        <div>
          <SwapCard />
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          <Web3MarketPrices />
          <NetworkInfoGrid />
          <HowItWorks />
          <RecentPlatformSwaps />
        </div>
      </div>
    </div>
  );
}
