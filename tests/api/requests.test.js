import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

describe('GET /api/requests', () => {
  it('returns requests with the buyer username', async () => {
    const { agent, username } = await registerVerifiedUser();
    await agent.post('/api/requests').send({ title: 'Want a monitor', category: 'electronics' }).expect(201);
    const res = await request(app).get('/api/requests');
    expect(res.body.requests[0]).toMatchObject({ title: 'Want a monitor', buyer: username });
  });

  it('filters by category', async () => {
    const { agent } = await registerVerifiedUser();
    await agent.post('/api/requests').send({ title: 'Want a sofa', category: 'furniture' }).expect(201);
    await agent.post('/api/requests').send({ title: 'Want a helmet', category: 'bikes' }).expect(201);
    const res = await request(app).get('/api/requests?category=bikes');
    expect(res.body.requests.map((r) => r.title)).toEqual(['Want a helmet']);
  });
});

describe('POST /api/requests', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).post('/api/requests').send({ title: 'X', category: 'other' }).expect(401);
  });

  it('creates a request and returns its id', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ title: 'Want a tent', category: 'sports', price_min: 20, price_max: 80 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('rejects a missing title', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ category: 'other' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid category', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ title: 'X', category: 'spaceships' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid category/i);
  });

  it('rejects price_min greater than price_max', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ title: 'X', category: 'other', price_min: 100, price_max: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot exceed/i);
  });

  it('rejects a negative price', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ title: 'X', category: 'other', price_min: -5 });
    expect(res.status).toBe(400);
  });

  it('stores blank prices as null', async () => {
    const { agent } = await registerVerifiedUser();
    await agent.post('/api/requests').send({ title: 'Open budget', category: 'other', price_min: '', price_max: '' }).expect(201);
    const res = await request(app).get('/api/requests');
    expect(res.body.requests[0]).toMatchObject({ price_min: null, price_max: null });
  });
});
