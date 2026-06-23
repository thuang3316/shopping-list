import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { issueToken } from '../auth.js';
import { EMAIL_RE, isCommonPassword, createAndSendCode } from '../account.js';

// Everything under /api/me is private to the signed-in user.
const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
router.use(requireAuth);

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email, email_verified: u.email_verified, phone: u.phone });

// GET /api/me/items — the current user's listings (all statuses).
router.get('/items', asyncH(async (req, res) => {
  const items = await sql`
    SELECT id, title, price, category, image_urls, status, created_at
    FROM items WHERE seller_id = ${req.user.id}
    ORDER BY created_at DESC`;
  res.json({ items });
}));

// GET /api/me/requests — the current user's buy requests (Step 7 populates these).
router.get('/requests', asyncH(async (req, res) => {
  const requests = await sql`
    SELECT id, title, category, price_min, price_max, created_at
    FROM requests WHERE buyer_id = ${req.user.id}
    ORDER BY created_at DESC`;
  res.json({ requests });
}));

// PATCH /api/me/profile — update the signed-in user's own account. Supports
// username, phone, password change (needs current password), and email change
// (re-triggers verification). Only the fields that actually change are written.
router.patch('/profile', asyncH(async (req, res) => {
  const b = req.body || {};
  const [me] = await sql`
    SELECT id, username, email, password_hash, email_verified, phone
    FROM users WHERE id = ${req.user.id}`;
  if (!me) return res.status(401).json({ error: 'Not authenticated' });

  const sets = [];
  const params = [];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  let emailChanged = false;
  let newEmail = null;

  if (typeof b.username === 'string') {
    const username = b.username.trim();
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (username.toLowerCase() !== me.username.toLowerCase()) add('username', username);
  }

  if ('phone' in b) {
    const phone = (b.phone || '').trim() || null;
    if (phone !== me.phone) add('phone', phone);
  }

  // Password change requires the current password as a re-auth check.
  if (b.new_password) {
    const ok = await bcrypt.compare(b.current_password || '', me.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    if (b.new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    if (isCommonPassword(b.new_password)) return res.status(400).json({ error: 'That password is too common and appears in known breaches — please choose another' });
    add('password_hash', await bcrypt.hash(b.new_password, 12));
  }

  // Email change → must re-verify, so flip email_verified off and send a code.
  if (typeof b.email === 'string') {
    const email = b.email.trim();
    if (email.toLowerCase() !== me.email.toLowerCase()) {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
      add('email', email);
      add('email_verified', false);
      emailChanged = true;
      newEmail = email;
    }
  }

  if (!sets.length) return res.status(400).json({ error: 'No changes to save' });

  params.push(req.user.id);
  const text = `UPDATE users SET ${sets.join(', ')}
                WHERE id = $${params.length}
                RETURNING id, username, email, email_verified, phone`;
  let rows;
  try {
    const result = await sql.query(text, params);
    rows = Array.isArray(result) ? result : result.rows;
  } catch (err) {
    if (err.code === '23505' || /duplicate|unique/i.test(err.message || '')) {
      return res.status(409).json({ error: 'That email or username is already taken' });
    }
    throw err;
  }
  const user = rows[0];

  if (emailChanged) {
    await sql`DELETE FROM email_verifications WHERE email = ${newEmail}`; // clear any stale codes
    await createAndSendCode(newEmail);
  }

  // Re-issue the cookie so the token's username stays in sync after a change.
  issueToken(res, user);
  res.json({ user: publicUser(user), emailChanged });
}));

export default router;
