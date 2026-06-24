import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Per-IP cap on posting buy requests, to blunt scripted spam.
const createRequestLimit = rateLimit({ name: 'create_request', limit: 30, windowMs: 60 * 60 * 1000 });

const CATEGORIES = new Set([
  'furniture', 'electronics', 'bikes', 'photo', 'music',
  'clothing', 'books', 'home', 'sports', 'toys', 'other',
]);

// GET /api/requests — public demand feed; optional ?category= filter.
router.get('/', asyncH(async (req, res) => {
  const { category } = req.query;
  const where = [];
  const params = [];
  if (category) { params.push(category); where.push(`r.category = $${params.length}`); }
  const text = `
    SELECT r.id, r.title, r.category, r.price_min, r.price_max, r.created_at, u.username AS buyer
    FROM requests r JOIN users u ON u.id = r.buyer_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY r.created_at DESC
    LIMIT 60`;
  const result = await sql.query(text, params);
  res.json({ requests: Array.isArray(result) ? result : result.rows });
}));

// POST /api/requests — post a buy request (auth required).
router.post('/', createRequestLimit, requireAuth, asyncH(async (req, res) => {
  const title = (req.body?.title || '').trim();
  const category = (req.body?.category || '').trim();

  if (!title) return res.status(400).json({ error: 'Describe what you are looking for' });
  if (title.length > 200) return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid category' });

  const parsePrice = (v, label) => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error(`${label} must be a positive number`), { status: 400, expose: true });
    return n;
  };
  const price_min = parsePrice(req.body?.price_min, 'Minimum price');
  const price_max = parsePrice(req.body?.price_max, 'Maximum price');
  if (price_min != null && price_max != null && price_min > price_max) {
    return res.status(400).json({ error: 'Minimum price cannot exceed maximum price' });
  }

  const [r] = await sql`
    INSERT INTO requests (buyer_id, title, category, price_min, price_max)
    VALUES (${req.user.id}, ${title}, ${category}, ${price_min}, ${price_max})
    RETURNING id`;
  res.status(201).json({ id: r.id });
}));

export default router;
