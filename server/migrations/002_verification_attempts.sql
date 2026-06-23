-- Step 9 hardening: bound brute-force guessing of the 6-digit verification code.
-- Each failed /verify increments this; after a small cap the code is invalidated.
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
