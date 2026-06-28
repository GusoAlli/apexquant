"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateLicense = activateLicense;
exports.validateLicense = validateLicense;
exports.listLicenses = listLicenses;
const prisma_1 = __importDefault(require("../lib/prisma"));
const zod_1 = require("zod");
const activateSchema = zod_1.z.object({
    licenseKey: zod_1.z.string().min(1),
    instanceId: zod_1.z.string().min(1),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
async function activateLicense(req, res) {
    const result = activateSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
    const { licenseKey, instanceId, metadata } = result.data;
    const license = await prisma_1.default.license.findUnique({ where: { licenseKey } });
    if (!license)
        return res.status(404).json({ message: 'license not found' });
    if (license.revokedAt)
        return res.status(403).json({ message: 'license revoked' });
    const activationCount = await prisma_1.default.licenseActivation.count({ where: { licenseId: license.id } });
    if (activationCount >= license.maxActivations) {
        return res.status(403).json({ message: 'activation limit reached' });
    }
    const existingActivation = await prisma_1.default.licenseActivation.findUnique({
        where: { licenseId_instanceId: { licenseId: license.id, instanceId } }
    });
    if (existingActivation) {
        return res.status(200).json({ message: 'license already activated', license: { id: license.id, licenseKey: license.licenseKey, product: license.product } });
    }
    const activation = await prisma_1.default.licenseActivation.create({
        data: {
            licenseId: license.id,
            instanceId,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        }
    });
    return res.status(200).json({ message: 'license activated', activation });
}
async function validateLicense(req, res) {
    const { licenseKey, instanceId } = req.body;
    if (!licenseKey || !instanceId)
        return res.status(400).json({ message: 'licenseKey and instanceId are required' });
    const license = await prisma_1.default.license.findUnique({ where: { licenseKey } });
    if (!license || license.revokedAt)
        return res.status(404).json({ valid: false, message: 'invalid license' });
    const activation = await prisma_1.default.licenseActivation.findUnique({
        where: { licenseId_instanceId: { licenseId: license.id, instanceId } }
    });
    if (!activation)
        return res.status(404).json({ valid: false, message: 'not activated on this instance' });
    return res.status(200).json({ valid: true, license: { id: license.id, product: license.product, maxActivations: license.maxActivations } });
}
async function listLicenses(req, res) {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ message: 'unauthenticated' });
    const licenses = await prisma_1.default.license.findMany({
        where: { userId },
        include: { activations: true }
    });
    return res.status(200).json(licenses);
}
