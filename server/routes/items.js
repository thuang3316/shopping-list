import { Router } from 'express';
import { handleUpload } from '@vercel/blob/client';
import { sql } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

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

// GET /api/items/:id — single listing. optionalAuth: seller contact (email/
// phone) is included ONLY for signed-in viewers, to protect private info.
router.get('/:id', optionalAuth, asyncH(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(404).json({ error: 'Listing not found' });

  const [row] = await sql`
    SELECT i.id, i.title, i.description, i.price, i.category, i.image_urls, i.status,
           i.due_date, i.created_at,
           u.id AS seller_id, u.username AS seller_username, u.email AS seller_email, u.phone AS seller_phone
    FROM items i JOIN users u ON u.id = i.seller_id
    WHERE i.id = ${id}`;
  if (!row) return res.status(404).json({ error: 'Listing not found' });

  const seller = { username: row.seller_username };
  if (req.user) { seller.email = row.seller_email; seller.phone = row.seller_phone; }

  res.json({
    item: {
      id: row.id, title: row.title, description: row.description, price: row.price,
      category: row.category, image_urls: row.image_urls, status: row.status,
      due_date: row.due_date, created_at: row.created_at,
      seller,
      is_owner: Boolean(req.user) && String(req.user.id) === String(row.seller_id),
    },
  });
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

// PATCH /api/items/:id — update own listing (partial). Ownership enforced in
// the WHERE clause; 404 (not 403) if not yours, so existence isn't leaked.
router.patch('/:id', requireAuth, asyncH(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(404).json({ error: 'Listing not found' });

  const sets = [];
  const params = [];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  const b = req.body || {};

  if (typeof b.title === 'string') {
    const title = b.title.trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (title.length > 200) return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
    add('title', title);
  }
  if (typeof b.category === 'string') {
    if (!CATEGORIES.has(b.category)) return res.status(400).json({ error: 'Choose a valid category' });
    add('category', b.category);
  }
  if ('price' in b) {
    if (b.price === '' || b.price == null) add('price', null);
    else {
      const price = Number(b.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Price must be a positive number' });
      add('price', price);
    }
  }
  if ('description' in b) add('description', (b.description || '').trim() || null);
  if ('due_date' in b) {
    const due = (b.due_date || '').trim() || null;
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return res.status(400).json({ error: 'Invalid due date' });
    add('due_date', due);
  }
  if ('status' in b) {
    if (!['available', 'sold'].includes(b.status)) return res.status(400).json({ error: 'Invalid status' });
    add('status', b.status);
  }
  if (Array.isArray(b.image_urls)) add('image_urls', b.image_urls.filter((u) => typeof u === 'string').slice(0, 8));

  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(id);
  params.push(req.user.id);
  const text = `UPDATE items SET ${sets.join(', ')}
                WHERE id = $${params.length - 1} AND seller_id = $${params.length}
                RETURNING id`;
  const result = await sql.query(text, params);
  const rows = Array.isArray(result) ? result : result.rows;
  if (!rows.length) return res.status(404).json({ error: 'Listing not found' });
  res.json({ id: rows[0].id });
}));

// DELETE /api/items/:id — delete own listing.
router.delete('/:id', requireAuth, asyncH(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(404).json({ error: 'Listing not found' });
  const rows = await sql`DELETE FROM items WHERE id = ${id} AND seller_id = ${req.user.id} RETURNING id`;
  if (!rows.length) return res.status(404).json({ error: 'Listing not found' });
  res.json({ ok: true });
}));

export default router;
