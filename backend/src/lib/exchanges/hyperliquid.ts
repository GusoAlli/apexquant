import type { AssetBalance } from './binance';

export async function fetchHyperliquidBalances(walletAddress: string): Promise<AssetBalance[]> {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'clearinghouseState', user: walletAddress }),
  });
  if (!res.ok) throw new Error(`HyperLiquid error ${res.status}`);

  const data = await res.json() as {
    marginSummary: {
      accountValue: string;
      totalRawUsd: string;
      totalMarginUsed: string;
    };
    crossMarginSummary?: { accountValue: string };
  };

  const accountValue = parseFloat(data.marginSummary?.accountValue ?? '0');

  if (accountValue <= 0) return [];

  return [
    {
      asset: 'USD',
      free: accountValue,
      locked: parseFloat(data.marginSummary?.totalMarginUsed ?? '0'),
      usdValue: accountValue,
    },
  ];
}
