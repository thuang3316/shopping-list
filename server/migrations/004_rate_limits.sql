-- Step 9 hardening: DB-backed rate limiting. Serverless functions don't share
-- memory across instances, so an in-process limiter wouldn't actually bound a
-- distributed attacker — the counter must live in shared storage (Neon).
--
-- Fixed-window counter: one row per (action+client) bucket. `window_start` is the
-- integer window index = floor(epoch_ms / window_ms); the limiter resets `count`
-- to 1 whenever a request lands in a newer window than the stored one, so a row
-- is reused indefinitely and the table holds at most one row per active bucket.
-- `updated_at` lets a future cleanup job prune buckets that have gone quiet.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  count        INT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
