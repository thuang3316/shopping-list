// Apply migrations to the Neon TEST branch. Run with: npm run db:migrate:test
// Reads TEST_DATABASE_URL from .env.test and points DATABASE_URL at it BEFORE
// importing migrate.js (whose `import 'dotenv/config'` won't override an
// already-set var), so the same migration logic runs against the test branch.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

if (!process.env.TEST_DATABASE_URL) {
  console.error('[migrate:test] TEST_DATABASE_URL is not set. Create .env.test with the Neon test-branch URL.');
  process.exit(1);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

await import('./migrate.js');
