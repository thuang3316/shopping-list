-- Feedback messages from users to the site owner (received only by the owner).
-- email/username are snapshots so a reply is still possible after the account is
-- deleted; user_id uses ON DELETE SET NULL (not CASCADE) to preserve the feedback.
CREATE TABLE IF NOT EXISTS feedback (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  email      CITEXT NOT NULL,
  username   CITEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('bug','idea','other')),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback (created_at DESC);
