import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
  return next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
  return next();
}

export function validateGoogleLogin(req: Request, res: Response, next: NextFunction) {
  const result = googleLoginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
  return next();
}
