import { Router } from 'express';
import { handleUpload } from '@vercel/blob/client';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const CATEGORIES = new Set([
  'furniture', 'electronics', 'bikes', 'photo', 'music',
  'clothing', 'books', 'home', 'sports', 'toys', 'other',
]);

const SORTS = {
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  price_asc: 'i.price ASC NULLS LAST',
  price_desc: 'i.price DESC NULLS LAST',
};

// GET /api/items — public listing feed with search, filters, and sort.
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
    SELECT i.id, i.title, i.price, i.category, i.image_urls, i.created_at, u.username AS seller
    FROM items i JOIN users u ON u.id = i.seller_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT 60`;
  const result = await sql.query(text, params);
  res.json({ items: Array.isArray(result) ? result : result.rows });
}));

// POST /api/items/upload — issues a short-lived token so the browser can upload
// the image directly to Vercel Blob (bypasses the serverless body-size limit).
// See .claude/skills (Step 4) / Vercel Blob client-upload docs.
router.post('/upload', requireAuth, asyncH(async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Image uploads are not configured yet (no Blob store).' });
  }
  const result = await handleUpload({
    request: req,
    body: req.body,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maximumSizeInBytes: 8 * 1024 * 1024,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({ userId: req.user.id }),
    }),
    onUploadCompleted: async () => { /* no-op; we read the URL client-side */ },
  });
  res.json(result);
}));

// POST /api/items — create a listing (auth required; owner = current user).
router.post('/', requireAuth, asyncH(async (req, res) => {
  const title = (req.body?.title || '').trim();
  const category = (req.body?.category || '').trim();
  const description = (req.body?.description || '').trim() || null;
  const dueDate = (req.body?.due_date || '').trim() || null;
  let price = req.body?.price;
  const images = Array.isArray(req.body?.image_urls)
    ? req.body.image_urls.filter((u) => typeof u === 'string').slice(0, 8)
    : [];

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (title.length > 200) return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid category' });

  if (price === '' || price == null) {
    price = null; // null = Negotiable
  } else {
    price = Number(price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Price must be a positive number' });
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return res.status(400).json({ error: 'Invalid due date' });

  const [item] = await sql`
    INSERT INTO items (seller_id, title, description, price, category, image_urls, due_date)
    VALUES (${req.user.id}, ${title}, ${description}, ${price}, ${category}, ${images}, ${dueDate})
    RETURNING id`;
  res.status(201).json({ id: item.id });
}));

export default router;
