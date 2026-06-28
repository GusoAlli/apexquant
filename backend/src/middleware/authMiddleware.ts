import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS || 'change_me_access';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string };
    (req as any).userId = payload.sub;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true } });
    if (user?.role?.name) {
      (req as any).role = user.role.name;
    }
  } catch (err) {
    // ignore invalid token
  }
  return next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).userId) return res.status(401).json({ message: 'unauthenticated' });
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).role !== 'admin') return res.status(403).json({ message: 'forbidden' });
  return next();
}
