import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

// Everything under /api/me is private to the signed-in user.
const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
router.use(requireAuth);

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

export default router;
