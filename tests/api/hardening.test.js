import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

describe('security headers', () => {
  it('locks down headers and hides the framework on API responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('internal errors do not leak details', () => {
  it('returns a generic 500 (no SQL/stack) when a DB constraint is violated', async () => {
    // price 100000000 overflows NUMERIC(10,2) → unhandled DB error → 500.
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/items').send({ title: 'Overflow', category: 'other', price: 100000000 });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Server error' });
    expect(JSON.stringify(res.body)).not.toMatch(/numeric|overflow|column|relation/i);
  });
});

describe('SQL injection is neutralized by parameterized queries', () => {
  it('stores an injection-pattern title literally and keeps the table intact', async () => {
    const { agent } = await registerVerifiedUser();
    const nasty = "'); DROP TABLE items;--";
    const id = (await agent.post('/api/items').send({ title: nasty, category: 'other', price: 5 })).body.id;

    const res = await request(app).get(`/api/items/${id}`);
    expect(res.body.item.title).toBe(nasty);
    // the items table still exists and is writable
    await agent.post('/api/items').send({ title: 'Still works', category: 'other', price: 5 }).expect(201);
  });
});
