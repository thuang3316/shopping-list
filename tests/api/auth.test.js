import request from 'supertest';
import { sql } from '../../server/db.js';
import { app, resetDb, uniqueCreds, latestCode, registerVerifiedUser } from '../helpers/harness.js';

// Use the manual mock (server/__mocks__/email.js) so verification codes are
// captured instead of emailed.
vi.mock('../../server/email.js');

beforeEach(async () => { await resetDb(); });

const hasHttpOnlyCookie = (res) =>
  (res.headers['set-cookie'] || []).some((c) => /^token=/.test(c) && /HttpOnly/i.test(c));

describe('POST /api/auth/signup', () => {
  it('creates an unverified account and returns 201', async () => {
    const creds = uniqueCreds();
    const res = await request(app).post('/api/auth/signup').send(creds);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true, email: creds.email });
    const [row] = await sql`SELECT email_verified FROM users WHERE email = ${creds.email}`;
    expect(row.email_verified).toBe(false);
  });

  it('rejects a username shorter than 3 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ username: 'ab' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 3 characters/i);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ password: 'short' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  it('rejects a common breached password', async () => {
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ password: 'password123' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too common/i);
  });

  it('stores the password hashed, never in plaintext', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201);
    const [row] = await sql`SELECT password_hash FROM users WHERE email = ${creds.email}`;
    expect(row.password_hash).not.toBe(creds.password);
    expect(row.password_hash).toMatch(/^\$2[aby]\$/); // bcrypt
  });

  it('returns 409 when the email already belongs to a verified account', async () => {
    const { email } = await registerVerifiedUser();
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ email }));
    expect(res.status).toBe(409);
  });

  it('returns 409 when the username already belongs to a verified account', async () => {
    const { username } = await registerVerifiedUser();
    const res = await request(app).post('/api/auth/signup').send(uniqueCreds({ username }));
    expect(res.status).toBe(409);
  });

  it('allows re-signup over an UNVERIFIED account with the same email', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201); // unverified
    const res = await request(app).post('/api/auth/signup').send({ ...creds, username: `${creds.username}_2` });
    expect(res.status).toBe(201);
  });

  it('allows re-signup over an UNVERIFIED account with the same username', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201);
    const res = await request(app).post('/api/auth/signup').send({ ...creds, email: `other_${creds.email}` });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/auth/verify', () => {
  it('verifies the account and sets an httpOnly cookie on a correct code', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201);
    const res = await request(app).post('/api/auth/verify').send({ email: creds.email, code: latestCode(creds.email) });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: creds.username, email: creds.email, email_verified: true });
    expect(hasHttpOnlyCookie(res)).toBe(true);
  });

  it('rejects an incorrect code with 400', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201);
    const res = await request(app).post('/api/auth/verify').send({ email: creds.email, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('returns 429 after too many incorrect attempts', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201);
    const wrong = () => request(app).post('/api/auth/verify').send({ email: creds.email, code: '999999' });
    for (let i = 0; i < 5; i++) await wrong().expect(400);
    await wrong().expect(429);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and sets an httpOnly cookie', async () => {
    const { email, password, username } = await registerVerifiedUser();
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username, email });
    expect(hasHttpOnlyCookie(res)).toBe(true);
  });

  it('returns an identical generic 401 for a wrong password and an unknown email', async () => {
    const { email, password } = await registerVerifiedUser();
    const wrongPw = await request(app).post('/api/auth/login').send({ email, password: `${password}x` });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@test.dev', password });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body).toEqual(unknown.body); // no account-enumeration signal
  });

  it('returns 403 needsVerification for an unverified account', async () => {
    const creds = uniqueCreds();
    await request(app).post('/api/auth/signup').send(creds).expect(201); // not verified
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ needsVerification: true, email: creds.email });
  });
});

describe('password reset', () => {
  it('responds 200 generically whether or not the email exists', async () => {
    const { email } = await registerVerifiedUser();
    const known = await request(app).post('/api/auth/forgot').send({ email });
    const unknown = await request(app).post('/api/auth/forgot').send({ email: 'nobody@test.dev' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('sends a reset code only for a verified account', async () => {
    const verified = await registerVerifiedUser();
    const unverified = uniqueCreds();
    await request(app).post('/api/auth/signup').send(unverified).expect(201);

    await request(app).post('/api/auth/forgot').send({ email: verified.email }).expect(200);
    await request(app).post('/api/auth/forgot').send({ email: unverified.email }).expect(200);

    expect(latestCode(verified.email, 'reset')).toBeDefined();
    expect(latestCode(unverified.email, 'reset')).toBeUndefined();
  });

  it('resets the password with a valid code: old password stops working, new one logs in', async () => {
    const { email, password } = await registerVerifiedUser();
    await request(app).post('/api/auth/forgot').send({ email }).expect(200);
    const newPassword = 'brand-new-passphrase-7';
    await request(app).post('/api/auth/reset').send({ email, code: latestCode(email, 'reset'), password: newPassword }).expect(200);

    await request(app).post('/api/auth/login').send({ email, password }).expect(401);
    await request(app).post('/api/auth/login').send({ email, password: newPassword }).expect(200);
  });

  it('rejects a reset with a wrong code', async () => {
    const { email } = await registerVerifiedUser();
    await request(app).post('/api/auth/forgot').send({ email }).expect(200);
    const res = await request(app).post('/api/auth/reset').send({ email, code: '000000', password: 'brand-new-passphrase-7' });
    expect(res.status).toBe(400);
  });

  it('rejects a reset to a common breached password', async () => {
    const { email } = await registerVerifiedUser();
    await request(app).post('/api/auth/forgot').send({ email }).expect(200);
    const res = await request(app).post('/api/auth/reset').send({ email, code: latestCode(email, 'reset'), password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too common/i);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user:null without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('returns the current user with a valid cookie', async () => {
    const { agent, username } = await registerVerifiedUser();
    const res = await agent.get('/api/auth/me');
    expect(res.body.user).toMatchObject({ username });
  });

  it('returns user:null (never 500) for a garbage token cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not-a-real-jwt');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});
