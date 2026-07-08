import crypto from 'crypto';

export const PADDLE_BASE =
  process.env.PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.PADDLE_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export async function paddlePost<T = Record<string, unknown>>(
  path: string,
  body: object,
): Promise<T> {
  const res = await fetch(`${PADDLE_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: T; error?: { detail?: string } };
  if (!res.ok) throw new Error(json.error?.detail ?? `Paddle error ${res.status}`);
  return json.data!;
}

export function verifyPaddleSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  const parts = signatureHeader.split(';');
  const ts = parts.find((p) => p.startsWith('ts='))?.slice(3);
  const h1 = parts.find((p) => p.startsWith('h1='))?.slice(3);
  if (!ts || !h1) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}:${rawBody.toString('utf8')}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(h1, 'hex'));
}
