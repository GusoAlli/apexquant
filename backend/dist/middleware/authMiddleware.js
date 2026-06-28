"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS || 'change_me_access';
async function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return next();
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
        req.userId = payload.sub;
        const user = await prisma_1.default.user.findUnique({ where: { id: payload.sub }, select: { role: true } });
        if (user?.role?.name) {
            req.role = user.role.name;
        }
    }
    catch (err) {
        // ignore invalid token
    }
    return next();
}
function requireAuth(req, res, next) {
    if (!req.userId)
        return res.status(401).json({ message: 'unauthenticated' });
    return next();
}
function requireAdmin(req, res, next) {
    if (req.role !== 'admin')
        return res.status(403).json({ message: 'forbidden' });
    return next();
}
