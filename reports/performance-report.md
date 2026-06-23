# Performance Report — Swap (Step 9b)

Before/after of a low-risk frontend performance pass on the Swap SPA. Methodology and metric
definitions live in `guides/performance-techniques.md` and `guides/performance-metrics.md` (local).
Raw Lighthouse JSON is under `reports/artifacts/` (gitignored).

## Method (identical for baseline and every "after" measurement)

- **Build measured, not dev:** `npm run build` → `npm run preview` (http://localhost:4173).
- **API:** `node server/dev.js` (:3001), reached through a local-only `preview.proxy` in `vite.config.js`.
- **Tool:** Lighthouse (`npx lighthouse`, performance category) connected to a self-launched headless
  Chrome via `--port=9222` (avoids a Windows temp-cleanup error and keeps Chrome warm between runs).
- **Profile:** Lighthouse **mobile** default preset — 4× CPU throttle + simulated slow-4G. Mobile is
  the stricter, user-representative case and is used as the single consistent profile for all
  before/after comparisons (desktop omitted to keep the per-step cost constant; can be added later).
- **Aggregation:** **median of 5 runs** per page (Lighthouse has real run-to-run variance). The first
  cold run after a server start is discarded by warming up before measuring.
- **Pages:** `/` (Home) and `/requests` (the two data-backed list pages).
- **Bundle size:** from `vite build` output (raw + gzip).
- Note: localhost **TTFB ≈ 1 ms** is not representative of Vercel cold starts; it's constant across
  runs so it doesn't affect the relative comparison. Not tracked as a headline number here.

## Baseline (commit `ae1358a`, clean `main`)

Thresholds: LCP good ≤2.5s · FCP good ≤1.8s · CLS good ≤0.1 · TBT good ≤200ms.

| Page | Perf score | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| Home (`/`) | 98 | 1808 ms | 2117 ms | 0 ms | 0.051 | 1808 ms |
| Requests (`/requests`) | 98 | 1806 ms | 2113 ms | 0 ms | 0.009 | 1806 ms |

**Bundle (initial load):** one JS chunk `index-*.js` **368.49 kB** (gzip **111.69 kB**); CSS
`index-*.css` 19.01 kB (gzip 4.80 kB). All routes are eagerly imported, so the entire app ships in
that one chunk.

**Reading the baseline:** the app already scores well (small catalog, TBT 0). The headroom is in
**FCP/LCP** — driven by (a) the three webfonts loaded via a render-blocking CSS `@import` with no
`preconnect`, and (b) the single all-routes JS chunk. CLS on Home (0.051) is mostly the hero
headline reflowing when the webfont swaps in. These are exactly what the optimizations target.

## Optimizations & after-measurements

_(filled in per optimization as they land — one commit each, re-measured under the method above)_

### 1. Fix font delivery ✅ (commit pending)
Moved the 3 Google Fonts from a render-blocking CSS `@import` in `src/styles/index.css` into
`index.html` as `<link rel="preconnect">` (googleapis + gstatic) + a stylesheet `<link>` (kept
`display=swap`). Removes the app-CSS → fonts-CSS → font-files request chain.

| Page | LCP | FCP | CLS | TBT | SI | score |
|---|---|---|---|---|---|---|
| Home | **2117 → 1963 ms** (−154) | 1808 → 1806 | 0.051 → 0.051 | 0 → 0 | 1808 → 1806 | 98 → 98 |
| Requests | **2113 → 1963 ms** (−150) | 1806 → 1806 | 0.009 → 0.009 | 0 → 0 | 1806 → 1806 | 98 → 98 |

~7% LCP improvement (the LCP element is the font-dependent hero text). Lab is on localhost with
simulated throttling, so the request-chain saving is **understated** vs. a real slow network. No
visual/behavior change; build clean. CSS shrank 19.01 → 18.86 kB (the `@import` line is gone).
### 2. Route-based code splitting ✅ (commit pending)
`React.lazy` + `<Suspense>` in `src/components/App.jsx`.

**Reassessment during this step (per the "stop if a metric regresses" rule):** lazy-loading *all*
non-home routes shrank the initial chunk to 241 kB but **regressed `/requests` LCP 2113 → 2474 ms** —
a cold deep-link to a lazy route adds a serialized round trip (main chunk → render → fetch route
chunk → fetch data → LCP). The bundle savings are dominated by `Create.jsx` (100 kB; it pulls in
`@vercel/blob`), not the tiny content-route chunks. So the final split keeps deep-linkable **content**
pages (Home, Item, Requests, PublicProfile) **eager** and lazy-loads the heavy/secondary routes
(Create, Login, Signup, Profile, EditProfile, MakeRequest, NotFound). No regression, ~all the savings.

Cumulative vs baseline (includes opt 1):

| Page | LCP | FCP | CLS | SI | score |
|---|---|---|---|---|---|
| Home | **2117 → 1815 ms** (−302) | 1808 → 1656 (−152) | 0.051 | 1808 → 1656 | 98 → 99 |
| Requests | **2113 → 1815 ms** (−298) | 1806 → 1657 (−149) | 0.009 | 1806 → 1657 | 98 → 99 |

**Initial JS chunk: 368.49 kB → 250.24 kB (gzip 111.69 → 79.34 kB, −32 kB).** `Create` (100 kB)
+ 6 small route chunks now load on demand. Build clean; all routes verified to resolve.
### 3. Vendor chunk splitting ✅ (commit pending)
`build.rollupOptions.output.manualChunks` in `vite.config.js`, scoped to the **framework only**
(react / react-dom / react-router / scheduler) — deliberately *not* all of `node_modules`, so
`@vercel/blob` stays in the lazy `Create` chunk instead of being pulled back into the initial load.

Build now emits `vendor` 229.71 kB (gz 73.56) + entry `index` **21.60 kB (gz 6.60)** + the lazy
route chunks. First-load bytes are ~unchanged (Vite adds `modulepreload` for vendor, so vendor +
entry load in parallel — no waterfall). The win is **repeat-visit caching**: after an app-code edit,
the browser re-downloads only the ~22 kB entry, not the whole 250 kB.

First-load metrics (median-of-5 mobile) vs opt 2 — **no change within noise** (as expected):

| Page | LCP | FCP | CLS | score |
|---|---|---|---|---|
| Home | 1815 → 1814 ms | 1656 → 1657 | 0.051 | 99 |
| Requests | 1815 → 1813 ms | 1657 → 1656 | ~0.01 | 99 |

(A single cold Lighthouse run can't capture the caching benefit; verified no first-load regression.)
### 4. index.html head hygiene ✅ (commit pending)
Real `<title>` ("Swap — buy & sell secondhand, locally"), `meta description`, and `meta theme-color`
(#5a3fe0). **Honest scope note:** the *performance* part of this item was meant to be a `preconnect`
to the Vercel Blob image origin, but there's **no Blob store configured yet** (no token; seeded items
have empty `image_urls`) and a preconnect needs the exact per-store subdomain — so it's left as a
documented TODO in `index.html` to add once a store exists. The shipped changes are **SEO/UX, not
Web-Vitals movers**. Re-measured anyway to confirm no regression:

| Page | LCP | FCP | CLS | score |
|---|---|---|---|---|
| Home | 1814 → 1815 ms | 1656 | 0.051 | 99 |
| Requests | 1813 → 1814 ms | 1656 | ~0.01 | 99 |

Flat within noise, as expected.
### 5. Image attributes (optional) — _pending_

## Summary
_(final before/after deltas table — filled at the end)_
