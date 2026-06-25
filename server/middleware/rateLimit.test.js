import { rateLimit } from './rateLimit.js';

// Make the DB throw so we can verify the limiter's fail-open behavior without a
// real database. (Integration tests cover the happy path against Neon.)
vi.mock('../db.js', () => {
  const boom = () => { throw new Error('db down'); };
  return { sql: Object.assign(boom, { query: boom }) };
});

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

describe('rateLimit middleware', () => {
  it('fails open (calls next, returns no 429) when the database throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mw = rateLimit({ name: 'test', limit: 1, windowMs: 1000 });
    const req = { headers: { 'x-real-ip': '1.2.3.4' }, socket: {} };
    const res = mockRes();
    const next = vi.fn();

    await mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
  });
});
