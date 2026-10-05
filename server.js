// Production server for the Cloudflare + Render route (abovealphasolutions.com).
// Serves the Vite build in dist/ and mounts the two API handlers
// (api/market.js, api/push.js) on the same origin, so the frontend's
// relative /api/* calls work with no CORS and no Vercel dependency.
//
// Local:  npm run build && node server.js   (http://127.0.0.1:3000)
// Render: build `npm ci && npm run build`, start `node server.js` ($PORT).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import marketHandler from './api/market.js';
import pushHandler from './api/push.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

// Mirrors vercel.json security headers so the Render deployment keeps them.
function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; " +
      'connect-src \'self\' https://query1.finance.yahoo.com https://query2.finance.yahoo.com https://feeds.finance.yahoo.com https://news.google.com; ' +
      "worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://kite.zerodha.com",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

function cacheControl(pathname) {
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (pathname === '/sw.js') return 'no-cache';
  if (pathname === '/' || pathname.endsWith('.html')) return 'public, max-age=3600';
  if (/\.(png|svg|ico|webmanifest)$/.test(pathname)) return 'public, max-age=86400';
  return 'public, max-age=3600';
}

// Vercel-style helpers the api/* handlers expect (req.query, res.status().json()).
function adapt(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  if (typeof res.status !== 'function') {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }
  if (typeof res.json !== 'function') {
    res.json = (data) => {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
    };
  }
}

async function serveFile(res, pathname, fallback = false) {
  const file = path.join(dist, fallback ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html');
  if (!file.startsWith(dist)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  try {
    const s = await stat(file);
    if (s.isDirectory()) return serveFile(res, '/index.html');
    const body = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const headers = { ...securityHeaders(), 'Cache-Control': cacheControl(fallback ? '/' : pathname) };
    if (TYPES[ext]) headers['Content-Type'] = TYPES[ext];
    if (pathname === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    if (!fallback) return serveFile(res, pathname, true); // SPA fallback
    res.writeHead(404, { ...securityHeaders(), 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    if (pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (pathname === '/index.html') {
      res.writeHead(308, { Location: '/' });
      res.end();
      return;
    }
    if (pathname === '/api/market' || pathname === '/api/market.js') {
      adapt(req, res, url);
      await marketHandler(req, res);
      return;
    }
    if (pathname === '/api/push' || pathname === '/api/push.js') {
      adapt(req, res, url);
      await pushHandler(req, res);
      return;
    }
    if (pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Unknown API route' }));
      return;
    }
    await serveFile(res, pathname);
  } catch (e) {
    try {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e?.message || 'Server error' }));
    } catch {
      /* socket already closed */
    }
  }
});

server.listen(PORT, HOST, () => console.log(`Alpha Nova on http://${HOST}:${PORT} (dist + /api/*)`));
