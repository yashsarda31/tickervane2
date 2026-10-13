# Above Alpha Solutions sync — latest terminal (2026-10-14)

Merged `origin/main` (`c82e0bc`, 13 Oct 2026: SEO + performance + bounce
updates, ResearchChart, formatting utils, 278 tests) into the
`abovealphasolutions.com` Render deployment in this folder.

## What came in from upstream

- ResearchChart view with shared formatting utils (`src/format.js`,
  `src/research.css`, `src/seo.js` workspace metadata).
- Performance work: lazy News/Onboarding/Watchlist/ResearchChart chunks,
  `/api/market?op=screen` preload on Today/Markets, Vercel Speed Insights.
- Bounce/mobile readability updates across Navigation, Screener, SwingDesk,
  Onboarding, activation/growth.
- Per-workspace static entry pages (`/charts`, `/forecast`, `/markets`,
  `/screener`, `/delivery`, `/futures-options`, `/institutional-flows`,
  `/news`, plus private `/watchlist`, `/portfolio`, `/trade-journal`,
  `/price-alerts`) via `scripts/build-workspace-seo.mjs`; `npm run build`
  is now `seo:generate && vite build && build-workspace-seo`.
- `vercel.json` rewrites/headers for the new paths (Vercel project only).

## What was kept for abovealphasolutions.com

- Canonical origin stays `https://abovealphasolutions.com` (`src/seo.js`
  `SITE_ORIGIN`, `scripts/generate-seo.mjs` honours `SITE_ORIGIN` env).
- Render single-service deployment untouched: `server.js` (now also serves
  the new workspace static pages with matching `X-Robots-Tag`),
  `render.yaml`, `package.json` `start`/`engines`.
- Trading-app guides (`/best-trading-app*.html`), homepage/product/app
  discovery links, `optimize-seo.mjs` brand pass, `seo-server.test.js`.
- `src/seo.js` exports both APIs: `VIEW_SEO`/`seoForView`/`applyViewSeo`
  (server `?page=` links) and `WORKSPACE_SEO`/`updatePageMetadata`.
- Removed the obsolete "Visit alphanova48.in" `NewSiteBanner`; this origin
  now ships the latest app itself.

## Verification (2026-10-14)

- `node scripts/generate-seo.mjs` ok; sitemap has 26 canonical
  abovealphasolutions.com URLs, no `alphanova48.in`/`tickervane` canonicals.
- Full suite: 279/279 tests pass (105 app + 174 jarvis/nse/options).
- `npm run build` ok; `dist/` holds 13 workspace pages with correct
  canonicals (`/charts`, `/screener`, …) and `noindex` on private shells.
- `node server.js`: `/healthz`, `/`, `/charts`, `/screener`, `/watchlist`
  (noindex), `/about.html`, `/api/market?op=screen` (200, live rows) and
  404 handling all verified locally.

## Deploy

Push this branch and let the Render Blueprint (`alphanova-terminal`)
rebuild (`npm ci && npm run build` → `node server.js`), or merge into the
branch Render tracks. No env changes needed. Rollback: Render → previous
deploy, or repoint Cloudflare to the old service.
