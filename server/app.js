import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
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
  const app = express();

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
