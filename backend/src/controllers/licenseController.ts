import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const activateSchema = z.object({
  licenseKey: z.string().min(1),
  instanceId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export async function activateLicense(req: Request, res: Response) {
  const result = activateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ message: 'invalid input', errors: result.error.format() });

  const { licenseKey, instanceId, metadata } = result.data;
  const license = await prisma.license.findUnique({ where: { licenseKey } });
  if (!license) return res.status(404).json({ message: 'license not found' });
  if (license.revokedAt) return res.status(403).json({ message: 'license revoked' });

  const activationCount = await prisma.licenseActivation.count({ where: { licenseId: license.id } });
  if (activationCount >= license.maxActivations) {
    return res.status(403).json({ message: 'activation limit reached' });
  }

  const existingActivation = await prisma.licenseActivation.findUnique({
    where: { licenseId_instanceId: { licenseId: license.id, instanceId } }
  });
  if (existingActivation) {
    return res.status(200).json({ message: 'license already activated', license: { id: license.id, licenseKey: license.licenseKey, product: license.product } });
  }

  const activation = await prisma.licenseActivation.create({
    data: {
      licenseId: license.id,
      instanceId,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    }
  });

  return res.status(200).json({ message: 'license activated', activation });
}

export async function validateLicense(req: Request, res: Response) {
  const { licenseKey, instanceId } = req.body as { licenseKey?: string; instanceId?: string };
  if (!licenseKey || !instanceId) return res.status(400).json({ message: 'licenseKey and instanceId are required' });

  const license = await prisma.license.findUnique({ where: { licenseKey } });
  if (!license || license.revokedAt) return res.status(404).json({ valid: false, message: 'invalid license' });

  const activation = await prisma.licenseActivation.findUnique({
    where: { licenseId_instanceId: { licenseId: license.id, instanceId } }
  });

  if (!activation) return res.status(404).json({ valid: false, message: 'not activated on this instance' });

  return res.status(200).json({ valid: true, license: { id: license.id, product: license.product, maxActivations: license.maxActivations } });
}

export async function listLicenses(req: Request, res: Response) {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ message: 'unauthenticated' });

  const licenses = await prisma.license.findMany({
    where: { userId },
    include: { activations: true }
  });

  return res.status(200).json(licenses);
}
