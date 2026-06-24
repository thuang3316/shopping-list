import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';

vi.mock('../../server/email.js');
// Avoid hitting Vercel Blob in the upload test.
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.test/photo.jpg' }) }));

beforeEach(async () => { await resetDb(); });

// Create a listing for `agent`; returns its id.
async function createItem(agent, body = {}) {
  const res = await agent.post('/api/items').send({ title: 'A Thing', category: 'furniture', price: 25, ...body });
  return res.body.id;
}

describe('GET /api/items', () => {
  it('returns only available listings', async () => {
    const { agent } = await registerVerifiedUser();
    const soldId = await createItem(agent, { title: 'Sold Thing' });
    await createItem(agent, { title: 'Available Thing' });
    await agent.patch(`/api/items/${soldId}`).send({ status: 'sold' }).expect(200);

    const res = await request(app).get('/api/items');
    const titles = res.body.items.map((i) => i.title);
    expect(titles).toContain('Available Thing');
    expect(titles).not.toContain('Sold Thing');
  });

  it('filters by category', async () => {
    const { agent } = await registerVerifiedUser();
    await createItem(agent, { title: 'Couch', category: 'furniture' });
    await createItem(agent, { title: 'Road Bike', category: 'bikes' });
    const res = await request(app).get('/api/items?category=bikes');
    expect(res.body.items.map((i) => i.title)).toEqual(['Road Bike']);
  });
});

describe('GET /api/items/:id — seller contact gating', () => {
  it('returns 404 for a non-numeric id', async () => {
    await request(app).get('/api/items/abc').expect(404);
  });

  it('returns 404 for a missing id', async () => {
    await request(app).get('/api/items/99999999').expect(404);
  });

  it('omits seller email/phone for a logged-out viewer', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    const res = await request(app).get(`/api/items/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.item.seller).not.toHaveProperty('email');
    expect(res.body.item.seller).not.toHaveProperty('phone');
    expect(res.body.item.is_owner).toBe(false);
  });

  it('includes the seller email for a logged-in viewer', async () => {
    const seller = await registerVerifiedUser();
    const id = await createItem(seller.agent);
    const viewer = await registerVerifiedUser();
    const res = await viewer.agent.get(`/api/items/${id}`);
    expect(res.body.item.seller.email).toBe(seller.email);
  });

  it('marks is_owner true only for the owner', async () => {
    const seller = await registerVerifiedUser();
    const id = await createItem(seller.agent);
    const owner = await seller.agent.get(`/api/items/${id}`);
    const other = (await registerVerifiedUser()).agent;
    const stranger = await other.get(`/api/items/${id}`);
    expect(owner.body.item.is_owner).toBe(true);
    expect(stranger.body.item.is_owner).toBe(false);
  });
});

describe('POST /api/items', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).post('/api/items').send({ title: 'X', category: 'other' }).expect(401);
  });

  it('creates a listing owned by the current user', async () => {
    const { agent, username } = await registerVerifiedUser();
    const id = await createItem(agent, { title: 'My Lamp' });
    const res = await request(app).get(`/api/items/${id}`);
    expect(res.body.item.title).toBe('My Lamp');
    expect(res.body.item.seller.username).toBe(username);
  });

  it('rejects a missing title', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/items').send({ category: 'other' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title is required/i);
  });

  it('rejects a title longer than 200 characters', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/items').send({ title: 'x'.repeat(201), category: 'other' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid category', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/items').send({ title: 'X', category: 'spaceships' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid category/i);
  });

  it('rejects a negative price', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/items').send({ title: 'X', category: 'other', price: -5 });
    expect(res.status).toBe(400);
  });

  it('stores a blank price as Negotiable (null)', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent, { price: '' });
    const res = await request(app).get(`/api/items/${id}`);
    expect(res.body.item.price).toBeNull();
  });
});

describe('PATCH /api/items/:id — ownership', () => {
  it('updates the owner\'s listing', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    await agent.patch(`/api/items/${id}`).send({ title: 'Renamed' }).expect(200);
    const res = await request(app).get(`/api/items/${id}`);
    expect(res.body.item.title).toBe('Renamed');
  });

  it('returns 404 (not 403) when editing another user\'s listing', async () => {
    const owner = await registerVerifiedUser();
    const id = await createItem(owner.agent);
    const attacker = await registerVerifiedUser();
    const res = await attacker.agent.patch(`/api/items/${id}`).send({ title: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid status', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    const res = await agent.patch(`/api/items/${id}`).send({ status: 'gone' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no updatable fields are sent', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    const res = await agent.patch(`/api/items/${id}`).send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/items/:id — ownership', () => {
  it('deletes the owner\'s listing', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    await agent.delete(`/api/items/${id}`).expect(200);
    await request(app).get(`/api/items/${id}`).expect(404);
  });

  it('returns 404 when deleting another user\'s listing', async () => {
    const owner = await registerVerifiedUser();
    const id = await createItem(owner.agent);
    const attacker = await registerVerifiedUser();
    await attacker.agent.delete(`/api/items/${id}`).expect(404);
    // still there for the owner
    await request(app).get(`/api/items/${id}`).expect(200);
  });

  it('returns 401 when not authenticated', async () => {
    const { agent } = await registerVerifiedUser();
    const id = await createItem(agent);
    await request(app).delete(`/api/items/${id}`).expect(401);
  });
});
