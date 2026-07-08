import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { encrypt, decrypt } from '../lib/cryptoUtil';
import { fetchBinanceBalances } from '../lib/exchanges/binance';
import { fetchOkxBalances } from '../lib/exchanges/okx';
import { fetchBybitBalances } from '../lib/exchanges/bybit';
import { fetchHyperliquidBalances } from '../lib/exchanges/hyperliquid';

type Creds = Record<string, string>;

const SUPPORTED = ['binance', 'okx', 'bybit', 'hyperliquid'];

// ── List accounts ─────────────────────────────────────────────────────────────

export async function listBrokers(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const accounts = await prisma.brokerAccount.findMany({
    where: { userId },
    include: {
      balances: { orderBy: { snapshotAt: 'desc' }, take: 50 },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Strip credentials from response
  return res.json(accounts.map(({ credentials: _c, ...a }) => a));
}

// ── Add account ───────────────────────────────────────────────────────────────

export async function addBroker(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { type, label, credentials } = req.body as { type: string; label: string; credentials: Creds };

  if (!SUPPORTED.includes(type)) {
    return res.status(400).json({ message: `Unsupported broker type: ${type}` });
  }
  if (!label?.trim()) return res.status(400).json({ message: 'label is required' });
  if (!credentials || typeof credentials !== 'object') {
    return res.status(400).json({ message: 'credentials object is required' });
  }

  // Validate required fields per type
  const required: Record<string, string[]> = {
    binance:      ['apiKey', 'apiSecret'],
    okx:          ['apiKey', 'apiSecret', 'passphrase'],
    bybit:        ['apiKey', 'apiSecret'],
    hyperliquid:  ['walletAddress'],
  };
  const missing = (required[type] || []).filter((k) => !credentials[k]);
  if (missing.length) {
    return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  }

  const encCreds = encrypt(JSON.stringify(credentials));

  const account = await prisma.brokerAccount.create({
    data: { userId, type, label: label.trim(), credentials: encCreds },
    select: { id: true, type: true, label: true, status: true, createdAt: true },
  });

  // Trigger first sync — run async, errors are stored in errorMsg field
  syncAccount(account.id).catch(() => null);

  return res.status(201).json(account);
}

// ── Remove account ────────────────────────────────────────────────────────────

export async function removeBroker(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const account = await prisma.brokerAccount.findFirst({ where: { id, userId } });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  await prisma.brokerAccount.delete({ where: { id } });
  return res.json({ message: 'Account removed' });
}

// ── Sync one account ──────────────────────────────────────────────────────────

export async function syncBroker(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;

  const account = await prisma.brokerAccount.findFirst({ where: { id, userId } });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  try {
    await syncAccount(id);
    const updated = await prisma.brokerAccount.findUnique({
      where: { id },
      include: { balances: { orderBy: { snapshotAt: 'desc' }, take: 50 } },
    });
    const { credentials: _c, ...safe } = updated!;
    return res.json(safe);
  } catch (err: any) {
    return res.status(502).json({ message: err.message ?? 'Sync failed' });
  }
}

// ── Internal sync function ────────────────────────────────────────────────────

export async function syncAccount(accountId: string): Promise<void> {
  const account = await prisma.brokerAccount.findUnique({ where: { id: accountId } });
  if (!account || !account.credentials) return;

  let balances: { asset: string; free: number; locked: number; usdValue: number | null }[] = [];

  try {
    const creds: Creds = JSON.parse(decrypt(account.credentials));

    switch (account.type) {
      case 'binance':
        balances = await fetchBinanceBalances(creds.apiKey, creds.apiSecret);
        break;
      case 'okx':
        balances = await fetchOkxBalances(creds.apiKey, creds.apiSecret, creds.passphrase);
        break;
      case 'bybit':
        balances = await fetchBybitBalances(creds.apiKey, creds.apiSecret);
        break;
      case 'hyperliquid':
        balances = await fetchHyperliquidBalances(creds.walletAddress);
        break;
      default:
        throw new Error(`No sync adapter for type: ${account.type}`);
    }
  } catch (err: any) {
    // Store error so user can see what went wrong
    await prisma.brokerAccount.update({
      where: { id: accountId },
      data: { status: 'error', errorMsg: err.message ?? 'Connection failed' },
    });
    throw err;
  }

  // Replace balances atomically
  await prisma.$transaction([
    prisma.brokerBalance.deleteMany({ where: { accountId } }),
    ...balances.map((b) =>
      prisma.brokerBalance.create({
        data: { accountId, asset: b.asset, free: b.free, locked: b.locked, usdValue: b.usdValue },
      })
    ),
    prisma.brokerAccount.update({
      where: { id: accountId },
      data: { status: 'active', lastSync: new Date(), errorMsg: null },
    }),
  ]);
}
