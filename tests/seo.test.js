import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PRESETS, describe, presetFromSearch } from '../src/screens.js';
import { guides } from '../content/seo/screens.mjs';
import { tradingGuides, tradingGuidesUpdated } from '../content/seo/trading-apps.mjs';
import { VIEW_SEO } from '../src/seo.js';
import { viewHtml } from '../lib/seo-html.js';

const origin = (process.env.SITE_ORIGIN || 'https://abovealphasolutions.com').replace(/\/+$/, '');
const decode = s => s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const localFile = path => path === '/' ? 'index.html' : 'public'+(path.endsWith('/')?path+'index.html':path);

test('every workspace description passes the Detailed SEO extension length check', () => {
  // Installed extension 2.2.7 accepts 70-155 characters; keep our copy within 140-155.
  for (const [page, {description}] of Object.entries(VIEW_SEO)) {
    assert.ok(description.length >= 140 && description.length <= 155,`${page}: description ${description.length}`);
  }
});

test('guide deep links select only known presets in the screener workspace', () => {
  for (const p of PRESETS) assert.equal(presetFromSearch('?page=Screener&screen='+p.id),p.id);
  for (const q of ['', '?screen=volume', '?page=Today&screen=volume', '?page=Screener&screen=custom', '?page=Screener&screen=unknown']) assert.equal(presetFromSearch(q),null);
});

test('public guide generation preserves rules, canonicals, structured data and local links', async () => {
  execFileSync(process.execPath,['scripts/generate-seo.mjs']);
  const sitemap = await readFile('public/sitemap.xml','utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.equal(new Set(urls).size,urls.length);
  assert.equal(urls.length,15 + tradingGuides.length + Object.entries(VIEW_SEO).filter(([key,v])=>key!=='Today' && v.index).length);
  const titles = new Set();
  const descriptions = new Set();
  for (const url of urls) {
    assert.equal(new URL(url).origin,origin);
    const location = new URL(url);
    const source = await readFile(localFile(location.pathname),'utf8');
    const html = location.search ? viewHtml(source,location.searchParams.get('page'),origin) : source;
    assert.ok(!html.includes('tickervane.vercel.app'),`Old domain in public metadata: ${url}`);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,url);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1,url);
    assert.ok(html.includes(`rel="canonical" href="${url}"`),url);
    assert.ok(!/<meta[^>]+content="[^"]*noindex/.test(html),url);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const description = decode(html.match(/name="description" content="(.*?)"/)[1]);
    assert.ok(description.length >= 140 && description.length <= 155,`${url}: description ${description.length}`);
    assert.ok(!titles.has(title),`Duplicate title: ${title}`); titles.add(title);
    assert.ok(!descriptions.has(description),`Duplicate description: ${description}`); descriptions.add(description);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(schemas.length,url);
    const graph = schemas.flatMap(m=>JSON.parse(m[1])['@graph']);
    assert.ok(graph.some(x=>x.url===url),url);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = new URL(decode(match[1]),url);
      if (target.origin!==origin) continue;
      const path = target.pathname;
      if (path.startsWith('/src/')) { assert.ok((await stat(path.slice(1))).isFile()); continue; }
      assert.ok((await stat(localFile(path))).isFile(),`${url} → ${path}`);
      if (target.searchParams.has('screen')) assert.ok(presetFromSearch(target.search));
    }
  }
  for (const guide of guides) {
    const html = decode(await readFile('public/screens/'+guide.slug+'.html','utf8'));
    const preset = PRESETS.find(x=>x.id===guide.id);
    for (const rule of preset.when) assert.ok(html.includes(describe([rule])),`${guide.id} rule drift`);
    assert.ok(html.includes(guide.example));
    assert.ok(html.includes(guide.caveat));
    assert.ok(urls.includes(origin+'/screens/'+guide.slug+'.html'));
  }
  const root = await readFile('index.html','utf8');
  const app = await readFile('src/App.jsx','utf8');
  const product = await readFile('public/stock-market-app.html','utf8');
  for (const guide of tradingGuides) {
    const html = await readFile('public'+guide.path,'utf8');
    assert.ok(root.includes(guide.path), 'Homepage discovery: '+guide.path);
    assert.ok(product.includes(guide.path), 'Product page discovery: '+guide.path);
    assert.ok(app.includes(guide.path), 'Rendered app discovery: '+guide.path);
    assert.ok(!/<script[^>]+src=/.test(html), 'Guides work without JavaScript');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const article = graph.find(n=>n['@type']==='Article');
    assert.equal(article.headline,guide.name);
    assert.equal(article.author['@id'],origin+'/#organization');
    assert.equal(article.dateModified,tradingGuidesUpdated);
    assert.ok(html.includes('Above Alpha Solutions</a>'));
    assert.ok(!graph.some(n=>['AggregateRating','Review'].includes(n['@type'])));
    for (const related of tradingGuides.filter(g=>g!==guide)) assert.ok(html.includes(related.path));
  }
  const robots = await readFile('public/robots.txt','utf8');
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  const hub = await readFile('public/screens.html','utf8');
  assert.ok(root.includes('href="/screens.html"'));
  for (const g of guides) assert.ok(hub.includes(`/screens/${g.slug}.html`));
  const first = await readFile('public/sitemap.xml','utf8');
  const about = await readFile('public/about.html','utf8');
  const home = await readFile('index.html','utf8');
  execFileSync(process.execPath,['scripts/generate-seo.mjs']);
  assert.equal(await readFile('public/sitemap.xml','utf8'),first,'Build must not change lastmod');
  assert.equal(await readFile('public/about.html','utf8'),about,'Build must not duplicate brand copy');
  assert.equal(await readFile('index.html','utf8'),home,'Homepage generation must be deterministic');
});
