export const SITE_ORIGIN = 'https://abovealphasolutions.com';
export const SITE_NAME = 'Above Alpha Solutions';
export const PUBLIC_ROBOTS = 'index, follow, max-image-preview:large';
export const PRIVATE_ROBOTS = 'noindex, follow';
const view = (title, description, heading, index = true) => ({title, description, heading, index});
export const VIEW_SEO = {
  Today: view('Above Alpha Solutions | Alpha Nova Stock Market App', 'Explore Alpha Nova by Above Alpha Solutions: Indian stock charts, Nifty 500 screening, NSE delivery research and risk tools. Open the free workspace.', 'Above Alpha Solutions: Alpha Nova market research'),
  Terminal: view('Stock Charts and Technical Analysis | Alpha Nova', 'Explore Indian and global stock charts with Alpha Nova. Compare historical prices, volume and technical indicators, then review your research plan.', 'Stock charts and technical analysis'),
  Forecast: view('Stock Forecast and Price Scenarios | Alpha Nova', 'Explore stock price scenarios with Alpha Nova using historical observations and statistical models. Review forecast horizons, uncertainty and data limits.', 'Stock forecast and price scenarios'),
  Markets: view('Indian and Global Stock Market Overview | Alpha Nova', 'Compare Indian and global benchmarks, sector performance and stock watchlists in Alpha Nova. Check available prices, provider dates and market context.', 'Indian and global stock market overview'),
  Screener: view('Nifty 500 Stock Screener and Research | Alpha Nova', 'Screen Nifty 500 stocks by momentum, delivery, volume and trend in Alpha Nova. Explore documented presets, build rules and export your research shortlist.', 'Nifty 500 stock screener'),
  Delivery: view('NSE Delivery Volume and Percentage Radar | Alpha Nova', 'Compare NSE delivered quantity and delivery percentage with recent stock history in Alpha Nova. Review unusual activity, source dates and research limits.', 'NSE delivery volume and percentage radar'),
  FnO: view('NSE Option Chain and Futures Open Interest | Alpha Nova', 'Explore NSE options and futures open interest in Alpha Nova. Review available expiry data, strike distributions and derivatives context with source dates.', 'NSE option chain and futures open interest'),
  Flows: view('FII DII Flows and NSE Bulk Block Deals | Alpha Nova', 'Review available FII and DII cash market flows alongside NSE bulk and block deals in Alpha Nova. Check reported activity, counterparties and source dates.', 'FII DII flows and NSE bulk and block deals'),
  News: view('Stock Market News and Company Headlines | Alpha Nova', 'Explore stock market news and company headlines alongside Alpha Nova charts and research tools. Check publication dates and source context before acting.', 'Stock market news and company headlines'),
  Watchlist: view('My Stock Watchlist | Alpha Nova', 'Manage your device-local stock watchlist in Alpha Nova. Review saved companies, available quotes and research links in your personal browser workspace.', 'My stock watchlist', false),
  Portfolio: view('My Portfolio and Research Backup | Alpha Nova', 'Review device-local holdings and research plans in Alpha Nova. Export or restore a browser backup and check your portfolio records and assumptions.', 'My portfolio and research backup', false),
  Journal: view('My Trading Research Journal | Alpha Nova', 'Keep a device-local research journal in Alpha Nova. Review manually recorded trades, planning notes and risk assumptions in your own browser workspace.', 'My trading research journal', false),
  Alerts: view('My Stock Price Alerts | Alpha Nova', 'Manage your personal stock price alerts in Alpha Nova. Review browser notification settings, saved price levels and supported push delivery options.', 'My stock price alerts', false),
};

export function seoForView(page = 'Today', origin = SITE_ORIGIN) {
  const config = VIEW_SEO[page] || VIEW_SEO.Today;
  const key = VIEW_SEO[page] ? page : 'Today';
  return {...config, canonical: `${origin.replace(/\/+$/, '')}/${key === 'Today' ? '' : '?page=' + key}`, robots: config.index ? PUBLIC_ROBOTS : PRIVATE_ROBOTS};
}

export function schemaForPage(config, origin = SITE_ORIGIN) {
  origin = origin.replace(/\/+$/, '');
  return {'@context':'https://schema.org', '@graph': [
    {'@type':'Organization', '@id':origin+'/#organization', name:SITE_NAME, url:origin+'/', logo:origin+'/icon-512.png'},
    {'@type':'WebSite', '@id':origin+'/#website', name:SITE_NAME, alternateName:['Alpha Nova','AlphaNova'], url:origin+'/', publisher:{'@id':origin+'/#organization'}, inLanguage:'en-IN'},
    {'@type':'WebApplication', '@id':origin+'/#app', name:'Alpha Nova', url:origin+'/', applicationCategory:'FinanceApplication', operatingSystem:'Web browser', image:origin+'/icon-512.png', publisher:{'@id':origin+'/#organization'}, isAccessibleForFree:true, offers:{'@type':'Offer',price:'0',priceCurrency:'INR'}},
    {'@type':'WebPage', '@id':config.canonical+'#webpage', url:config.canonical, name:config.title, description:config.description, inLanguage:'en-IN', isPartOf:{'@id':origin+'/#website'}, about:{'@id':origin+'/#app'}, ...(config.canonical === origin+'/' ? {} : {breadcrumb:{'@id':config.canonical+'#breadcrumb'}})},
    ...(config.canonical === origin+'/' ? [] : [{'@type':'BreadcrumbList', '@id':config.canonical+'#breadcrumb', itemListElement:[{'@type':'ListItem',position:1,name:SITE_NAME,item:origin+'/'},{'@type':'ListItem',position:2,name:config.heading || config.title,item:config.canonical}]}]),
  ]};
}

export function applyViewSeo(page) {
  const config = seoForView(page);
  document.title = config.title;
  const set = (selector, attrs) => {
    let node = document.head.querySelector(selector);
    if (!node) { node = document.createElement(attrs.rel ? 'link' : 'meta'); document.head.appendChild(node); }
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  };
  set('link[rel="canonical"]',{rel:'canonical',href:config.canonical});
  for (const [name,content] of Object.entries({description:config.description,robots:config.robots,'twitter:card':'summary','twitter:title':config.title,'twitter:description':config.description,'twitter:image':SITE_ORIGIN+'/icon-512.png','twitter:image:alt':'Alpha Nova by Above Alpha Solutions logo'})) set(`meta[name="${name}"]`,{name,content});
  for (const [property,content] of Object.entries({'og:type':'website','og:site_name':SITE_NAME,'og:locale':'en_IN','og:title':config.title,'og:description':config.description,'og:url':config.canonical,'og:image':SITE_ORIGIN+'/icon-512.png','og:image:alt':'Alpha Nova by Above Alpha Solutions logo','og:image:width':'512','og:image:height':'512'})) set(`meta[property="${property}"]`,{property,content});
  let script = document.head.querySelector('script[type="application/ld+json"]');
  if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; document.head.appendChild(script); }
  script.textContent = JSON.stringify(schemaForPage(config));
}
