import request from 'supertest';
import { app, resetDb } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

// Login is limited to 10 / 15 min per client IP. Bad credentials still count
// (the limiter runs before the handler), so we can probe with junk logins.
// We set X-Real-IP — the header Vercel populates with the true client IP in prod
// (and what the limiter's clientIp() reads first).
const login = (ip) =>
  request(app).post('/api/auth/login').set('X-Real-IP', ip).send({ email: 'x@y.z', password: 'whatever' });

describe('rate limiting on /api/auth/login', () => {
  it('allows up to the limit, then returns 429 with a Retry-After header', async () => {
    const ip = '203.0.113.10';
    for (let i = 0; i < 10; i++) await login(ip).expect(401);
    const res = await login(ip);
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('isolates the limit per client IP', async () => {
    const ipA = '203.0.113.20';
    for (let i = 0; i < 11; i++) await login(ipA);
    await login(ipA).expect(429);
    await login('203.0.113.21').expect(401); // a different IP is unaffected
  });
});
