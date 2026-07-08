import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const [binanceRes, yahooRes] = await Promise.allSettled([
    fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%5D',
      { cache: "no-store" }
    ),
    fetch(
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=GC%3DF%2C%5EIXIC",
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
          Accept: "application/json",
        },
      }
    ),
  ]);

  type BinanceTicker = { symbol: string; lastPrice: string; priceChangePercent: string };
  type YahooQuote = { symbol: string; regularMarketPrice: number; regularMarketChangePercent: number };

  let btc: BinanceTicker | null = null;
  let eth: BinanceTicker | null = null;
  let gold: YahooQuote | null = null;
  let nasdaq: YahooQuote | null = null;

  if (binanceRes.status === "fulfilled" && binanceRes.value.ok) {
    const data: BinanceTicker[] = await binanceRes.value.json();
    if (Array.isArray(data)) {
      btc = data.find((t) => t.symbol === "BTCUSDT") ?? null;
      eth = data.find((t) => t.symbol === "ETHUSDT") ?? null;
    }
  }

  if (yahooRes.status === "fulfilled" && yahooRes.value.ok) {
    const data = await yahooRes.value.json();
    const quotes: YahooQuote[] = data?.quoteResponse?.result ?? [];
    gold = quotes.find((q) => q.symbol === "GC=F") ?? null;
    nasdaq = quotes.find((q) => q.symbol === "^IXIC") ?? null;
  }

  return NextResponse.json({
    prices: [
      {
        symbol: "BTC/USDT",
        price: btc ? parseFloat(btc.lastPrice) : null,
        change: btc ? parseFloat(btc.priceChangePercent) : null,
      },
      {
        symbol: "ETH/USDT",
        price: eth ? parseFloat(eth.lastPrice) : null,
        change: eth ? parseFloat(eth.priceChangePercent) : null,
      },
      {
        symbol: "XAU/USD",
        price: gold?.regularMarketPrice ?? null,
        change: gold?.regularMarketChangePercent ?? null,
      },
      {
        symbol: "NASDAQ",
        price: nasdaq?.regularMarketPrice ?? null,
        change: nasdaq?.regularMarketChangePercent ?? null,
      },
    ],
    updatedAt: Date.now(),
  });
}
