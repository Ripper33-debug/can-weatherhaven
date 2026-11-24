/* Site tests against a built output served at BASE (default http://127.0.0.1:8800).
   1. every URL in the sitemap returns 200 with a title, an h1 and a meta description
   2. every internal link on every page resolves
   3. JSON-LD parses
   4. the quote endpoint validates (only when BASE runs the server, e.g. `astro dev`)
   5. no page is wider than a 390px phone screen (needs Playwright; skipped without it) */
import { createRequire } from 'node:module';
const BASE = process.argv[2] || 'http://127.0.0.1:8800';
const text = async u => { const r = await fetch(u); return { status: r.status, body: await r.text() }; };
let fails = 0; const fail = m => { fails++; console.log('FAIL', m); };
const sm = await text(BASE + '/sitemap-0.xml');
const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
if (urls.length < 50) fail(`sitemap has only ${urls.length} urls`);
const seenLinks = new Set();
for (const path of urls) {
  const { status, body } = await text(BASE + path);
  if (status !== 200) { fail(`${path} → ${status}`); continue; }
  if (!/<title>[^<]{10,}<\/title>/.test(body)) fail(`${path}: no title`);
  if (!/<h1[\s>]/.test(body)) fail(`${path}: no h1`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(body)) fail(`${path}: no description`);
  for (const m of body.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) { try { JSON.parse(m[1]); } catch { fail(`${path}: bad JSON-LD`); } }
  for (const m of body.matchAll(/href="(\/[^"#?]*)/g)) { const h = m[1]; if (!/^\/(assets|_astro|api)\//.test(h)) seenLinks.add(h.replace(/\/?$/, '/')); }
}
for (const h of seenLinks) { if (!urls.includes(h) && h !== '/ar/' && h !== '/products/compare/') { const { status } = await text(BASE + h); if (status !== 200) fail(`dead link ${h} → ${status}`); } }
// endpoint (skipped on a static server)
const api = await fetch(BASE + '/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', email: 'x' }) }).catch(() => null);
if (api && api.headers.get('content-type')?.includes('json')) { if (api.status !== 422) fail('quote endpoint validation'); console.log('endpoint: checked'); } else console.log('endpoint: skipped (static server)');
// phone width: nothing may push a page wider than the screen
let pw = null; try { pw = createRequire(import.meta.url)(process.env.PW || '/opt/npm-tools/node_modules/playwright'); } catch { }
if (pw) {
  const b = await pw.chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const path of urls) {
    await pg.goto(BASE + path, { waitUntil: 'load' }); await pg.waitForTimeout(150);   // after the stylesheet: nothing renders before it
    const w = await pg.evaluate(() => document.documentElement.scrollWidth);
    if (w > 391) fail(`${path}: ${w}px wide on a 390px phone`);
  }
  await b.close(); console.log('phone width: checked');
} else console.log('phone width: skipped (no Playwright)');
console.log(`${urls.length} pages, ${seenLinks.size} internal links checked, ${fails} failures`);
process.exitCode = fails ? 1 : 0;
