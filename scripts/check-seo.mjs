import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { VIEW_SEO, SITE_ORIGIN, seoForView } from '../src/seo.js';
const base = (process.argv[2] || SITE_ORIGIN).replace(/\/+$/, '');
const output = process.argv[3] || 'docs/seo-live-verification-2026-10-11.json';
const decode = s => s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const get = path => fetch(base + path, {signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});
const report = { checkedAt:new Date().toISOString(), base, pages:[], variants:[], checks:[], failures:[] };
async function inspect(path, canonical, robots) {
  const response = await get(path);
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('x-robots-tag'),robots,path+' robots header');
  const html = await response.text();
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
  const description = decode(html.match(/name="description" content="(.*?)"/s)?.[1] || '');
  assert.ok(title.length >= 30 && title.length <= 60,path+' title length');
  assert.ok(description.length >= 140 && description.length <= 155,path+' description length');
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,path+' canonical count');
  assert.equal(decode(html.match(/rel="canonical" href="(.*?)"/)?.[1] || ''),canonical,path+' canonical');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,path+' H1 count');
  for (const [attribute,key,value] of [['name','robots',robots],['property','og:title',title],['property','og:description',description],['property','og:url',canonical],['name','twitter:title',title],['name','twitter:description',description]]) assert.equal(decode(html.match(new RegExp(`${attribute}="${key}" content="(.*?)"`))?.[1] || ''),value,path+' '+key);
  const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']);
  assert.ok(graphs.some(n=>n['@type']==='Organization' && n.name==='Above Alpha Solutions'),path+' organization');
  assert.ok(graphs.some(n=>n['@type']==='WebPage' && n.url===canonical && n.name===title),path+' page schema');
  for (const m of html.matchAll(/<img\b([^>]+)>/g)) assert.ok(/\balt="[^"]*"/.test(m[1]),path+' image alt');
  return {path,status:response.status,title,titleLength:title.length,descriptionLength:description.length,canonical,robots,checks:'PASS'};
}
try {
  const sitemapResponse = await get('/sitemap.xml'); assert.equal(sitemapResponse.status,200);
  assert.ok(sitemapResponse.headers.get('content-type').includes('xml'));
  const sitemap = await sitemapResponse.text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
  assert.equal(new Set(urls).size,urls.length);
  assert.equal(urls.length,23);
  for (const url of urls) {
    const u = new URL(url); assert.equal(u.origin,SITE_ORIGIN);
    report.pages.push(await inspect(u.pathname+u.search,url,'index, follow, max-image-preview:large'));
  }
  assert.equal(new Set(report.pages.map(p=>p.title)).size,urls.length);
  for (const page of Object.keys(VIEW_SEO)) {
    const config = seoForView(page);
    report.variants.push(await inspect(`/?symbol=RELIANCE.NS&page=${page}&range=6mo`,config.canonical,config.robots));
  }
  for (const path of ['/missing-seo-check.html','/assets/missing-seo-check.js','/?page=Missing']) {
    const response = await get(path); assert.equal(response.status,404); assert.ok(response.headers.get('x-robots-tag').includes('noindex'));
    report.checks.push({path,status:404,checks:'PASS'});
  }
  const redirect = await fetch(base+'/index.html?page=Forecast&symbol=TCS.NS',{redirect:'manual',signal:AbortSignal.timeout(30000)});
  assert.equal(redirect.status,308); assert.equal(redirect.headers.get('location'),'/?page=Forecast&symbol=TCS.NS');
  report.checks.push({path:'/index.html?page=Forecast&symbol=TCS.NS',status:308,preservesInputs:true,checks:'PASS'});
  for (const path of ['/icon-512.png','/favicon.svg','/seo.css','/robots.txt']) {
    const response = await get(path); assert.equal(response.status,200,path); assert.ok(!response.headers.get('content-type').includes('text/html'),path);
    if (path==='/robots.txt') assert.ok((await response.text()).includes('Sitemap: '+SITE_ORIGIN+'/sitemap.xml'));
    report.checks.push({path,status:200,checks:'PASS'});
  }
} catch (error) { report.failures.push(error.message); process.exitCode = 1; }
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,variants:report.variants.length,checks:report.checks.length,failures:report.failures,output}));
