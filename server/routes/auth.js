import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db.js';
import { issueToken, clearToken, COOKIE, verifyToken } from '../auth.js';
import { EMAIL_RE, MAX_VERIFY_ATTEMPTS, hashCode, isCommonPassword, createAndSendCode } from '../account.js';

const router = Router();

// Wrap async handlers so rejected promises reach the error handler.
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, email_verified: u.email_verified, phone: u.phone });

// POST /api/auth/signup — create an unverified user and email a code.
router.post('/signup', asyncH(async (req, res) => {
  const username = (req.body?.username || '').trim();
  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';
  const phone = (req.body?.phone || '').trim() || null;

  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (isCommonPassword(password)) return res.status(400).json({ error: 'That password is too common and appears in known breaches — please choose another' });

  const password_hash = await bcrypt.hash(password, 12);
  let user;
  try {
    [user] = await sql`
      INSERT INTO users (username, email, password_hash, phone)
      VALUES (${username}, ${email}, ${password_hash}, ${phone})
      RETURNING id, email`;
  } catch (err) {
    if (err.code === '23505' || /duplicate|unique/i.test(err.message || '')) {
      return res.status(409).json({ error: 'That email or username is already registered' });
    }
    throw err;
  }

  await createAndSendCode(email);

  res.status(201).json({ ok: true, email });
}));

// POST /api/auth/verify — confirm the code, mark verified, and log in.
router.post('/verify', asyncH(async (req, res) => {
  const email = (req.body?.email || '').trim();
  const code = (req.body?.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  // Look up the newest unexpired code for this email, then compare in-app so we
  // can count failed guesses and bound brute force (1M codes / 10-min window).
  const [pending] = await sql`
    SELECT id, code, attempts FROM email_verifications
    WHERE email = ${email} AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1`;
  if (!pending) return res.status(400).json({ error: 'Invalid or expired code' });

  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    await sql`DELETE FROM email_verifications WHERE email = ${email}`;
    return res.status(429).json({ error: 'Too many incorrect attempts — please sign up again to get a new code' });
  }
  if (pending.code !== hashCode(code)) {
    await sql`UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ${pending.id}`;
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const [user] = await sql`
    UPDATE users SET email_verified = true WHERE email = ${email}
    RETURNING id, username, email, email_verified, phone`;
  if (!user) return res.status(400).json({ error: 'No account found for that email' });

  await sql`DELETE FROM email_verifications WHERE email = ${email}`;
  issueToken(res, user);
  res.json({ user: publicUser(user) });
}));

// POST /api/auth/login — verify password, require a verified email, log in.
router.post('/login', asyncH(async (req, res) => {
  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const [user] = await sql`
    SELECT id, username, email, password_hash, email_verified, phone FROM users WHERE email = ${email}`;
  // Same message whether the email is unknown or the password is wrong.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.email_verified) {
    return res.status(403).json({ error: 'Please verify your email first', needsVerification: true, email: user.email });
  }
  issueToken(res, user);
  res.json({ user: publicUser(user) });
}));

// POST /api/auth/logout — clear the cookie.
router.post('/logout', (req, res) => {
  clearToken(res);
  res.json({ ok: true });
});

// GET /api/auth/me — current user, or { user: null } if not logged in.
router.get('/me', asyncH(async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.json({ user: null });
  let payload;
  try { payload = verifyToken(token); } catch { return res.json({ user: null }); }
  const [user] = await sql`
    SELECT id, username, email, email_verified, phone FROM users WHERE id = ${payload.id}`;
  res.json({ user: user ? publicUser(user) : null });
}));

export default router;
