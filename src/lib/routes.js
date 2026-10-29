/* Route discovery: start from the base pages, crawl the internal links each rendered page contains. Every internal link gets a real URL. */
import { ssrRender } from '../client/app.js';
import PRODUCTS from '../content/products.json';
import SECTORS from '../content/sectors.json';
import SITE from '../content/site.json';
import IMG from '../generated/img.json';

const BASE = ['/', '/military/', '/medical/', '/commercial/', '/products/', '/services/', '/innovation/', '/company/', '/news/', '/contact/', '/record/', '/plan/'];
const norm = p => { p = p.split('#')[0].split('?')[0]; if (!p.startsWith('/')) return null; if (/^\/(assets|ar|api)\//.test(p)) return null; return p.replace(/\/?$/, '/'); };
let cache = null;
export function routes() {
  if (cache) return cache;
  const seen = new Set(), queue = [...BASE];
  while (queue.length) {
    const p = queue.shift(); if (seen.has(p)) continue; seen.add(p);
    const { html, chrome } = ssrRender(p);
    const all = html + chrome.hdr + chrome.drawer + chrome.ftr;
    for (const m of all.matchAll(/href="([^"]+)"/g)) { const n = norm(m[1]); if (n && !seen.has(n)) queue.push(n); }
  }
  cache = [...seen].filter(p => !/\/products\/compare\/$/.test(p)).sort();
  return cache;
}
export function metaFor(path, title) {
  const seg = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const site = { '@type': 'Organization', name: 'Weatherhaven', url: 'https://weatherhaven.com', logo: IMG.logo_n, telephone: SITE.tollFree };
  let description = 'Expandable containers, softwall shelters and complete camps for military, medical and commercial operations — founded in Canada in 1981, deployed in more than 95 countries.';
  let jsonld = { '@context': 'https://schema.org', ...site }, image;
  if (seg[0] === 'products' && seg[1]) {
    const p = PRODUCTS.find(x => x.id === seg[1]);
    if (p) { description = p.summary; image = IMG[p.imgs[0]]; jsonld = { '@context': 'https://schema.org', '@type': 'Product', name: `${p.name} — ${p.full}`, description: p.summary, image: image, brand: { '@type': 'Brand', name: 'Weatherhaven' }, manufacturer: site, url: path }; }
  } else if (SECTORS[seg[0]]) { description = SECTORS[seg[0]].lead; image = IMG[SECTORS[seg[0]].img]; }
  else if (seg[0] === 'products') description = 'Eleven shelter systems: expandable containers and softwall shelters, compared side by side.';
  else if (seg[0] === 'plan') description = 'Sketch a camp with MECCs, EHMECCs, ATEPS and softwall shelters, then see it in 3D.';
  else if (seg[0] === 'services') description = 'Engineering and design, logistics, installation, training, repair and parts — one integrated service from start to finish.';
  // breadcrumbs for sub-pages
  if (seg.length >= 1) {
    const names = { products: 'Products', services: 'Services', company: 'Company', innovation: 'Innovation', news: 'News', contact: 'Contact', record: 'Where we’ve worked', plan: 'Camp planner', military: 'Military', medical: 'Medical', commercial: 'Commercial' };
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: '/' }];
    let acc = '';
    seg.forEach((sg, i) => { acc += '/' + sg; const p = PRODUCTS.find(x => x.id === sg); items.push({ '@type': 'ListItem', position: i + 2, name: p ? p.name : (names[sg] || sg.replace(/-/g, ' ')), item: acc + '/' }); });
    jsonld = [jsonld, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }];
  }
  return { description, jsonld, image };
}
