// DB-backed fixed-window rate limiter. In-memory counters don't work on Vercel
// (each lambda instance has its own memory), so the counter lives in Neon and is
// shared across instances. See migration 004_rate_limits.sql.
import { sql } from '../db.js';

// Best-effort client IP. On Vercel both x-real-ip and x-forwarded-for are OVERWRITTEN
// by the platform with the real client IP; client-supplied values are dropped
// (vercel.com/docs/headers/request-headers), so they're trustworthy here. Prefer
// x-real-ip (a single address, no list to mis-parse). Locally there's no proxy, so we
// fall back to the socket address.
// ⚠️ If this app is ever served behind a proxy that APPENDS to X-Forwarded-For instead
// of overwriting it, revisit this — the leftmost XFF entry would then be client-spoofable.
function clientIp(req) {
  return req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.socket?.remoteAddress
    || 'unknown';
}

// rateLimit({ name, limit, windowMs }) → Express middleware that allows up to
// `limit` requests per `windowMs` per client for the action `name`.
export function rateLimit({ name, limit, windowMs }) {
  return async function rateLimiter(req, res, next) {
    try {
      const bucket = `${name}:${clientIp(req)}`;
      const windowStart = Math.floor(Date.now() / windowMs);

      // Atomic increment-or-reset in a single statement: if the stored window is
      // the current one, bump the count; otherwise this is a new window, so reset
      // to 1. Keeps exactly one row per bucket.
      const [row] = await sql`
        INSERT INTO rate_limits (bucket, window_start, count)
        VALUES (${bucket}, ${windowStart}, 1)
        ON CONFLICT (bucket) DO UPDATE SET
          count = CASE WHEN rate_limits.window_start = ${windowStart}
                       THEN rate_limits.count + 1 ELSE 1 END,
          window_start = ${windowStart},
          updated_at = now()
        RETURNING count`;

      if (row.count > limit) {
        const retryAfter = Math.ceil((windowMs - (Date.now() % windowMs)) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Too many requests — please try again in a bit.' });
      }
      next();
    } catch (err) {
      // Fail open: a limiter/DB hiccup shouldn't lock everyone out of auth. Log
      // it so the outage is visible, but let the request through.
      console.error('[rateLimit] error, allowing request:', err.message);
      next();
    }
  };
}
