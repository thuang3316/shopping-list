import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

describe('GET /api/users/:username — public profile', () => {
  it('returns the member with their items and requests', async () => {
    const { agent, username } = await registerVerifiedUser();
    await agent.post('/api/items').send({ title: 'For sale', category: 'other', price: 5 }).expect(201);
    await agent.post('/api/requests').send({ title: 'Wanted', category: 'other' }).expect(201);

    const res = await request(app).get(`/api/users/${username}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(username);
    expect(res.body.items.map((i) => i.title)).toEqual(['For sale']);
    expect(res.body.requests.map((r) => r.title)).toEqual(['Wanted']);
  });

  it('never exposes email or password_hash', async () => {
    const { agent, username } = await registerVerifiedUser();
    await agent.post('/api/items').send({ title: 'For sale', category: 'other', price: 5 }).expect(201);
    const res = await request(app).get(`/api/users/${username}`);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/password_hash/);
    expect(serialized).not.toMatch(/@test\.dev/); // the user's email would contain this
    expect(res.body.user).not.toHaveProperty('email');
  });

  it('returns only available items', async () => {
    const { agent, username } = await registerVerifiedUser();
    const soldId = (await agent.post('/api/items').send({ title: 'Sold', category: 'other', price: 5 })).body.id;
    await agent.post('/api/items').send({ title: 'Available', category: 'other', price: 5 }).expect(201);
    await agent.patch(`/api/items/${soldId}`).send({ status: 'sold' }).expect(200);

    const res = await request(app).get(`/api/users/${username}`);
    expect(res.body.items.map((i) => i.title)).toEqual(['Available']);
  });

  it('returns 404 for an unknown username', async () => {
    const res = await request(app).get('/api/users/nobody_here');
    expect(res.status).toBe(404);
  });

  it('matches the username case-insensitively', async () => {
    const { username } = await registerVerifiedUser();
    const res = await request(app).get(`/api/users/${username.toUpperCase()}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(username);
  });
});
