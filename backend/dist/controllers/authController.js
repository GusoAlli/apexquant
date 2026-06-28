"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.googleLogin = googleLogin;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
const prisma_1 = __importDefault(require("../lib/prisma"));
const argon2_1 = __importDefault(require("argon2"));
const google_auth_library_1 = require("google-auth-library");
const jwt_1 = require("../lib/jwt");
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
async function verifyGoogleIdToken(idToken) {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
}
async function register(req, res) {
    const { email, password, name } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'email and password required' });
    const existing = await prisma_1.default.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ message: 'email already registered' });
    const passwordHash = await argon2_1.default.hash(password, { type: argon2_1.default.argon2id });
    // NOTE: ensure roles are seeded; using roleId = 1 as default (adjust if needed)
    const user = await prisma_1.default.user.create({
        data: { email, passwordHash, name: name || null, roleId: 1 }
    });
    const userSafe = { id: user.id, email: user.email, name: user.name };
    return res.status(201).json(userSafe);
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'email and password required' });
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
        return res.status(401).json({ message: 'invalid credentials' });
    const valid = await argon2_1.default.verify(user.passwordHash, password);
    if (!valid)
        return res.status(401).json({ message: 'invalid credentials' });
    const accessToken = (0, jwt_1.signAccessToken)({ sub: user.id });
    // create session and refresh token
    const sessionId = (0, jwt_1.randomId)();
    const refreshToken = (0, jwt_1.signRefreshToken)(sessionId);
    const refreshHash = await argon2_1.default.hash(refreshToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    await prisma_1.default.session.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: refreshHash, expiresAt } });
    return res.json({ accessToken, refreshToken });
}
async function googleLogin(req, res) {
    const { idToken } = req.body;
    if (!idToken)
        return res.status(400).json({ message: 'idToken required' });
    const payload = await verifyGoogleIdToken(idToken).catch(() => null);
    if (!payload || !payload.email || !payload.sub || payload.email_verified !== true) {
        return res.status(401).json({ message: 'invalid Google token' });
    }
    const email = payload.email;
    const provider = 'google';
    const providerId = payload.sub;
    const name = payload.name || null;
    let user = await prisma_1.default.user.findUnique({ where: { email } });
    if (user) {
        if (user.provider && user.provider !== provider) {
            return res.status(409).json({ message: 'email already associated with another provider' });
        }
        if (!user.provider || !user.providerId) {
            user = await prisma_1.default.user.update({
                where: { id: user.id },
                data: { provider, providerId, name: user.name || name },
            });
        }
    }
    else {
        user = await prisma_1.default.user.create({
            data: { email, name, provider, providerId, roleId: 1 },
        });
    }
    const accessToken = (0, jwt_1.signAccessToken)({ sub: user.id });
    const sessionId = (0, jwt_1.randomId)();
    const refreshToken = (0, jwt_1.signRefreshToken)(sessionId);
    const refreshHash = await argon2_1.default.hash(refreshToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await prisma_1.default.session.create({ data: { id: sessionId, userId: user.id, refreshTokenHash: refreshHash, expiresAt } });
    return res.json({ accessToken, refreshToken });
}
async function refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ message: 'refreshToken required' });
    const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    if (!payload || !payload.sid)
        return res.status(401).json({ message: 'invalid refresh token' });
    const session = await prisma_1.default.session.findUnique({ where: { id: payload.sid } });
    if (!session)
        return res.status(401).json({ message: 'session not found' });
    // verify provided refresh token matches stored hash
    const ok = await argon2_1.default.verify(session.refreshTokenHash, refreshToken).catch(() => false);
    if (!ok)
        return res.status(401).json({ message: 'refresh token mismatch' });
    const user = await prisma_1.default.user.findUnique({ where: { id: session.userId } });
    if (!user)
        return res.status(401).json({ message: 'user not found' });
    const accessToken = (0, jwt_1.signAccessToken)({ sub: user.id });
    const newSessionId = (0, jwt_1.randomId)();
    const newRefreshToken = (0, jwt_1.signRefreshToken)(newSessionId);
    const newHash = await argon2_1.default.hash(newRefreshToken);
    // replace session atomically
    await prisma_1.default.session.delete({ where: { id: session.id } });
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await prisma_1.default.session.create({ data: { id: newSessionId, userId: user.id, refreshTokenHash: newHash, expiresAt } });
    return res.json({ accessToken, refreshToken: newRefreshToken });
}
async function logout(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ message: 'refreshToken required' });
    const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    if (!payload || !payload.sid)
        return res.status(200).json({ message: 'ok' });
    await prisma_1.default.session.deleteMany({ where: { id: payload.sid } }).catch(() => null);
    return res.status(200).json({ message: 'logged out' });
}
async function me(req, res) {
    // user id set by middleware if present
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ message: 'unauthenticated' });
    const user = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } });
    if (!user)
        return res.status(404).json({ message: 'not found' });
    return res.json(user);
}
