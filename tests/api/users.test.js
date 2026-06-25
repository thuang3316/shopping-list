import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

describe('GET /api/users/:username — member profile (auth required)', () => {
  it('returns 401 when not authenticated', async () => {
    const { username } = await registerVerifiedUser();
    await request(app).get(`/api/users/${username}`).expect(401);
  });

  it('returns the member with their items and requests for a signed-in viewer', async () => {
    const seller = await registerVerifiedUser();
    await seller.agent.post('/api/items').send({ title: 'For sale', category: 'other', price: 5 }).expect(201);
    await seller.agent.post('/api/requests').send({ title: 'Wanted', category: 'other' }).expect(201);
    const viewer = await registerVerifiedUser();

    const res = await viewer.agent.get(`/api/users/${seller.username}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(seller.username);
    expect(res.body.items.map((i) => i.title)).toEqual(['For sale']);
    expect(res.body.requests.map((r) => r.title)).toEqual(['Wanted']);
  });

  it('includes the seller email and phone for a signed-in viewer', async () => {
    const seller = await registerVerifiedUser({ phone: '555-0100' });
    const viewer = await registerVerifiedUser();

    const res = await viewer.agent.get(`/api/users/${seller.username}`);
    expect(res.body.user.email).toBe(seller.email);
    expect(res.body.user.phone).toBe('555-0100');
  });

  it('never exposes password_hash', async () => {
    const seller = await registerVerifiedUser();
    const viewer = await registerVerifiedUser();

    const res = await viewer.agent.get(`/api/users/${seller.username}`);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash/);
  });

  it('returns only available items', async () => {
    const seller = await registerVerifiedUser();
    const soldId = (await seller.agent.post('/api/items').send({ title: 'Sold', category: 'other', price: 5 })).body.id;
    await seller.agent.post('/api/items').send({ title: 'Available', category: 'other', price: 5 }).expect(201);
    await seller.agent.patch(`/api/items/${soldId}`).send({ status: 'sold' }).expect(200);
    const viewer = await registerVerifiedUser();

    const res = await viewer.agent.get(`/api/users/${seller.username}`);
    expect(res.body.items.map((i) => i.title)).toEqual(['Available']);
  });

  it('returns 404 for an unknown username', async () => {
    const viewer = await registerVerifiedUser();
    const res = await viewer.agent.get('/api/users/nobody_here');
    expect(res.status).toBe(404);
  });

  it('matches the username case-insensitively', async () => {
    const seller = await registerVerifiedUser();
    const viewer = await registerVerifiedUser();

    const res = await viewer.agent.get(`/api/users/${seller.username.toUpperCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(seller.username);
  });
});
