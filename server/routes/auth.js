import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db.js';
import { issueToken, clearToken, COOKIE, verifyToken } from '../auth.js';
import { EMAIL_RE, isCommonPassword, createAndSendCode, checkCode } from '../account.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Wrap async handlers so rejected promises reach the error handler.
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Per-IP limits. Login is the credential-stuffing target; signup/forgot each
// cost a bcrypt hash and/or an email send, so they're throttled harder.
const MIN = 60 * 1000;
const loginLimit = rateLimit({ name: 'login', limit: 10, windowMs: 15 * MIN });
const signupLimit = rateLimit({ name: 'signup', limit: 5, windowMs: 60 * MIN });
const forgotLimit = rateLimit({ name: 'forgot', limit: 5, windowMs: 60 * MIN });
const codeLimit = rateLimit({ name: 'code', limit: 20, windowMs: 15 * MIN }); // verify + reset

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, email_verified: u.email_verified, phone: u.phone });

// POST /api/auth/signup — create an unverified user and email a code.
router.post('/signup', signupLimit, asyncH(async (req, res) => {
  const username = (req.body?.username || '').trim();
  const email = (req.body?.email || '').trim();
  const password = req.body?.password || '';
  const phone = (req.body?.phone || '').trim() || null;

  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (isCommonPassword(password)) return res.status(400).json({ error: 'That password is too common and appears in known breaches — please choose another' });

  const password_hash = await bcrypt.hash(password, 12);

  // Free any UNVERIFIED account squatting this email or username, so a retry
  // after a bounced/abandoned verification isn't permanently blocked by the
  // UNIQUE constraints. Verified accounts are never touched → they still 409
  // below. An unverified user is never logged in (no token until /verify) so it
  // owns no listings/requests — nothing is lost. Also drop its stale codes.
  await sql`DELETE FROM users
            WHERE email_verified = false
              AND (email = ${email} OR username = ${username})`;
  await sql`DELETE FROM email_verifications WHERE email = ${email}`;

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
router.post('/verify', codeLimit, asyncH(async (req, res) => {
  const email = (req.body?.email || '').trim();
  const code = (req.body?.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const check = await checkCode(email, code, 'signup');
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  const [user] = await sql`
    UPDATE users SET email_verified = true WHERE email = ${email}
    RETURNING id, username, email, email_verified, phone`;
  if (!user) return res.status(400).json({ error: 'No account found for that email' });

  await sql`DELETE FROM email_verifications WHERE email = ${email} AND purpose = 'signup'`;
  issueToken(res, user);
  res.json({ user: publicUser(user) });
}));

// POST /api/auth/forgot — email a password-reset code. Always responds 200 with
// a generic message so it can't be used to probe which emails are registered.
router.post('/forgot', forgotLimit, asyncH(async (req, res) => {
  const email = (req.body?.email || '').trim();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });

  // Only send to a real, verified account; respond identically either way.
  const [user] = await sql`SELECT id, email_verified FROM users WHERE email = ${email}`;
  if (user && user.email_verified) {
    await createAndSendCode(email, 'reset');
  }
  res.json({ ok: true });
}));

// POST /api/auth/reset — set a new password using a reset code, then log in.
router.post('/reset', codeLimit, asyncH(async (req, res) => {
  const email = (req.body?.email || '').trim();
  const code = (req.body?.code || '').trim();
  const password = req.body?.password || '';
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (isCommonPassword(password)) return res.status(400).json({ error: 'That password is too common and appears in known breaches — please choose another' });

  const check = await checkCode(email, code, 'reset');
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  const password_hash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    UPDATE users SET password_hash = ${password_hash} WHERE email = ${email}
    RETURNING id, username, email, email_verified, phone`;
  if (!user) return res.status(400).json({ error: 'No account found for that email' });

  await sql`DELETE FROM email_verifications WHERE email = ${email} AND purpose = 'reset'`;
  issueToken(res, user); // a successful reset also signs them in
  res.json({ user: publicUser(user) });
}));

// POST /api/auth/login — verify password, require a verified email, log in.
router.post('/login', loginLimit, asyncH(async (req, res) => {
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
