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
### 2. Route-based code splitting — _pending_
### 3. Vendor chunk splitting — _pending_
### 4. index.html head hygiene — _pending_
### 5. Image attributes (optional) — _pending_

## Summary
_(final before/after deltas table — filled at the end)_
