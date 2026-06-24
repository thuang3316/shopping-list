// API-project setup file (runs before each API test file in the worker, before
// the test file's imports are evaluated). Points DATABASE_URL at the Neon TEST
// branch and supplies a JWT secret, so server/db.js and createApp()'s
// validateEnv() see a valid environment. See guides/testing.md.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Create .env.test with the Neon test-branch connection ' +
      'string, then run `npm run db:migrate:test`. See guides/testing.md.',
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret-0123456789ab';
process.env.NODE_ENV = 'test'; // not 'production' → email is dev-mock (and we mock it anyway)
