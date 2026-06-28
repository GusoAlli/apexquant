"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.randomId = randomId;
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS || 'change_me_access';
const REFRESH_SECRET = process.env.JWT_SECRET_REFRESH || 'change_me_refresh';
function signAccessToken(payload, expires = (process.env.ACCESS_TOKEN_EXPIRES || '15m')) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: expires });
}
function signRefreshToken(sessionId, expires = (process.env.REFRESH_TOKEN_EXPIRES || '30d')) {
    return jwt.sign({ sid: sessionId }, REFRESH_SECRET, { expiresIn: expires });
}
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    }
    catch (err) {
        return null;
    }
}
function randomId() {
    if (typeof crypto_1.default.randomUUID === 'function')
        return crypto_1.default.randomUUID();
    return crypto_1.default.randomBytes(16).toString('hex');
}
