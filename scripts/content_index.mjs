/* Small indexes of the news archive and detail pages for the browser bundle. The full text only goes
   into the prerendered HTML; in-app navigation to those pages fetches that HTML. Runs before every build. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const write = (p, d) => { mkdirSync(new URL('../src/generated/', import.meta.url), { recursive: true }); writeFileSync(new URL('../' + p, import.meta.url), JSON.stringify(d)); };
// which products each article names (anywhere in its text), for the product pages' "In the news"
const NAMES = { mecc: /\bMECC\b/, ehmecc: /\bEHMECC\b/, trecc: /\bTRECC\b/, hercon: /\bHERCon\b/i, ateps: /\bATEPS\b/, rdmss: /\bRDMSS\b/, mts: /\bMTS\b/, series4: /Series\s*4\b/, series8: /Series\s*8\b/, mex26: /MEX-?26/, polar: /Polar\s*(haven|Chief)|Endurance shelter/i };
const text = n => [n.title, n.summary, ...(n.body || []).map(b => b.p || b.h || (b.list || []).join(' '))].join(' ');
const news = read('src/content/news-archive.json').map(n => ({ slug: n.slug, title: n.title, date: n.date, dateText: n.dateText, summary: n.summary, source: n.source, p: Object.keys(NAMES).filter(k => NAMES[k].test(text(n))) }));
// up to three short key facts per page, shown as proof points on the sector pages
const proof = d => (d.facts || []).filter(([, v]) => v.length <= 34).slice(0, 3);
const details = Object.fromEntries(Object.entries(read('src/content/details.json')).map(([k, d]) => [k, { title: d.title, lead: d.lead, source: d.source, proof: proof(d), products: d.products || [] }]));
write('src/generated/news-index.json', news);
write('src/generated/details-index.json', details);
console.log(`content index: ${news.length} articles, ${Object.keys(details).length} detail pages`);
