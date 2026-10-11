import { SITE_ORIGIN, SITE_NAME, VIEW_SEO, seoForView, schemaForPage } from '../src/seo.js';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function withSeo(html, config, origin = SITE_ORIGIN) {
  html = html.replaceAll('\r\n', '\n');
  const previous = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m => JSON.parse(m[1])['@graph'] || []);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHTML(config.title)}</title>`);
  const tags = {'description':config.description,'robots':config.robots || 'index, follow, max-image-preview:large','twitter:card':'summary','twitter:title':config.title,'twitter:description':config.description,'twitter:image':origin+'/icon-512.png','twitter:image:alt':'Alpha Nova by Above Alpha Solutions logo'};
  const properties = {'og:type':'website','og:site_name':SITE_NAME,'og:locale':'en_IN','og:title':config.title,'og:description':config.description,'og:url':config.canonical,'og:image':origin+'/icon-512.png','og:image:alt':'Alpha Nova by Above Alpha Solutions logo','og:image:width':'512','og:image:height':'512'};
  for (const [attr, values] of [['name',tags],['property',properties]]) for (const [key,value] of Object.entries(values)) {
    const re = new RegExp(`<meta\\b[^>]*${attr}="${key}"[^>]*>`, 'gi');
    html = html.replace(re,'');
    html = html.replace('</head>',`<meta ${attr}="${key}" content="${escapeHTML(value)}">\n</head>`);
  }
  html = html.replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'');
  html = html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
  const data = schemaForPage(config, origin);
  const priorPage = previous.find(node => node.url === config.canonical && ['WebPage','CollectionPage','AboutPage'].includes(node['@type']));
  const currentPage = data['@graph'].find(node => node['@type'] === 'WebPage');
  if (priorPage?.dateModified) currentPage.dateModified = priorPage.dateModified;
  const crumbs = previous.find(node => node['@type'] === 'BreadcrumbList' && node['@id'] === config.canonical+'#breadcrumb');
  if (crumbs) data['@graph'] = data['@graph'].map(node => node['@type'] === 'BreadcrumbList' ? {...crumbs,itemListElement:crumbs.itemListElement.map((item,i)=>i===0?{...item,name:SITE_NAME}:item)} : node);
  data['@graph'].push(...previous.filter(node => !['Organization','WebSite','WebApplication','WebPage','CollectionPage','AboutPage','BreadcrumbList'].includes(node['@type'])));
  html = html.replace('</head>',`<link rel="canonical" href="${escapeHTML(config.canonical)}">\n<script type="application/ld+json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script>\n</head>`);
  return html.replace(/[ \t]+$/gm, '').replace(/\n[ \t]*\n(?:[ \t]*\n)*/g, '\n');
}
export function viewHtml(html, page, origin = SITE_ORIGIN) {
  const config = seoForView(page,origin);
  html = withSeo(html,config,origin);
  const links = Object.entries(VIEW_SEO).filter(([,v]) => v.index).map(([key,v]) => `<li><a href="${escapeHTML(seoForView(key,origin).canonical)}">${escapeHTML(v.heading)}</a></li>`).join('');
  return html.replace(/<main class="seo-fallback">[\s\S]*?<\/main>/, `<main class="seo-fallback"><h1>${escapeHTML(config.heading)}</h1><p>${escapeHTML(config.description)}</p><p>Alpha Nova by Above Alpha Solutions provides market research tools. Observations can be delayed or unavailable; verify provider dates and coverage. Screens and forecasts are research aids, not recommendations.</p><p>Enable JavaScript for interactive data. Read our <a href="/methodology.html">calculation methodology</a> and <a href="/about.html">data sources</a>.</p><nav aria-label="Market research tools"><ul>${links}</ul></nav></main>`);
}
