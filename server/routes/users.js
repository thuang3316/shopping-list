import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

// Member profiles. Auth required: only signed-in members can view a profile, so
// the seller's contact info (email/phone) is included — exactly the same gating
// model as the seller block on the item page. password_hash is NEVER selected.
const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/users/:username — member profile (signed-in only). username is CITEXT,
// so the match is case-insensitive.
router.get('/:username', requireAuth, asyncH(async (req, res) => {
  const username = (req.params.username || '').trim();
  if (!username) return res.status(404).json({ error: 'User not found' });

  const [user] = await sql`
    SELECT id, username, email, phone, created_at FROM users WHERE username = ${username}`;
  if (!user) return res.status(404).json({ error: 'User not found' });

  const items = await sql`
    SELECT id, title, price, category, image_urls, created_at
    FROM items WHERE seller_id = ${user.id} AND status = 'available'
    ORDER BY created_at DESC`;

  const requests = await sql`
    SELECT id, title, category, price_min, price_max, created_at
    FROM requests WHERE buyer_id = ${user.id}
    ORDER BY created_at DESC`;

  res.json({
    user: { username: user.username, email: user.email, phone: user.phone, created_at: user.created_at },
    items,
    requests,
  });
}));

export default router;
