import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import { signAccessToken, signRefreshToken, verifyRefreshToken, randomId } from '../lib/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../lib/email';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
}

async function createSession(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ sub: userId });
  const sessionId = randomId();
  const refreshToken = signRefreshToken(sessionId);
  const refreshHash = await argon2.hash(refreshToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  await prisma.session.create({ data: { id: sessionId, userId, refreshTokenHash: refreshHash, expiresAt } });
  return { accessToken, refreshToken };
}

async function verifyGoogleIdToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'email already registered' });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null, roleId: 1, isVerified: false },
  });

  // Create and send verification email
  const { raw, hash } = generateToken();
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  sendVerificationEmail(user.email, raw).catch((err) =>
    console.error('[email] sendVerificationEmail failed:', err)
  );

  return res.status(201).json({ code: 'VERIFY_EMAIL', email: user.email });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'invalid credentials' });

  // Account was created via Google OAuth — no password set
  if (!user.passwordHash) {
    return res.status(400).json({
      code: 'GOOGLE_ACCOUNT',
      message: 'This account uses Google sign-in. Please use the Google button to sign in.',
    });
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return res.status(401).json({ message: 'invalid credentials' });

  if (!user.isVerified) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before signing in.',
      email: user.email,
    });
  }

  const tokens = await createSession(user.id);
  return res.json(tokens);
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

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
        data: { provider, providerId, name: user.name || name, isVerified: true },
      });
    }
  } else {
    user = await prisma.user.create({
      data: { email, name, provider, providerId, roleId: 1, isVerified: true },
    });
  }

  const tokens = await createSession(user.id);
  return res.json(tokens);
}

// ── Verify Email ──────────────────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'token required' });

  const tokenHash = sha256(token);
  const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });

  if (!record) return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired verification link.' });
  if (record.usedAt) return res.status(400).json({ code: 'TOKEN_USED', message: 'This link has already been used.' });
  if (record.expiresAt < new Date()) return res.status(400).json({ code: 'TOKEN_EXPIRED', message: 'Verification link has expired. Please request a new one.' });

  // Mark token used + verify user atomically
  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
  ]);

  // Send welcome email async (don't block)
  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (user) sendWelcomeEmail(user.email, user.name).catch(() => null);

  const tokens = await createSession(record.userId);
  return res.json({ message: 'Email verified successfully.', ...tokens });
}

// ── Resend Verification ───────────────────────────────────────────────────────

export async function resendVerification(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 — don't reveal whether email exists
  if (!user || user.isVerified) {
    return res.json({ message: 'If this email exists and is unverified, a new link has been sent.' });
  }

  // Delete old unused tokens
  await prisma.emailVerification.deleteMany({ where: { userId: user.id, usedAt: null } });

  const { raw, hash } = generateToken();
  await prisma.emailVerification.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  sendVerificationEmail(user.email, raw).catch(() => null);

  return res.json({ message: 'If this email exists and is unverified, a new link has been sent.' });
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return 200 — don't reveal whether email exists
  if (user && user.passwordHash) {
    // Delete old unused reset tokens
    await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });

    const { raw, hash } = generateToken();
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
    });

    sendPasswordResetEmail(user.email, raw).catch(() => null);
  }

  return res.json({ message: 'If that email is registered, a reset link has been sent.' });
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'token and password required' });
  if (password.length < 8) return res.status(400).json({ message: 'password must be at least 8 characters' });

  const tokenHash = sha256(token);
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

  if (!record) return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired reset link.' });
  if (record.usedAt) return res.status(400).json({ code: 'TOKEN_USED', message: 'This reset link has already been used.' });
  if (record.expiresAt < new Date()) return res.status(400).json({ code: 'TOKEN_EXPIRED', message: 'Reset link has expired. Please request a new one.' });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.$transaction([
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    // Invalidate all sessions for security
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return res.json({ message: 'Password reset successfully. You can now sign in.' });
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.sid) return res.status(401).json({ message: 'invalid refresh token' });

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session) return res.status(401).json({ message: 'session not found' });

  const ok = await argon2.verify(session.refreshTokenHash, refreshToken).catch(() => false);
  if (!ok) return res.status(401).json({ message: 'refresh token mismatch' });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(401).json({ message: 'user not found' });

  const accessToken = signAccessToken({ sub: user.id });
  const newSessionId = randomId();
  const newRefreshToken = signRefreshToken(newSessionId);
  const newHash = await argon2.hash(newRefreshToken);

  await prisma.session.delete({ where: { id: session.id } });
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.session.create({ data: { id: newSessionId, userId: user.id, refreshTokenHash: newHash, expiresAt } });

  return res.json({ accessToken, refreshToken: newRefreshToken });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.sid) return res.status(200).json({ message: 'ok' });

  await prisma.session.deleteMany({ where: { id: payload.sid } }).catch(() => null);
  return res.status(200).json({ message: 'logged out' });
}

// ── Me ────────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
      passwordHash: true,
      provider: true,
      avatarUrl: true,
      createdAt: true,
      onboardingComplete: true,
      role: { select: { name: true } },
      subscriptions: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!user) return res.status(404).json({ message: 'not found' });

  const activeSub = user.subscriptions[0] ?? null;
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    plan: activeSub?.plan?.name ?? 'Free',
    planSlug: activeSub?.plan?.slug ?? 'free',
    planExpiry: activeSub?.currentPeriodEnd ?? null,
    hasPassword: !!user.passwordHash,
    provider: user.provider ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role.name,
    onboardingComplete: user.onboardingComplete,
  });
}
