-- Migration 006: new 8-bucket category taxonomy (emoji labels live in the app).
-- Replaces the v1 11-category list. The runner re-applies every file each db:migrate,
-- so this is written to be re-runnable: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is
-- idempotent, and the remap UPDATEs are no-ops once the removed values are gone.
--
-- Order matters: drop the old CHECK first so the remap can write target values that the
-- OLD list disallowed, remap the removed categories, then add the new CHECK. The v1
-- inline checks are anonymous; Postgres auto-names a single column check
-- <table>_category_check, which is what we drop/re-add here.
ALTER TABLE items    DROP CONSTRAINT IF EXISTS items_category_check;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_category_check;

-- Remap removed categories to the closest survivor (no category constraint active here).
UPDATE items    SET category = 'electronics' WHERE category = 'photo';
UPDATE items    SET category = 'other'       WHERE category IN ('bikes','music','sports','toys');
UPDATE requests SET category = 'electronics' WHERE category = 'photo';
UPDATE requests SET category = 'other'       WHERE category IN ('bikes','music','sports','toys');

ALTER TABLE items    ADD CONSTRAINT items_category_check    CHECK (category IN ('furniture','kitchen','electronics','home','books','clothing','free','other'));
ALTER TABLE requests ADD CONSTRAINT requests_category_check CHECK (category IN ('furniture','kitchen','electronics','home','books','clothing','free','other'));
