import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const now = new Date();
    const [totalUsers, onlineSessions] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.session.findMany({
        where: { expiresAt: { gt: now } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    res.json({
      totalUsers,
      onlineUsers: onlineSessions.length,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
