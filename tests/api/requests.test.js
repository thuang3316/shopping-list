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
    await agent.post('/api/requests').send({ title: 'Want a laptop', category: 'electronics' }).expect(201);
    const res = await request(app).get('/api/requests?category=electronics');
    expect(res.body.requests.map((r) => r.title)).toEqual(['Want a laptop']);
  });
});

describe('POST /api/requests', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).post('/api/requests').send({ title: 'X', category: 'other' }).expect(401);
  });

  it('creates a request and returns its id', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/requests').send({ title: 'Want a tent', category: 'other', price_min: 20, price_max: 80 });
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

describe('DELETE /api/requests/:id', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).delete('/api/requests/1').expect(401);
  });

  it('returns 404 for a non-numeric id', async () => {
    const { agent } = await registerVerifiedUser();
    await agent.delete('/api/requests/abc').expect(404);
  });

  it('deletes the caller\'s own request and removes it from the feed', async () => {
    const { agent } = await registerVerifiedUser();
    const id = (await agent.post('/api/requests').send({ title: 'Want a kettle', category: 'home' })).body.id;
    await agent.delete(`/api/requests/${id}`).expect(200);
    const res = await request(app).get('/api/requests');
    expect(res.body.requests).toEqual([]);
  });

  it('returns 404 when deleting another user\'s request and leaves it intact', async () => {
    const owner = await registerVerifiedUser();
    const id = (await owner.agent.post('/api/requests').send({ title: 'Want a tent', category: 'other' })).body.id;
    const other = await registerVerifiedUser();

    await other.agent.delete(`/api/requests/${id}`).expect(404);

    const res = await request(app).get('/api/requests');
    expect(res.body.requests.map((r) => r.title)).toEqual(['Want a tent']);
  });
});
