"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = validateRegister;
exports.validateLogin = validateLogin;
exports.validateGoogleLogin = validateGoogleLogin;
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
const googleLoginSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1),
});
function validateRegister(req, res, next) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
    return next();
}
function validateLogin(req, res, next) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
    return next();
}
function validateGoogleLogin(req, res, next) {
    const result = googleLoginSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ message: 'invalid input', errors: result.error.format() });
    return next();
}
