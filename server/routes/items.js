import { Router } from 'express';
import { sql } from '../db.js';

const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SORTS = {
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  price_asc: 'i.price ASC NULLS LAST',
  price_desc: 'i.price DESC NULLS LAST',
};

// GET /api/items — public listing feed with search, filters, and sort.
// Query params: q, category, minPrice, maxPrice, sort (newest|oldest|price_asc|price_desc)
router.get('/', asyncH(async (req, res) => {
  const { q, category, minPrice, maxPrice, sort } = req.query;

  const where = [`i.status = 'available'`];
  const params = [];

  if (q && q.trim()) { params.push(`%${q.trim()}%`); where.push(`i.title ILIKE $${params.length}`); }
  if (category) { params.push(category); where.push(`i.category = $${params.length}`); }

  const min = Number(minPrice);
  if (Number.isFinite(min)) { params.push(min); where.push(`i.price >= $${params.length}`); }
  const max = Number(maxPrice);
  if (Number.isFinite(max)) { params.push(max); where.push(`i.price <= $${params.length}`); }

  const orderBy = SORTS[sort] || SORTS.newest;

  const text = `
    SELECT i.id, i.title, i.price, i.category, i.image_urls, i.created_at,
           u.username AS seller
    FROM items i
    JOIN users u ON u.id = i.seller_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT 60`;

  const result = await sql.query(text, params);
  const items = Array.isArray(result) ? result : result.rows;
  res.json({ items });
}));

export default router;
