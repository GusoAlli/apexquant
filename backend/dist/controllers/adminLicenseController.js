"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLicense = createLicense;
exports.listAllLicenses = listAllLicenses;
exports.revokeLicense = revokeLicense;
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const createLicenseSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    product: zod_1.z.string().min(1),
    maxActivations: zod_1.z.number().int().min(1).default(1),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
async function createLicense(req, res) {
    const result = createLicenseSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
    const licenseKey = `LIC-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    const license = await prisma_1.default.license.create({
        data: {
            userId: result.data.userId,
            licenseKey,
            product: result.data.product,
            maxActivations: result.data.maxActivations,
            metadata: result.data.metadata
        }
    });
    return res.status(201).json(license);
}
async function listAllLicenses(req, res) {
    const licenses = await prisma_1.default.license.findMany({
        include: { activations: true }
    });
    return res.json(licenses);
}
async function revokeLicense(req, res) {
    const { licenseKey } = req.body;
    if (!licenseKey)
        return res.status(400).json({ message: 'licenseKey required' });
    const updated = await prisma_1.default.license.updateMany({
        where: { licenseKey },
        data: { revokedAt: new Date() }
    });
    if (updated.count === 0)
        return res.status(404).json({ message: 'license not found' });
    return res.status(200).json({ message: 'license revoked' });
}
