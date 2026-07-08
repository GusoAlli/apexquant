import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { eventBus } from '../lib/eventBus';

export async function createNotification(userId: string, type: string, title: string, body: string) {
  const notif = await prisma.notification.create({ data: { userId, type, title, body } });
  eventBus.emit(`notif:${userId}`, { type: 'notification', data: notif });
  return notif;
}

export async function createNotificationForAllSubs(type: string, title: string, body: string) {
  const subs = await prisma.subscription.findMany({
    where: { status: 'active' },
    select: { userId: true },
  });
  for (const { userId } of subs) {
    await createNotification(userId, type, title, body);
  }
}

export async function listNotifications(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(notifications);
}

export async function getUnreadCount(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const count = await prisma.notification.count({ where: { userId, readAt: null } });
  return res.json({ count });
}

export async function markRead(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  return res.json({ ok: true });
}

export async function markAllRead(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return res.json({ ok: true });
}

// SSE stream — token passed as query param (EventSource can't set headers)
export function sseStream(req: Request, res: Response) {
  const token = req.query.token as string;
  if (!token) { res.status(401).end(); return; }

  let userId: string;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    userId = payload.userId;
  } catch {
    res.status(401).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event: object) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Initial ping
  send({ type: 'connected' });

  // Keepalive every 25s
  const keepalive = setInterval(() => send({ type: 'ping' }), 25_000);

  const handler = (event: object) => send(event);
  eventBus.on(`notif:${userId}`, handler);
  eventBus.on('notif:all', handler);

  req.on('close', () => {
    clearInterval(keepalive);
    eventBus.off(`notif:${userId}`, handler);
    eventBus.off('notif:all', handler);
  });
}
