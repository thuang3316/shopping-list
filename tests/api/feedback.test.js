import request from 'supertest';
import { app, resetDb, registerVerifiedUser } from '../helpers/harness.js';
import { sql } from '../../server/db.js';
import { deliverFeedback, __feedback } from '../../server/email.js';

vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

// Rows the feedback POST stored, newest first.
const storedFeedback = () => sql`SELECT * FROM feedback ORDER BY id DESC`;

describe('POST /api/feedback', () => {
  it('returns 401 when not authenticated', async () => {
    await request(app).post('/api/feedback').send({ category: 'bug', message: 'Hi' }).expect(401);
  });

  it('stores the feedback and returns 201 for a signed-in user', async () => {
    const { agent, username, email } = await registerVerifiedUser();
    const res = await agent.post('/api/feedback').send({ category: 'idea', message: 'Add dark mode please' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });

    const rows = await storedFeedback();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      category: 'idea',
      message: 'Add dark mode please',
      username,
      email,
    });
  });

  it('emails the owner with the sender identity', async () => {
    const { agent, username, email } = await registerVerifiedUser();
    await agent.post('/api/feedback').send({ category: 'bug', message: 'Search is broken' }).expect(201);

    expect(__feedback).toHaveLength(1);
    expect(__feedback[0]).toEqual({
      category: 'bug',
      message: 'Search is broken',
      fromUsername: username,
      fromEmail: email,
    });
  });

  it('still returns 201 and stores the row when the owner email fails', async () => {
    const { agent } = await registerVerifiedUser();
    deliverFeedback.mockRejectedValueOnce(new Error('resend is down'));

    await agent.post('/api/feedback').send({ category: 'other', message: 'A note' }).expect(201);

    const rows = await storedFeedback();
    expect(rows.map((r) => r.message)).toEqual(['A note']);
  });

  it('rejects an empty message', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/feedback').send({ category: 'bug', message: '' });
    expect(res.status).toBe(400);
    expect(await storedFeedback()).toHaveLength(0);
  });

  it('rejects a whitespace-only message', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/feedback').send({ category: 'bug', message: '    ' });
    expect(res.status).toBe(400);
    expect(await storedFeedback()).toHaveLength(0);
  });

  it('rejects a message longer than 2000 characters', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/feedback').send({ category: 'bug', message: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too long/i);
    expect(await storedFeedback()).toHaveLength(0);
  });

  it('rejects an invalid category', async () => {
    const { agent } = await registerVerifiedUser();
    const res = await agent.post('/api/feedback').send({ category: 'praise', message: 'Nice app' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid category/i);
    expect(await storedFeedback()).toHaveLength(0);
  });

  it('stores an injection-pattern message literally', async () => {
    const { agent } = await registerVerifiedUser();
    const evil = "'); DROP TABLE feedback;--";
    await agent.post('/api/feedback').send({ category: 'other', message: evil }).expect(201);

    const rows = await storedFeedback();
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe(evil);
  });
});
