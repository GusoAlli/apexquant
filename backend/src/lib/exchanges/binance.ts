import crypto from 'crypto';

export type AssetBalance = {
  asset: string;
  free: number;
  locked: number;
  usdValue: number | null;
};

const STABLE = new Set(['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI', 'USDP', 'USD']);

async function getPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
    if (!res.ok) return null;
    const data = await res.json() as { price: string };
    return parseFloat(data.price);
  } catch { return null; }
}

export async function fetchBinanceBalances(apiKey: string, apiSecret: string): Promise<AssetBalance[]> {
  const ts = Date.now();
  const query = `timestamp=${ts}`;
  const sig = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');

  const res = await fetch(`https://api.binance.com/api/v3/account?${query}&signature=${sig}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { msg?: string };
    throw new Error(err.msg ?? `Binance error ${res.status}`);
  }

  const data = await res.json() as { balances: Array<{ asset: string; free: string; locked: string }> };
  const nonZero = data.balances.filter((b) => parseFloat(b.free) + parseFloat(b.locked) > 0);

  // Build USD value map
  const priceMap = new Map<string, number>();
  const toPrice = nonZero.filter((b) => !STABLE.has(b.asset));
  await Promise.all(
    toPrice.map(async (b) => {
      const p = await getPrice(b.asset);
      if (p !== null) priceMap.set(b.asset, p);
    })
  );

  return nonZero.map((b) => {
    const free = parseFloat(b.free);
    const locked = parseFloat(b.locked);
    const total = free + locked;
    let usdValue: number | null = null;
    if (STABLE.has(b.asset)) usdValue = total;
    else if (priceMap.has(b.asset)) usdValue = total * priceMap.get(b.asset)!;
    return { asset: b.asset, free, locked, usdValue };
  });
}
