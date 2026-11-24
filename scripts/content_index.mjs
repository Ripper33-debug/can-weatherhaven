/* Small indexes of the news archive and detail pages for the browser bundle. The full text only goes
   into the prerendered HTML; in-app navigation to those pages fetches that HTML. Runs before every build. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const write = (p, d) => { mkdirSync(new URL('../src/generated/', import.meta.url), { recursive: true }); writeFileSync(new URL('../' + p, import.meta.url), JSON.stringify(d)); };
const news = read('src/content/news-archive.json').map(({ slug, title, date, dateText, summary, source }) => ({ slug, title, date, dateText, summary, source }));
const details = Object.fromEntries(Object.entries(read('src/content/details.json')).map(([k, d]) => [k, { title: d.title, lead: d.lead, source: d.source }]));
write('src/generated/news-index.json', news);
write('src/generated/details-index.json', details);
console.log(`content index: ${news.length} articles, ${Object.keys(details).length} detail pages`);
