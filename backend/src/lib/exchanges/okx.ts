import crypto from 'crypto';
import type { AssetBalance } from './binance';

export async function fetchOkxBalances(
  apiKey: string,
  apiSecret: string,
  passphrase: string
): Promise<AssetBalance[]> {
  const ts = new Date().toISOString();
  const method = 'GET';
  const path = '/api/v5/account/balance';
  const prehash = `${ts}${method}${path}`;
  const sign = crypto.createHmac('sha256', apiSecret).update(prehash).digest('base64');

  const res = await fetch(`https://www.okx.com${path}`, {
    headers: {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': ts,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'OK-ACCESS-PROJECT': '',
    },
  });
  if (!res.ok) throw new Error(`OKX error ${res.status}`);

  const data = await res.json() as {
    code: string;
    msg: string;
    data: Array<{
      details: Array<{ ccy: string; availBal: string; frozenBal: string; eqUsd: string }>;
    }>;
  };
  if (data.code !== '0') throw new Error(data.msg || 'OKX API error');

  const details = data.data[0]?.details ?? [];
  return details
    .filter((d) => parseFloat(d.availBal) + parseFloat(d.frozenBal) > 0)
    .map((d) => ({
      asset: d.ccy,
      free: parseFloat(d.availBal),
      locked: parseFloat(d.frozenBal),
      usdValue: parseFloat(d.eqUsd) || null,
    }));
}
