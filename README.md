# Swap

A peer-to-peer marketplace for buying and selling used items locally. Sign up with an
email-verified account, list things you no longer need, browse and filter what others are
selling, post "wanted" requests for things you're looking for, and **contact sellers directly
to negotiate** — there are no in-app payments, and messaging is deferred to v2 (for now the
seller's contact details are shown on the item page to signed-in users).

Live at **[hereweswap.com](https://hereweswap.com)**.

## Features

- **Email-verified accounts** — signup issues a 6-digit code; password reset and email-change
  re-verification use the same flow. Passwords are bcrypt-hashed and screened against a
  common-password blocklist.
- **Listings** — create items with photos (Vercel Blob), price (or "Negotiable"), category,
  description, and an optional due date. Edit, mark sold, or delete your own.
- **Browse & filter** — search by keyword, filter by category and price range, and sort, all
  client-side for instant, shareable filtered URLs.
- **Buy requests** — post what you're looking for; others can browse the request feed.
- **Public profiles** — `/u/:username` shows a member's available listings and open requests.
- **Gated seller contact** — a seller's email/phone is only revealed to signed-in viewers.
- **Account & data control** — delete individual listings/requests, or delete your account
  entirely (cascades to all your data).

## Tech stack

- **Frontend:** React 19, React Router 7, Tailwind CSS v4 (via the Vite plugin), built with Vite.
- **Backend:** Express 5 as a single app exported via `createApp()`, deployed as a Vercel
  serverless function. No `app.listen()` in production.
- **Database:** Neon Postgres, accessed over the HTTP driver (`@neondatabase/serverless`) with
  parameterized tagged-template queries.
- **Auth:** stateless JWT in an httpOnly cookie.
- **Email:** Resend in production; a console-logging mock in local dev.
- **Images:** Vercel Blob.
- **Hosting:** Vercel.

## Architecture

One Express app, two entry points:

- `server/app.js` exports `createApp()` — builds the app (middleware + routers + error handler)
  but never listens.
- `api/index.js` — the Vercel serverless entry (`export default createApp()`); Vercel routes
  `/api/*` here.
- `server/dev.js` — local-only, calls `createApp().listen(3001)` and loads `.env`.

`vercel.json` routes `/api/*` to the function and rewrites everything else to `index.html`
(SPA fallback), and sets the security headers (CSP, HSTS, nosniff, frame-deny, etc.).

```
api/index.js            Vercel serverless entry
server/
  app.js                createApp(): middleware + routers + error handler
  dev.js                local dev server (:3001)
  db.js                 Neon client (parameterized queries only)
  auth.js               JWT/cookie helpers
  account.js            shared verification-code + password helpers
  email.js              code delivery (Resend in prod, console mock in dev)
  middleware/           requireAuth / optionalAuth, errorHandler, rateLimit
  routes/               auth, items, me, requests, users
  migrations/           *.sql (idempotent)
src/
  components/           App (router shell), Nav, ItemCard, RequireAuth, …
  routes/               page components (Home, Login, Item, Profile, …)
  lib/                  api fetch wrapper, auth context, categories, filters
  styles/               Tailwind v4 theme ("Swap Board" design system)
tests/
  api/                  API integration tests (supertest)
  e2e/                  Playwright specs (mobile + desktop)
  helpers/              test-DB harness
```

## Getting started

**Prerequisites:** Node 22+, and a [Neon](https://neon.tech) Postgres database.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` in the project root (gitignored):
   ```bash
   DATABASE_URL=postgres://…            # your Neon connection string
   JWT_SECRET=…                         # a 64-char random string
   # Optional in dev:
   RESEND_API_KEY=…                     # if unset, codes are logged to the console
   EMAIL_FROM="Swap <noreply@yourdomain>"
   BLOB_READ_WRITE_TOKEN=…              # Vercel Blob; image upload returns 503 without it
   ```
3. Apply the schema:
   ```bash
   npm run db:migrate
   ```
4. (Optional) Seed a demo user + sample listings:
   ```bash
   npm run db:seed
   ```
5. Run the app:
   ```bash
   npm run dev
   ```
   This starts Vite (`:5173`) and the Express dev server (`:3001`) together; Vite proxies
   `/api` → `:3001`. Open http://localhost:5173.

> In dev, verification codes are **printed to the API server console** rather than emailed —
> look there for the 6-digit code during signup, password reset, or email change.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite + Express dev server together |
| `npm run dev:web` / `npm run dev:api` | run either half alone |
| `npm run build` | Vite production build |
| `npm run lint` | ESLint over the repo |
| `npm test` | run the full Vitest suite |
| `npm run test:unit` | unit + frontend tests (no DB) |
| `npm run test:api` | API integration tests (needs `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright E2E (mobile + desktop) |
| `npm run db:migrate` | apply `server/migrations/*.sql` |
| `npm run db:seed` | reset the demo user's listings + sample items |

## Testing

Four layers, all green and gated in CI:

- **Unit** (`node`) — pure logic: password blocklist, code generation/hashing, env validation,
  category labels, filter/sort.
- **API integration** (`supertest` against `createApp()`, a dedicated Neon test branch) — auth,
  ownership, contact gating, rate limiting, and leakage invariants.
- **Frontend behavior** (`jsdom` + React Testing Library) — the api wrapper, route guards, and
  key components.
- **E2E** (`Playwright`, Chromium) — mobile-nav reachability and the core happy path.

API tests need `TEST_DATABASE_URL` (a separate Neon branch) in `.env.test`. GitHub Actions runs
lint + build + unit + API on every push/PR; E2E runs nightly. See `guides/testing.md`.

## Deployment

Deployed on Vercel as a zero-config Vite + serverless-function project. Set `DATABASE_URL`,
`JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, and `BLOB_READ_WRITE_TOKEN` in the Vercel project
environment. `NODE_ENV=production` (set automatically by Vercel) switches email from the dev
mock to real Resend delivery; production fails loudly if `RESEND_API_KEY` is missing rather than
silently skipping the send.

## License

[MIT](LICENSE) © Tianchen Huang
