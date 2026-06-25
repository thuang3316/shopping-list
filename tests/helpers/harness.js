// Shared API-test helpers: the app under test, DB reset, unique credentials, and
// a signup→verify flow that returns an authenticated supertest agent.
//
// NOTE: every API test file must call `vi.mock('../../server/email.js')` at the
// top so the manual mock (server/__mocks__/email.js) is active — that's what
// captures the verification codes this helper reads.
import request from 'supertest';
import { sql } from '../../server/db.js';
import { createApp } from '../../server/app.js';
import { __codes, __feedback } from '../../server/email.js';

export const app = createApp();

// Wipe all mutable tables + the captured emails. Call in beforeEach.
export async function resetDb() {
  await sql`TRUNCATE users, items, requests, email_verifications, rate_limits, feedback RESTART IDENTITY CASCADE`;
  __codes.length = 0;
  __feedback.length = 0;
}

let seq = 0;
export function uniqueCreds(overrides = {}) {
  seq += 1;
  const tag = `${Date.now().toString(36)}_${seq}`;
  return { username: `user_${tag}`, email: `user_${tag}@test.dev`, password: 'sup3r-secret-pw', ...overrides };
}

// The most recent code emailed to `email` for `purpose` (codes are captured by
// the email mock). Used to drive verify/reset flows.
export function latestCode(email, purpose = 'signup') {
  const entry = [...__codes].reverse().find(
    (c) => c.email.toLowerCase() === email.toLowerCase() && c.purpose === purpose,
  );
  return entry?.code;
}

// Sign up + verify a fresh user; returns { agent (logged-in), username, email, password }.
export async function registerVerifiedUser(overrides = {}) {
  const creds = uniqueCreds(overrides);
  const agent = request.agent(app);
  await agent.post('/api/auth/signup').send(creds).expect(201);
  const code = latestCode(creds.email, 'signup');
  if (!code) throw new Error('no signup code captured — did the test vi.mock("../../server/email.js")?');
  await agent.post('/api/auth/verify').send({ email: creds.email, code }).expect(200);
  return { agent, ...creds };
}
