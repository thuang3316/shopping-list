import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { validateEnv } from './env.js';
import { sql } from './db.js';
import authRouter from './routes/auth.js';
import itemsRouter from './routes/items.js';
import meRouter from './routes/me.js';
import requestsRouter from './routes/requests.js';
import usersRouter from './routes/users.js';

// Build the Express app. Exported (not listened) so it can run both as a
// Vercel serverless handler (api/index.js) and a local dev server (dev.js).
// See .claude/skills/express-vercel-api.
export function createApp() {
  validateEnv(); // fail fast on a misconfigured deploy before building the app

  const app = express();

  app.disable('x-powered-by'); // don't advertise the framework/stack

  // Security headers for every API response. These are JSON endpoints that
  // should never load resources or be framed, so the CSP is locked all the way
  // down. (The static SPA's headers live in vercel.json, since Vercel serves the
  // HTML directly and bypasses this app.) Set before routes so they apply even
  // to error responses.
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  // Health check — confirms the API is reachable.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // DB health check — local diagnostic only. Disabled in production so we don't
  // expose DB reachability or row counts publicly.
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/health/db', async (req, res, next) => {
      try {
        const [{ now }] = await sql`SELECT now()`;
        const [{ count }] = await sql`SELECT count(*)::int AS count FROM items`;
        res.json({ ok: true, now, items: count });
      } catch (err) {
        next(err);
      }
    });
  }

  // Feature routers
  app.use('/api/auth', authRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/me', meRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/users', usersRouter);

  app.use(errorHandler); // must be last
  return app;
}
