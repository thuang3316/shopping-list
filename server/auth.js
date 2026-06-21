// JWT + cookie helpers. The session is a signed JWT stored in an httpOnly
// cookie (not readable by JS → not exposed to XSS). Stateless, so it suits
// Vercel serverless. See .claude/skills/auth-jwt-cookies.
import jwt from 'jsonwebtoken';

export const COOKIE = 'token';
const isProd = process.env.NODE_ENV === 'production';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const cookieOptions = {
  httpOnly: true,
  secure: isProd, // HTTPS-only in production
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE_MS,
};

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw Object.assign(new Error('JWT_SECRET is not set'), { status: 500 });
  return s;
}

export function issueToken(res, user) {
  const token = jwt.sign({ id: user.id, username: user.username }, secret(), { expiresIn: '7d' });
  res.cookie(COOKIE, token, cookieOptions);
}

export function clearToken(res) {
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
}

export function verifyToken(token) {
  return jwt.verify(token, secret()); // throws if invalid/expired
}
