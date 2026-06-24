import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Local runs read the test-branch URL from .env.test; CI supplies it via job env.
dotenv.config({ path: '.env.test' });

// E2E runs against a real browser + the full app (Vite + Express dev server),
// pointed at the isolated Neon test branch. It's the only layer that exercises
// responsive layout (e.g. the mobile nav). Runs nightly/on-demand, not in the
// blocking gate. See guides/testing.md.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    // Pixel 5 is a ~393px mobile viewport on Chromium (not WebKit), so the suite
    // needs only the Chromium browser — matching the CI install.
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /mobile\.spec\.js/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testMatch: /desktop\.spec\.js/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Isolate E2E on the test branch (dev.js's dotenv won't override an
      // already-set var) and supply a secret so the API boots without .env.
      ...(process.env.TEST_DATABASE_URL ? { DATABASE_URL: process.env.TEST_DATABASE_URL } : {}),
      JWT_SECRET: process.env.JWT_SECRET || 'e2e-jwt-secret-e2e-jwt-secret-0123456789ab',
    },
  },
});
