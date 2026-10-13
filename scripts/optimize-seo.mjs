import { readFile, writeFile } from 'node:fs/promises';
import { WORKSPACE_SEO } from '../src/seo.js';
import { withSeo, viewHtml } from '../lib/seo-html.js';

const decode = s => s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const overrides = {
  '/about.html': {title:'About Above Alpha Solutions and Alpha Nova',description:'Meet Alpha Nova by Above Alpha Solutions and founder Yash Sarda. Explore the stock research app, its data sources, browser storage and research limits.'},
  '/pricing.html': {title:'Alpha Nova Pricing and Free Research Tools',description:'Explore Alpha Nova pricing: free stock research tools with no subscription required. Review included features, saved-screen limits and broker costs.'},
  '/delivery-radar.html': {description:'Explore NSE delivery volume and percentage in Alpha Nova. Compare stocks with their prior 20-session average, check source dates and review data limits.'},
};
const workspacePaths = new Set(Object.values(WORKSPACE_SEO).map(s => s.path));
export async function optimizeSeo(origin) {
  const sitemap = await readFile('public/sitemap.xml','utf8');
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(decode(m[1])).pathname);
  for (const pathname of new Set(paths)) {
    // Workspace entry pages (except /) are built into dist/ by
    // build-workspace-seo.mjs; they have no public/ source file.
    if (workspacePaths.has(pathname) && pathname !== '/') continue;
    const filename = pathname === '/' ? 'index.html' : 'public'+pathname;
    let html = await readFile(filename,'utf8');
    if (pathname === '/') {
      html = viewHtml(html, 'Today', origin);
      html = html.replace('Alpha Nova: stock prices, charts and market research','Above Alpha Solutions: Alpha Nova stock market research');
      html = html.replace('Alpha Nova, also written as AlphaNova, is a free browser-based', 'Alpha Nova by Above Alpha Solutions, also written as AlphaNova, is a free browser-based');
    } else {
      const config = { title:decode(html.match(/<title>(.*?)<\/title>/s)[1]), description:decode(html.match(/name="description" content="(.*?)"/s)[1]), canonical:origin+pathname, ...overrides[pathname] };
      html = withSeo(html,config,origin);
      html = html.replace(/<footer>(?:Alpha Nova by Above Alpha Solutions · )*/,'<footer>Alpha Nova by Above Alpha Solutions · ');
    }
    await writeFile(filename,html);
  }
  await writeFile('public/robots.txt',`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`);
}
