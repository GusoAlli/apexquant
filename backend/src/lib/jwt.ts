import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET: jwt.Secret = process.env.JWT_SECRET_ACCESS || 'change_me_access';
const REFRESH_SECRET: jwt.Secret = process.env.JWT_SECRET_REFRESH || 'change_me_refresh';

export function signAccessToken(
  payload: object,
  expires: jwt.SignOptions['expiresIn'] = (process.env.ACCESS_TOKEN_EXPIRES || '15m') as jwt.SignOptions['expiresIn'],
) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: expires });
}

export function signRefreshToken(
  sessionId: string,
  expires: jwt.SignOptions['expiresIn'] = (process.env.REFRESH_TOKEN_EXPIRES || '30d') as jwt.SignOptions['expiresIn'],
) {
  return jwt.sign({ sid: sessionId }, REFRESH_SECRET, { expiresIn: expires });
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { sid: string; iat: number; exp: number };
  } catch (err) {
    return null;
  }
}

export function randomId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}
