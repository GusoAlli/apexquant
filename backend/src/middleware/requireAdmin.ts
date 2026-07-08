import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || user.role.name.toLowerCase() !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}
