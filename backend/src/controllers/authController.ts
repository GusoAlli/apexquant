import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { signAccessToken, signRefreshToken, verifyRefreshToken, randomId } from '../lib/jwt';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'email already registered' });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  // NOTE: ensure roles are seeded; using roleId = 1 as default (adjust if needed)
  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null, roleId: 1 }
  });

  const userSafe = { id: user.id, email: user.email, name: user.name };
  return res.status(201).json(userSafe);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'invalid credentials' });

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return res.status(401).json({ message: 'invalid credentials' });

  const accessToken = signAccessToken({ sub: user.id });

  // create session and refresh token
  const sessionId = randomId();
  const refreshToken = signRefreshToken(sessionId);
  const refreshHash = await argon2.hash(refreshToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await prisma.session.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: refreshHash, expiresAt } });

  return res.json({ accessToken, refreshToken });
}

export async function googleLogin(req: Request, res: Response) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'idToken required' });

  const payload = await verifyGoogleIdToken(idToken).catch(() => null);
  if (!payload || !payload.email || !payload.sub || payload.email_verified !== true) {
    return res.status(401).json({ message: 'invalid Google token' });
  }

  const email = payload.email;
  const provider = 'google';
  const providerId = payload.sub;
  const name = payload.name || null;

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    if (user.provider && user.provider !== provider) {
      return res.status(409).json({ message: 'email already associated with another provider' });
    }

    if (!user.provider || !user.providerId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { provider, providerId, name: user.name || name },
      });
    }
  } else {
    user = await prisma.user.create({
      data: { email, name, provider, providerId, roleId: 1 },
    });
  }

  const accessToken = signAccessToken({ sub: user.id });
  const sessionId = randomId();
  const refreshToken = signRefreshToken(sessionId);
  const refreshHash = await argon2.hash(refreshToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.session.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: refreshHash, expiresAt } });

  return res.json({ accessToken, refreshToken });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.sid) return res.status(401).json({ message: 'invalid refresh token' });

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session) return res.status(401).json({ message: 'session not found' });

  // verify provided refresh token matches stored hash
  const ok = await argon2.verify(session.refreshTokenHash, refreshToken).catch(() => false);
  if (!ok) return res.status(401).json({ message: 'refresh token mismatch' });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(401).json({ message: 'user not found' });

  const accessToken = signAccessToken({ sub: user.id });
  const newSessionId = randomId();
  const newRefreshToken = signRefreshToken(newSessionId);
  const newHash = await argon2.hash(newRefreshToken);

  // replace session atomically
  await prisma.session.delete({ where: { id: session.id } });
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.session.create({ data: { id: newSessionId, userId: user.id, refreshTokenHash: newHash, expiresAt } });

  return res.json({ accessToken, refreshToken: newRefreshToken });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.sid) return res.status(200).json({ message: 'ok' });

  await prisma.session.deleteMany({ where: { id: payload.sid } }).catch(() => null);
  return res.status(200).json({ message: 'logged out' });
}

export async function me(req: Request, res: Response) {
  // user id set by middleware if present
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } });
  if (!user) return res.status(404).json({ message: 'not found' });
  return res.json(user);
}
