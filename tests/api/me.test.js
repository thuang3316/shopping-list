import request from 'supertest';
import { app, resetDb, registerVerifiedUser, latestCode } from '../helpers/harness.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

describe('GET /api/me/* — auth required', () => {
  it('returns 401 for /me/items without a cookie', async () => {
    await request(app).get('/api/me/items').expect(401);
  });

  it('returns 401 for /me/requests without a cookie', async () => {
    await request(app).get('/api/me/requests').expect(401);
  });

  it('returns only the current user\'s items (including sold)', async () => {
    const me = await registerVerifiedUser();
    const soldId = (await me.agent.post('/api/items').send({ title: 'Mine Sold', category: 'other', price: 5 })).body.id;
    await me.agent.post('/api/items').send({ title: 'Mine Available', category: 'other', price: 5 }).expect(201);
    await me.agent.patch(`/api/items/${soldId}`).send({ status: 'sold' }).expect(200);

    const other = await registerVerifiedUser();
    await other.agent.post('/api/items').send({ title: 'Theirs', category: 'other', price: 5 }).expect(201);

    const res = await me.agent.get('/api/me/items');
    const titles = res.body.items.map((i) => i.title).sort();
    expect(titles).toEqual(['Mine Available', 'Mine Sold']);
  });

  it('returns only the current user\'s requests', async () => {
    const me = await registerVerifiedUser();
    await me.agent.post('/api/requests').send({ title: 'Want a desk', category: 'furniture' }).expect(201);
    const other = await registerVerifiedUser();
    await other.agent.post('/api/requests').send({ title: 'Want a bike', category: 'electronics' }).expect(201);

    const res = await me.agent.get('/api/me/requests');
    expect(res.body.requests.map((r) => r.title)).toEqual(['Want a desk']);
  });
});

describe('PATCH /api/me/profile', () => {
  it('updates the username and phone', async () => {
    const me = await registerVerifiedUser();
    const res = await me.agent.patch('/api/me/profile').send({ username: 'renamed_jane', phone: '555-0100' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'renamed_jane', phone: '555-0100' });
  });

  it('requires the correct current password to change the password', async () => {
    const me = await registerVerifiedUser();
    const res = await me.agent.patch('/api/me/profile').send({ current_password: 'wrong', new_password: 'a-fresh-password-9' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/current password is incorrect/i);
  });

  it('flips email_verified off and sends a code when the email changes', async () => {
    const me = await registerVerifiedUser();
    const newEmail = `changed_${me.email}`;
    const res = await me.agent.patch('/api/me/profile').send({ email: newEmail });
    expect(res.status).toBe(200);
    expect(res.body.emailChanged).toBe(true);
    expect(res.body.user.email_verified).toBe(false);
    expect(latestCode(newEmail, 'signup')).toBeDefined();
  });

  it('returns 409 when changing the username to one already taken', async () => {
    const existing = await registerVerifiedUser();
    const me = await registerVerifiedUser();
    const res = await me.agent.patch('/api/me/profile').send({ username: existing.username });
    expect(res.status).toBe(409);
  });

  it('returns 400 when nothing changed', async () => {
    const me = await registerVerifiedUser();
    const res = await me.agent.patch('/api/me/profile').send({ username: me.username, phone: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no changes/i);
  });
});

describe('DELETE /api/me', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).delete('/api/me').send({ password: 'whatever' }).expect(401);
  });

  it('returns 400 and keeps the account when the password is wrong', async () => {
    const me = await registerVerifiedUser();
    const res = await me.agent.delete('/api/me').send({ password: 'not-my-password' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password is incorrect/i);
    // Still signed in / account intact.
    const after = await me.agent.get('/api/auth/me');
    expect(after.body.user).toMatchObject({ username: me.username });
  });

  it('deletes the account and cascades the user\'s items and requests', async () => {
    const me = await registerVerifiedUser();
    const itemId = (await me.agent.post('/api/items').send({ title: 'My Lamp', category: 'home', price: 12 })).body.id;
    await me.agent.post('/api/requests').send({ title: 'Want a chair', category: 'furniture' }).expect(201);

    await me.agent.delete('/api/me').send({ password: me.password }).expect(200);

    // Session cleared.
    const meRes = await me.agent.get('/api/auth/me');
    expect(meRes.body.user).toBeNull();
    // Item gone (cascade).
    await request(app).get(`/api/items/${itemId}`).expect(404);
    // Request gone from the public feed (cascade).
    const feed = await request(app).get('/api/requests');
    expect(feed.body.requests).toEqual([]);
  });

  it('leaves other users\' data intact', async () => {
    const me = await registerVerifiedUser();
    const other = await registerVerifiedUser();
    const otherItemId = (await other.agent.post('/api/items').send({ title: 'Their Bike', category: 'electronics', price: 80 })).body.id;

    await me.agent.delete('/api/me').send({ password: me.password }).expect(200);

    const res = await request(app).get(`/api/items/${otherItemId}`);
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ title: 'Their Bike' });
  });
});
