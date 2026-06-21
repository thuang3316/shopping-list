// Auth middleware. requireAuth gates protected routes; optionalAuth attaches
// the user when present but never rejects (used to gate seller contact info).
import { COOKIE, verifyToken } from '../auth.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = verifyToken(token); // { id, username }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function optionalAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try { req.user = verifyToken(token); } catch { /* ignore — treat as logged out */ }
  }
  next();
}
