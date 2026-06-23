// Shared account + email-verification helpers, used by both the auth routes
// (signup/verify) and the profile-edit route (/api/me/profile). Centralizes the
// password blocklist and the verification-code lifecycle so they stay in sync.
import crypto from 'node:crypto';
import { sql } from './db.js';
import { deliverCode } from './email.js';

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5; // wrong guesses before a code is invalidated

export const hashCode = (c) => crypto.createHash('sha256').update(c).digest('hex');
export const genCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

// Reject the most common breached passwords (these trigger browser
// leaked-password warnings and are trivially guessable). A small blocklist is
// proportionate for v1; a full Have I Been Pwned k-anonymity check is a future option.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'passw0rd', '123456', '1234567', '12345678',
  '123456789', '1234567890', '12345', '123123', '111111', '000000', 'qwerty', 'qwerty123',
  'abc123', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'starwars', 'whatever', 'trustno1',
]);
export const isCommonPassword = (pw) => COMMON_PASSWORDS.has(pw.toLowerCase());

// Issue a fresh verification code for an email and deliver it. In dev (or with
// no RESEND_API_KEY) deliverCode just logs the code to the server console.
export async function createAndSendCode(email) {
  const code = genCode();
  const expires = new Date(Date.now() + CODE_TTL_MS);
  await sql`INSERT INTO email_verifications (email, code, expires_at) VALUES (${email}, ${hashCode(code)}, ${expires})`;
  await deliverCode(email, code);
}
