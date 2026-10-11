import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { VIEW_SEO, seoForView } from '../src/seo.js';

const decode = s => s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function checkPage(html, canonical) {
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,canonical);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,canonical);
  assert.equal(decode(html.match(/rel="canonical" href="(.*?)"/)[1]),canonical);
  const title = decode(html.match(/<title>(.*?)<\/title>/s)[1]);
  const description = decode(html.match(/name="description" content="(.*?)"/s)[1]);
  assert.ok(title.length >= 30 && title.length <= 60,`${canonical}: title ${title.length}`);
  assert.ok(description.length >= 140 && description.length <= 155,`${canonical}: description ${description.length}`);
  for (const [property,value] of [['og:title',title],['og:description',description],['og:url',canonical]]) {
    assert.equal(decode(html.match(new RegExp(`property="${property}" content="(.*?)"`))[1]),value);
  }
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.ok(graph.some(n=>n['@type']==='Organization' && n.name==='Above Alpha Solutions'));
  assert.ok(graph.some(n=>n['@type']==='WebPage' && n.url===canonical && n.name===title));
  assert.ok(html.includes('twitter:image:alt'));
  return {title,description};
}

test('production server serves every canonical page and protects duplicate/private/error URLs', async t => {
  const probe = createServer();
  probe.listen(0,'127.0.0.1'); await once(probe,'listening');
  const port = probe.address().port; await new Promise(resolve=>probe.close(resolve));
  const server = spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Server exited');})]);
  const base = `http://127.0.0.1:${port}`;
  const sitemap = await readFile('dist/sitemap.xml','utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
  const titles = new Set(), descriptions = new Set();
  for (const url of urls) {
    const parsed = new URL(url);
    const response = await fetch(base+parsed.pathname+parsed.search);
    assert.equal(response.status,200,url);
    assert.equal(response.headers.get('x-robots-tag'),'index, follow, max-image-preview:large',url);
    const html = await response.text();
    const metadata = checkPage(html,url);
    assert.ok(!titles.has(metadata.title),url); titles.add(metadata.title);
    assert.ok(!descriptions.has(metadata.description),url); descriptions.add(metadata.description);
  }
  for (const [page,config] of Object.entries(VIEW_SEO)) {
    const response = await fetch(base+`/?symbol=RELIANCE.NS&page=${page}&range=6mo&utm_source=seo`);
    assert.equal(response.status,200,page);
    assert.equal(response.headers.get('x-robots-tag'),seoForView(page).robots);
    const html = await response.text();
    checkPage(html,seoForView(page).canonical);
    assert.equal(html.includes('content="noindex, follow"'),!config.index);
    assert.equal(response.headers.get('cache-control'),'no-cache');
  }
  for (const path of ['/missing-page','/missing.html','/assets/missing.js','/?page=Missing','/%E0%A4%A']) {
    const response = await fetch(base+path);
    assert.equal(response.status,path.includes('%')?400:404,path);
    assert.ok(response.headers.get('x-robots-tag').includes('noindex'));
  }
  const redirect = await fetch(base+'/index.html?page=Forecast&symbol=TCS.NS',{redirect:'manual'});
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.get('location'),'/?page=Forecast&symbol=TCS.NS');
  const head = await fetch(base+'/?page=Watchlist',{method:'HEAD'});
  assert.equal(head.headers.get('x-robots-tag'),'noindex, follow');
  assert.equal(await head.text(),'');
  const image = await fetch(base+'/icon-512.png');
  assert.equal(image.status,200); assert.equal(image.headers.get('content-type'),'image/png');
  assert.ok(image.headers.get('content-security-policy'));
});
