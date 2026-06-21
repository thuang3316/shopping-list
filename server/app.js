import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { sql } from './db.js';
import authRouter from './routes/auth.js';

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

  // DB health check — confirms the Neon connection + schema are reachable.
  app.get('/api/health/db', async (req, res, next) => {
    try {
      const [{ now }] = await sql`SELECT now()`;
      const [{ count }] = await sql`SELECT count(*)::int AS count FROM items`;
      res.json({ ok: true, now, items: count });
    } catch (err) {
      next(err);
    }
  });

  // Feature routers
  app.use('/api/auth', authRouter);
  // (items, requests mount here as they are built)

  app.use(errorHandler); // must be last
  return app;
}
