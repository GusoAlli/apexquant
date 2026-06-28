import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const createLicenseSchema = z.object({
  userId: z.string().uuid(),
  product: z.string().min(1),
  maxActivations: z.number().int().min(1).default(1),
  metadata: z.record(z.any()).optional(),
});

export async function createLicense(req: Request, res: Response) {
  const result = createLicenseSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: 'invalid input', errors: result.error.format() });

  const licenseKey = `LIC-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
  const license = await prisma.license.create({
    data: {
      userId: result.data.userId,
      licenseKey,
      product: result.data.product,
      maxActivations: result.data.maxActivations,
      metadata: result.data.metadata as any
    }
  });

  return res.status(201).json(license);
}

export async function listAllLicenses(req: Request, res: Response) {
  const licenses = await prisma.license.findMany({
    include: { activations: true }
  });
  return res.json(licenses);
}

export async function revokeLicense(req: Request, res: Response) {
  const { licenseKey } = req.body as { licenseKey?: string };
  if (!licenseKey) return res.status(400).json({ message: 'licenseKey required' });

  const updated = await prisma.license.updateMany({
    where: { licenseKey },
    data: { revokedAt: new Date() }
  });

  if (updated.count === 0) return res.status(404).json({ message: 'license not found' });
  return res.status(200).json({ message: 'license revoked' });
}
