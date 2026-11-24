/* Route discovery: start from the base pages, crawl the internal links each rendered page contains. Every internal link gets a real URL. */
import { ssrRender, detailKey, useFullContent } from '../client/app.js';
import DETAILS from '../content/details.json';
import NEWS_FULL from '../content/news-archive.json';
import PRODUCTS from '../content/products.json';
import SECTORS from '../content/sectors.json';
import SITE from '../content/site.json';
import IMG from '../generated/img.json';
import OG from '../generated/og.json';
import NEWSIMG from '../generated/news-img.json';
import SERVICES from '../content/services.json';
import SUPPORT from '../content/support.json';
import ACCESSORIES from '../content/accessories.json';

useFullContent(NEWS_FULL, DETAILS);   // prerendered pages carry the full article and detail text

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
  cache = [...seen].sort();
  return cache;
}
const ORIGIN = String(import.meta.env.SITE || 'https://can-weatherhaven.vercel.app').replace(/\/$/, '');
const abs = u => u && u.startsWith('/') ? ORIGIN + u : u;
// Search results show about 155 characters: end at a sentence if one fits, otherwise at a word.
function short(d, max = 158) {
  if (!d || d.length <= max) return d;
  const cut = d.slice(0, max), dot = cut.lastIndexOf('. ');
  return dot > 80 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]\s*$/, '') + '…';
}
function detailImg(k) {
  const [g, id] = k.split('/');
  const list = SECTORS[g] ? SECTORS[g].apps : g === 'services' ? SERVICES : g === 'support' ? SUPPORT : g === 'accessories' ? ACCESSORIES : [];
  const x = list.find(v => v.id === id); return x && x.img;
}
export function metaFor(path, title) {
  const seg = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const site = { '@type': 'Organization', name: 'Weatherhaven', url: 'https://weatherhaven.com', logo: abs(IMG.logo_n), telephone: SITE.tollFree };
  let description = 'Expandable containers, softwall shelters and complete camps for military, medical and commercial operations — founded in Canada in 1981, deployed in more than 95 countries.';
  let jsonld = { '@context': 'https://schema.org', ...site }, image;
  const dk = detailKey(seg);
  if (dk) { description = DETAILS[dk].lead; image = OG[detailImg(dk)]; }
  else if (seg[0] === 'news' && seg[1] && NEWS_FULL.find(n => n.slug === seg[1])) { const a = NEWS_FULL.find(n => n.slug === seg[1]); description = a.summary || a.title; image = OG['news-' + a.slug]; jsonld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, datePublished: a.date, image: NEWSIMG[a.slug] ? abs(NEWSIMG[a.slug]) : undefined, publisher: site, url: abs(path) }; }
  else if (seg[0] === 'products' && seg[1] === 'compare') description = 'Put any two or three Weatherhaven shelter systems side by side, on the facts each one publishes.';
  else if (seg[0] === 'products' && seg[1]) {
    const p = PRODUCTS.find(x => x.id === seg[1]);
    if (p) { description = p.summary; image = OG[p.imgs[0]] || IMG[p.imgs[0]]; jsonld = { '@context': 'https://schema.org', '@type': 'Product', name: `${p.name} — ${p.full}`, description: p.summary, image: abs(IMG[p.imgs[0]]), brand: { '@type': 'Brand', name: 'Weatherhaven' }, manufacturer: site, url: abs(path) }; }
  } else if (SECTORS[seg[0]]) { description = SECTORS[seg[0]].lead; image = OG[SECTORS[seg[0]].img] || IMG[SECTORS[seg[0]].img]; }
  else if (seg[0] === 'products') description = 'Eleven shelter systems: expandable containers and softwall shelters, compared side by side.';
  else if (seg[0] === 'buy') description = 'How to buy from Weatherhaven: an RFP checklist of every product and capability, in-stock inventory, quality certifications and supplier information.';
  else if (seg[0] === 'plan') description = 'Sketch a camp with MECCs, EHMECCs, ATEPS and softwall shelters, then see it in 3D.';
  else if (seg[0] === 'services') description = 'Engineering and design, logistics, installation, training, repair and parts — one integrated service from start to finish.';
  // breadcrumbs for sub-pages
  if (seg.length >= 1) {
    const names = { products: 'Products', services: 'Services', company: 'Company', innovation: 'Innovation', news: 'News', contact: 'Contact', record: 'Where we’ve worked', buy: 'How to buy', rfp: 'RFP checklist', instock: 'In stock', quality: 'Quality', suppliers: 'For suppliers', compare: 'Compare', plan: 'Camp planner', military: 'Military', medical: 'Medical', commercial: 'Commercial' };
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' }];
    let acc = '';
    seg.forEach((sg, i) => { acc += '/' + sg; const p = PRODUCTS.find(x => x.id === sg), last = i === seg.length - 1, art = last && seg[0] === 'news' && NEWS_FULL.find(n => n.slug === sg); items.push({ '@type': 'ListItem', position: i + 2, name: p ? p.name : art ? art.title : last && dk ? DETAILS[dk].title : (names[sg] || sg.replace(/-/g, ' ')), item: ORIGIN + acc + '/' }); });
    jsonld = [jsonld, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }];
  }
  return { description: short(description), jsonld, image };
}
