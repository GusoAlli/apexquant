import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import argon2 from 'argon2';

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { name } = req.body;
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'name is required' });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: { id: true, email: true, name: true },
  });
  return res.json(user);
}

export async function changePassword(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ message: 'newPassword is required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'newPassword must be at least 8 characters' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: 'user not found' });

  if (!user.passwordHash) {
    // Google user setting a password for the first time — no current password needed
    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return res.json({ message: 'Password set successfully. You can now sign in with email and password.' });
  }

  // Existing password — require current password verification
  if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required' });

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

  const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  return res.json({ message: 'Password updated successfully.' });
}

export async function uploadAvatar(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${userId}${ext}`;
  const destDir = path.join(__dirname, '../../uploads/avatars');
  const destPath = path.join(destDir, filename);

  // Remove old avatar file with different extension
  for (const e of ['.jpg', '.jpeg', '.png', '.webp']) {
    const old = path.join(destDir, `${userId}${e}`);
    if (old !== destPath && fs.existsSync(old)) fs.unlinkSync(old);
  }

  fs.renameSync(file.path, destPath);

  const avatarUrl = `/uploads/avatars/${filename}`;
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

  return res.json({ avatarUrl });
}

export async function completeOnboarding(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingComplete: true },
  });
  return res.json({ ok: true });
}
