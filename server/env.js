// Boot-time environment validation. Fail fast on a misconfigured deploy instead
// of throwing a 500 later at request time (e.g. JWT_SECRET only surfaced at the
// first login). validateEnv() runs once when the app is built (createApp), so
// both the Vercel cold start and the local dev server refuse to come up if a
// required secret is missing. See the deploy checklist in .env.example.

// Hard requirements — the app cannot function without these, in any environment.
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

// A short secret is trivially brute-forced; the project generates a 64-char
// random value, so anything well below that is almost certainly a mistake.
const MIN_JWT_SECRET_LEN = 32;

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const problems = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) problems.push(`${key} is not set`);
  }

  const secret = process.env.JWT_SECRET;
  if (secret && secret.length < MIN_JWT_SECRET_LEN) {
    problems.push(`JWT_SECRET is too short (${secret.length} chars; need ≥ ${MIN_JWT_SECRET_LEN})`);
  }

  if (problems.length) {
    throw new Error(
      `Invalid environment configuration:\n  - ${problems.join('\n  - ')}\n` +
        'Set these in .env (local) or the Vercel project settings (deploy). See .env.example.'
    );
  }

  // Email delivery is required for real signups in production, but a missing key
  // shouldn't take the whole site down — browsing still works. Warn loudly at
  // boot (visible in Vercel logs); deliverCode() itself throws if it's actually
  // asked to send without a key, so signup fails loudly rather than silently.
  if (isProd && !process.env.RESEND_API_KEY) {
    console.error(
      '[env] WARNING: RESEND_API_KEY is not set in production — ' +
        'verification emails cannot be sent and signup will fail.'
    );
  }
}
