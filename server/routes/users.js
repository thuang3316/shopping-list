import { Router } from 'express';
import { sql } from '../db.js';

// Public member profiles. No auth: anyone can view a user's listings + requests.
// Contact info (email/phone) is NEVER selected here — it stays gated behind the
// signed-in item page, exactly like GET /api/items/:id.
const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/users/:username — public profile. username is CITEXT, so the match
// is case-insensitive.
router.get('/:username', asyncH(async (req, res) => {
  const username = (req.params.username || '').trim();
  if (!username) return res.status(404).json({ error: 'User not found' });

  const [user] = await sql`
    SELECT id, username, created_at FROM users WHERE username = ${username}`;
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
    user: { username: user.username, created_at: user.created_at },
    items,
    requests,
  });
}));

export default router;
