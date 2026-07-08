import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AggregatorQuote = {
  aggregator: string;
  toAmount:   string;   // human-readable, formatted
  toAmountRaw: string;  // raw bigint string for comparison
  gasCostUsd: string;
  route:      string;   // e.g. "USDT → Curve → ETH"
  isBest:     boolean;
};

export type QuoteResponse = {
  quotes: AggregatorQuote[];
  best:   AggregatorQuote | null;
  error?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const OPENOCEAN_CHAIN: Record<number, string> = {
  1:     "eth",
  56:    "bsc",
  137:   "polygon",
  42161: "arbitrum",
};

const KYBERSWAP_CHAIN: Record<number, string> = {
  1:     "ethereum",
  56:    "bsc",
  137:   "polygon",
  42161: "arbitrum",
};

async function fetchTimeout(url: string, init: RequestInit = {}, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

function toDecimals(raw: string, decimals: number): string {
  if (!raw || raw === "0") return "0";
  const big    = BigInt(raw);
  const factor = BigInt(10 ** Math.min(decimals, 18));
  const whole  = big / factor;
  const rem    = big % factor;
  const frac   = rem.toString().padStart(decimals, "0").slice(0, 6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

// ── Aggregator fetchers ───────────────────────────────────────────────────────

async function get1inch(
  chainId: number, src: string, dst: string, amountRaw: string
): Promise<AggregatorQuote | null> {
  try {
    const apiKey = process.env.ONEINCH_API_KEY ?? "";
    const headers: HeadersInit = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${src}&dst=${dst}&amount=${amountRaw}&includeGas=true`;
    const res = await fetchTimeout(url, { headers });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      aggregator:   "1inch",
      toAmountRaw:  d.dstAmount ?? "0",
      toAmount:     "",
      gasCostUsd:   d.gas ? `~$${(Number(d.gas) * 0.000000030 * 2000).toFixed(2)}` : "—",
      route:        "1inch Fusion",
      isBest:       false,
    };
  } catch { return null; }
}

async function getParaswap(
  chainId: number, src: string, dst: string, amountRaw: string,
  srcDecimals: number, dstDecimals: number
): Promise<AggregatorQuote | null> {
  try {
    const url = `https://apiv5.paraswap.io/prices?srcToken=${src}&destToken=${dst}&amount=${amountRaw}&network=${chainId}&srcDecimals=${srcDecimals}&destDecimals=${dstDecimals}`;
    const res = await fetchTimeout(url);
    if (!res.ok) return null;
    const d = await res.json();
    const raw = d.priceRoute?.destAmount ?? "0";
    return {
      aggregator:   "Paraswap",
      toAmountRaw:  raw,
      toAmount:     "",
      gasCostUsd:   d.priceRoute?.gasCostUSD ? `~$${parseFloat(d.priceRoute.gasCostUSD).toFixed(2)}` : "—",
      route:        d.priceRoute?.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.[0]?.exchange ?? "Paraswap",
      isBest:       false,
    };
  } catch { return null; }
}

async function getOpenOcean(
  chainId: number, src: string, dst: string, amount: string, dstDecimals: number
): Promise<AggregatorQuote | null> {
  try {
    const chain = OPENOCEAN_CHAIN[chainId];
    if (!chain) return null;
    const url = `https://open-api.openocean.finance/v3/${chain}/quote?inTokenAddress=${src}&outTokenAddress=${dst}&amount=${amount}&gasPrice=5`;
    const res = await fetchTimeout(url);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.code !== 200) return null;
    const raw = d.data?.outAmount ?? "0";
    return {
      aggregator:   "OpenOcean",
      toAmountRaw:  raw,
      toAmount:     "",
      gasCostUsd:   d.data?.estimatedGas ? `~$${(Number(d.data.estimatedGas) * 0.000000030 * 2000).toFixed(2)}` : "—",
      route:        d.data?.path?.map((p: { name: string }) => p.name).join(" → ") ?? "OpenOcean",
      isBest:       false,
    };
  } catch { return null; }
}

async function getKyberSwap(
  chainId: number, src: string, dst: string, amountRaw: string
): Promise<AggregatorQuote | null> {
  try {
    const chain = KYBERSWAP_CHAIN[chainId];
    if (!chain) return null;
    const url = `https://aggregator-api.kyberswap.com/${chain}/route/encode?tokenIn=${src}&tokenOut=${dst}&amountIn=${amountRaw}&to=0x0000000000000000000000000000000000000000`;
    const res = await fetchTimeout(url);
    if (!res.ok) return null;
    const d = await res.json();
    const raw = d.outputAmount ?? d.routeSummary?.amountOut ?? "0";
    return {
      aggregator:   "KyberSwap",
      toAmountRaw:  raw,
      toAmount:     "",
      gasCostUsd:   "—",
      route:        "KyberSwap Elastic",
      isBest:       false,
    };
  } catch { return null; }
}

async function getJupiter(
  src: string, dst: string, amountRaw: string
): Promise<AggregatorQuote | null> {
  try {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${src}&outputMint=${dst}&amount=${amountRaw}&slippageBps=50`;
    const res = await fetchTimeout(url);
    if (!res.ok) return null;
    const d = await res.json();
    const raw = d.outAmount ?? "0";
    return {
      aggregator:   "Jupiter",
      toAmountRaw:  raw,
      toAmount:     "",
      gasCostUsd:   "~$0.001",
      route:        d.routePlan?.[0]?.swapInfo?.label ?? "Jupiter",
      isBest:       false,
    };
  } catch { return null; }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse<QuoteResponse>> {
  const p           = req.nextUrl.searchParams;
  const chainId     = Number(p.get("chainId") ?? "1");
  const fromToken   = p.get("fromToken") ?? "";
  const toToken     = p.get("toToken") ?? "";
  const amount      = p.get("amount") ?? "0";       // human-readable
  const fromDec     = Number(p.get("fromDecimals") ?? "18");
  const toDec       = Number(p.get("toDecimals")   ?? "18");
  const isSolana    = p.get("chain") === "solana";

  if (!fromToken || !toToken || !amount || amount === "0") {
    return NextResponse.json({ quotes: [], best: null });
  }

  // Convert human-readable → raw (handle fractional input)
  const amountRaw = (BigInt(Math.round(parseFloat(amount) * 10 ** Math.min(fromDec, 9))) *
    BigInt(10 ** Math.max(0, fromDec - 9))).toString();

  let results: (AggregatorQuote | null)[];

  if (isSolana) {
    results = await Promise.all([getJupiter(fromToken, toToken, amountRaw)]);
  } else {
    results = await Promise.all([
      get1inch(chainId, fromToken, toToken, amountRaw),
      getParaswap(chainId, fromToken, toToken, amountRaw, fromDec, toDec),
      getOpenOcean(chainId, fromToken, toToken, amount, toDec),
      getKyberSwap(chainId, fromToken, toToken, amountRaw),
    ]);
  }

  // Filter nulls, fill in human-readable amounts
  const quotes: AggregatorQuote[] = results
    .filter((q): q is AggregatorQuote => q !== null && BigInt(q.toAmountRaw) > BigInt(0))
    .map(q => ({ ...q, toAmount: toDecimals(q.toAmountRaw, toDec) }));

  if (quotes.length === 0) {
    return NextResponse.json({ quotes: [], best: null, error: "No quotes available" });
  }

  // Find best by highest toAmountRaw
  quotes.sort((a, b) => (BigInt(b.toAmountRaw) > BigInt(a.toAmountRaw) ? 1 : -1));
  quotes[0].isBest = true;

  return NextResponse.json({ quotes, best: quotes[0] });
}
