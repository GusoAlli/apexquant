import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function listApiKeys(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyPrefix: true, lastUsed: true, createdAt: true },
  });
  return res.json(keys);
}

export async function createApiKey(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

  const count = await prisma.apiKey.count({ where: { userId, revokedAt: null } });
  if (count >= 10) return res.status(400).json({ message: 'Maximum 10 active API keys allowed' });

  const raw = 'apx_' + crypto.randomBytes(28).toString('hex');
  const hash = sha256(raw);
  const prefix = raw.slice(0, 12);

  await prisma.apiKey.create({ data: { userId, name: name.trim(), keyHash: hash, keyPrefix: prefix } });
  return res.status(201).json({ key: raw, prefix });
}

export async function revokeApiKey(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const key = await prisma.apiKey.findFirst({ where: { id, userId, revokedAt: null } });
  if (!key) return res.status(404).json({ message: 'Key not found' });
  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return res.json({ ok: true });
}
