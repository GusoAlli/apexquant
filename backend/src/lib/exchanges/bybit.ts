import crypto from 'crypto';
import type { AssetBalance } from './binance';

export async function fetchBybitBalances(
  apiKey: string,
  apiSecret: string
): Promise<AssetBalance[]> {
  const ts = Date.now().toString();
  const recvWindow = '5000';
  const queryStr = 'accountType=UNIFIED';
  const prehash = `${ts}${apiKey}${recvWindow}${queryStr}`;
  const sign = crypto.createHmac('sha256', apiSecret).update(prehash).digest('hex');

  const res = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${queryStr}`, {
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': sign,
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': recvWindow,
    },
  });
  if (!res.ok) throw new Error(`Bybit error ${res.status}`);

  const data = await res.json() as {
    retCode: number;
    retMsg: string;
    result: {
      list: Array<{
        coin: Array<{ coin: string; walletBalance: string; locked: string; usdValue: string }>;
      }>;
    };
  };
  if (data.retCode !== 0) throw new Error(data.retMsg || 'Bybit API error');

  const coins = data.result.list[0]?.coin ?? [];
  return coins
    .filter((c) => parseFloat(c.walletBalance) > 0)
    .map((c) => ({
      asset: c.coin,
      free: parseFloat(c.walletBalance) - parseFloat(c.locked || '0'),
      locked: parseFloat(c.locked || '0'),
      usdValue: parseFloat(c.usdValue) || null,
    }));
}
