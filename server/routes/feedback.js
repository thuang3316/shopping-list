import { Router } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { deliverFeedback } from '../email.js';

const router = Router();
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const CATEGORIES = new Set(['bug', 'idea', 'other']);
const MAX_MESSAGE = 2000;

// Per-IP cap to blunt scripted spam (also per-user in practice, since auth required).
const feedbackLimit = rateLimit({ name: 'feedback', limit: 10, windowMs: 60 * 60 * 1000 });

// POST /api/feedback — send feedback to the site owner (auth required). The row is
// always stored (durable) and then emailed to the owner best-effort: an email failure
// is logged but must not fail the request, so feedback is never lost to a send hiccup.
router.post('/', feedbackLimit, requireAuth, asyncH(async (req, res) => {
  const message = (req.body?.message || '').trim();
  const category = (req.body?.category || '').trim();

  if (!message) return res.status(400).json({ error: 'Please write a message' });
  if (message.length > MAX_MESSAGE) {
    return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE} characters)` });
  }
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Choose a valid category' });

  // The token carries { id, username }; fetch the email for the reply-to + snapshot.
  const [me] = await sql`SELECT email FROM users WHERE id = ${req.user.id}`;
  if (!me) return res.status(401).json({ error: 'Not authenticated' });

  await sql`
    INSERT INTO feedback (user_id, email, username, category, message)
    VALUES (${req.user.id}, ${me.email}, ${req.user.username}, ${category}, ${message})`;

  try {
    await deliverFeedback({ message, category, fromEmail: me.email, fromUsername: req.user.username });
  } catch (err) {
    console.error('[feedback] email notification failed:', err.message);
  }

  res.status(201).json({ ok: true });
}));

export default router;
