# Deploy to abovealphasolutions.com — Cloudflare + Render route

This folder (`5alphav2_new`) is the new Alpha Nova app, cloned from
`payhatsolutions-collab/tickervane-terminal`, adapted so it runs on Render
as **one Node web service** (`server.js` serves `dist/` + `/api/*` on the
same origin) behind the existing Cloudflare DNS for `abovealphasolutions.com`.

Today `www.abovealphasolutions.com` is a CNAME to `alphanova-web.onrender.com`
(the OLD Python+Vite app). The cutover below swaps it to the new service.
Keep the old Render services running until the new domain verifies — that is
your instant rollback.

## 0. What changed vs upstream (so a future `git pull` stays clean)

| File | Change |
|---|---|
| `server.js` (new) | Zero-dependency Node server: static `dist/` + `/api/market`, `/api/push`, `/healthz`, SPA fallback, vercel.json security headers |
| `render.yaml` (new) | Blueprint: `npm ci && npm run build` → `node server.js`, `/healthz` check, secret env vars |
| `package.json` | Added `start: node server.js`, `engines.node >= 20` (Vercel deploy unaffected) |
| `scripts/generate-seo.mjs`, `tests/seo.test.js` | Canonical origin now `process.env.SITE_ORIGIN`, default `https://abovealphasolutions.com` |
| `index.html`, `public/*.html`, `public/robots.txt` (+ regenerated `sitemap.xml`, `llms.txt`, `pricing.md`, `screens/*`, `methodology.html`, `pricing.html`) | Canonical/OG URLs moved from `tickervane.vercel.app` to `abovealphasolutions.com` |
| `README.md`, `docs/` | Untouched — release history stays as-is |

Verified locally: `npm run build` ok, 206/206 tests pass,
`node server.js` serves `/` (canonical `abovealphasolutions.com/`),
`/about.html`, `/robots.txt`, `/healthz`, live `/api/market?op=quotes`,
SPA fallback and `/index.html → /` redirect, security headers intact.

## 1. Push this code to a GitHub repo Render can read

Render Blueprints deploy from a repo. Either push a branch to the source
repo or (safer — keeps upstream canonicals intact) to your own repo, e.g.
`yashsarda31/5alpha` is the OLD app, so create `yashsarda31/alphanova-terminal`
or reuse this folder as its own repo:

```bash
cd 5alphav2_new
git checkout -b deploy/abovealphasolutions-render
git add server.js render.yaml package.json scripts/generate-seo.mjs tests/seo.test.js index.html public/
git commit -m "Render + Cloudflare deploy for abovealphasolutions.com (single Node service, canonical origin)"
git push -u origin deploy/abovealphasolutions-render
```

## 2. Create the Render service (Blueprint)

1. Render Dashboard → **New → Blueprint** → select the repo/branch from step 1.
2. Blueprint creates **`alphanova-terminal`** (free plan). When prompted, fill secrets:
   - `BLOB_READ_WRITE_TOKEN` — copy from the Vercel `alphanova2` project (same private push store, so existing subscriptions keep working)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — copy from Vercel (changing these orphans existing push subscriptions)
   - `CRON_SECRET` — auto-generated; copy it for step 4
   - `SITE_ORIGIN` is prefilled `https://abovealphasolutions.com`; `VAPID_SUBJECT` keeps the existing contact address
3. Deploy, then confirm `https://<service>.onrender.com/healthz` → `{"ok":true}` and spot-check `/`, one `/api/market?op=screen`, `/api/push?op=vapid`.

## 3. Point Cloudflare at the new service (the cutover)

In Render: service → **Settings → Custom Domains** → add `abovealphasolutions.com`
and `www.abovealphasolutions.com` (Render shows the DNS target, typically
`<service>.onrender.com`).

In Cloudflare (`abovealphasolutions.com` zone):

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `www` | `<new-service>.onrender.com` | Proxied (orange) |
| CNAME flattened / A | `@` | `<new-service>.onrender.com` (or the A records Render shows) | Proxied (orange) |

Wait for Render's domain verification (TLS cert issuance, ~5–15 min),
then check: `https://abovealphasolutions.com/healthz`,
homepage canonical, one screener + Forecast load with live data.

**Rollback:** flip the Cloudflare records back to `alphanova-web.onrender.com`.
Nothing is deleted in this plan, so rollback is a DNS change only.

## 4. Evening push cron (replaces Vercel cron)

Render free has no cron; add two jobs at **cron-job.org** (free tier is enough),
Mon–Fri:

- `GET https://abovealphasolutions.com/api/push?op=cron` at **14:00 UTC** and **16:00 UTC**
- Header: `Authorization: Bearer <CRON_SECRET from step 2>`

Without these, closed-app price checks / delivery digests don't run; open tabs
still check every 5 minutes on their own.

## 5. After go-live

- Google Search Console: submit `https://abovealphasolutions.com/sitemap.xml`
  (canonical moved from `tickervane.vercel.app` — expect a re-indexing period;
  keep `tickervane.vercel.app` + `alphanova48.in` live during the transition).
- Users moving origins must use **Portfolio → Backup & restore** export/import;
  push permissions must be re-enabled on the new origin (browser storage is per-origin).
- Free-plan note: the service sleeps after ~15 min idle (cold start on next
  visit). If push reliability / latency matters, raise the service to `starter`.
