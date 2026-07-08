import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function parseJson(raw: string | null | undefined) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function listStrategies(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const strategies = await prisma.strategy.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json(strategies.map((s: any) => ({
    ...s,
    config: parseJson(s.config),
    performance: parseJson(s.performance),
  })));
}

export async function createStrategy(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { name, description, symbol, timeframe, type, mode } = req.body as {
    name?: string; description?: string; symbol?: string;
    timeframe?: string; type?: string; mode?: string;
  };
  if (!name?.trim() || !symbol?.trim() || !timeframe?.trim()) {
    return res.status(400).json({ error: 'name, symbol, and timeframe are required' });
  }
  const strategy = await prisma.strategy.create({
    data: {
      userId,
      name: name.trim(),
      description: description?.trim() ?? null,
      symbol: symbol.trim().toUpperCase(),
      timeframe,
      type: type ?? 'manual',
      mode: mode ?? 'exchange',
      status: 'draft',
    },
  });
  return res.status(201).json({ ...strategy, config: null, performance: null });
}

export async function updateStrategy(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const existing = await prisma.strategy.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Strategy not found' });

  const { name, description, symbol, timeframe, type, mode, status, config, performance } = req.body as Record<string, unknown>;
  const updated = await prisma.strategy.update({
    where: { id },
    data: {
      ...(typeof name === 'string' && { name: name.trim() }),
      ...(description !== undefined && { description: typeof description === 'string' ? description.trim() : null }),
      ...(typeof symbol === 'string' && { symbol: symbol.trim().toUpperCase() }),
      ...(typeof timeframe === 'string' && { timeframe }),
      ...(typeof type === 'string' && { type }),
      ...(typeof mode === 'string' && { mode }),
      ...(typeof status === 'string' && { status }),
      ...(config !== undefined && { config: JSON.stringify(config) }),
      ...(performance !== undefined && { performance: JSON.stringify(performance) }),
    },
  });
  return res.json({ ...updated, config: parseJson(updated.config), performance: parseJson(updated.performance) });
}

export async function deleteStrategy(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  const existing = await prisma.strategy.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: 'Strategy not found' });
  await prisma.strategy.delete({ where: { id } });
  return res.status(204).send();
}
