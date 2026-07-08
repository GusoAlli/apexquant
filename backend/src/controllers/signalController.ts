import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { createNotificationForAllSubs } from './notificationController';
import { emitToAll } from '../lib/eventBus';

export async function listSignals(req: Request, res: Response) {
  const { status } = req.query as { status?: string };
  const where: any = {};
  if (status && status !== 'ALL') where.status = status;
  const signals = await prisma.signal.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  return res.json(signals);
}

export async function createSignal(req: Request, res: Response) {
  const { pair, direction, entry, tp, sl, strength, timeframe, model, expiresAt } = req.body as {
    pair: string; direction: string; entry: number; tp: number; sl: number;
    strength: number; timeframe: string; model: string; expiresAt?: string;
  };
  if (!pair || !direction || !entry || !tp || !sl || !strength || !timeframe || !model) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  const signal = await prisma.signal.create({
    data: { pair, direction, entry, tp, sl, strength, timeframe, model, expiresAt: expiresAt ? new Date(expiresAt) : null },
  });

  // Notify all subscribed users
  const title = `AI Signal: ${pair} ${direction}`;
  const body  = `${model} generated a ${direction} signal at ${entry} | TP: ${tp} | SL: ${sl} | Strength: ${strength}%`;
  await createNotificationForAllSubs('signal', title, body);
  emitToAll({ type: 'signal', data: signal });

  return res.status(201).json(signal);
}

export async function updateSignalStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, pips } = req.body as { status: string; pips?: number };
  const signal = await prisma.signal.update({
    where: { id },
    data: { status, pips: pips ?? null },
  });

  if (status === 'TP_HIT' || status === 'SL_HIT') {
    const title = `Signal ${status === 'TP_HIT' ? 'TP Hit ✓' : 'SL Hit ✗'}: ${signal.pair}`;
    const body  = `${signal.pair} ${signal.direction} ${status === 'TP_HIT' ? 'reached Take Profit' : 'hit Stop Loss'}${pips ? ` (${pips > 0 ? '+' : ''}${pips} pips)` : ''}`;
    await createNotificationForAllSubs(status === 'TP_HIT' ? 'trade' : 'risk', title, body);
  }

  return res.json(signal);
}

export async function deleteSignal(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.signal.delete({ where: { id } });
  return res.json({ ok: true });
}
