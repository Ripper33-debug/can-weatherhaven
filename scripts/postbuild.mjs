/* After `astro build`: add security + caching headers to the Vercel build output. */
import fs from 'node:fs';
const p = '.vercel/output/config.json';
const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
// Inline <script> is only allowed on the AR pages (their template has two). The build checks its own output:
// if any other page ever gains an inline script (e.g. Sentry switched on), that page keeps working.
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.html') ? [`${d}/${e.name}`] : []);
const ROOT = '.vercel/output/static';
const inlineElsewhere = walk(ROOT).filter(f => !f.startsWith(`${ROOT}/ar/`)).some(f => /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(fs.readFileSync(f, 'utf8')));
const csp = inline => `default-src 'self'; script-src 'self'${inline ? " 'unsafe-inline'" : ''} 'wasm-unsafe-eval' https://plausible.io https://va.vercel-scripts.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: data: https://plausible.io https://vitals.vercel-insights.com https://*.ingest.sentry.io; media-src 'self'; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`;
const base = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=(self)', 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' };
const sec = { ...base, 'Content-Security-Policy': csp(inlineElsewhere) };
const secAr = { ...base, 'Content-Security-Policy': csp(true) };
const routes = [
  // Only files whose URL changes when their content changes are cached forever: hashed names (p_mecc.821812460a.webp)
  // and engine files requested with ?v=<build>. Everything else under /assets is cached for a day.
  { src: '^/assets/.+\\.[0-9a-f]{10}\\.[a-z0-9]+$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '^/assets/(?!.+\\.[0-9a-f]{10}\\.[a-z0-9]+$).*$', has: [{ type: 'query', key: 'v' }], headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '^/assets/(?!.+\\.[0-9a-f]{10}\\.[a-z0-9]+$).*$', missing: [{ type: 'query', key: 'v' }], headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }, continue: true },
  { src: '/_astro/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '/models/(.*)', headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }, continue: true },
  { src: '^/(?!ar/).*$', headers: sec, continue: true },
  { src: '^/ar/.*$', headers: secAr, continue: true }
];
// Old weatherhaven.com addresses → their pages here (301), so search rankings and saved links carry over.
// Crawled from the live site (138 URLs). Vercel matches routes case-insensitively unless told otherwise, and
// /Military must not catch the new /military/ (a redirect loop), so every one of these is caseSensitive.
const LEGACY = {
  '/AboutUs': '/company/', '/Company': '/company/', '/40th-Anniversary-Book': '/company/history/', '/ContactUs': '/contact/', '/Innovation': '/innovation/',
  '/Products': '/products/', '/Services-Maintenance': '/services/', '/Support-Systems': '/services/support/', '/Supplier-Information': '/buy/suppliers/',
  '/Military': '/military/', '/Military/Military-Camp': '/military/camps/', '/Military/command-control': '/military/c2/', '/Military/simulation-training': '/military/simulation/',
  '/Military/unmanned-aerial-vehicles-satellite-systems': '/military/uav/', '/Military/workshops': '/military/workshops/',
  '/Medical': '/medical/', '/Medical/cbrn': '/medical/cbrn/', '/Medical/emergency-response': '/medical/emergency/', '/Medical/field-hospitals': '/medical/field-hospitals/', '/Medical/medical-clinics': '/medical/clinics/',
  '/Commercial': '/commercial/', '/Commercial/Mobile-Luxury-Recreation-Container': '/commercial/luxury/', '/Commercial/antarctic-climate-research': '/commercial/antarctic/',
  '/Commercial/turn-key-solutions': '/commercial/turnkey/', '/Commercial/workforce-housing': '/commercial/workforce/',
  '/products/expandable-container': '/products/?f=expandable', '/products/soft-shelters': '/products/?f=soft',
  '/products/expandable-container/ateps': '/products/ateps/', '/products/expandable-container/ehmecc': '/products/ehmecc/', '/products/expandable-container/hercon': '/products/hercon/',
  '/products/expandable-container/mecc': '/products/mecc/', '/products/expandable-container/trecc': '/products/trecc/',
  '/products/soft-shelters/mex-26': '/products/mex26/', '/products/soft-shelters/modular-tentage-system': '/products/mts/', '/products/soft-shelters/polar-shelters': '/products/polar/',
  '/products/soft-shelters/rdmss': '/products/rdmss/', '/products/soft-shelters/series-4': '/products/series4/', '/products/soft-shelters/series-8': '/products/series8/',
  '/products/accessories/interconnectors-corridors': '/products/accessories/interconnectors/', '/products/accessories/solarshades': '/products/accessories/solarshade/',
  '/services-maintenance/engineering-design': '/services/engineering/', '/services-maintenance/installation': '/services/installation/', '/services-maintenance/parts': '/services/parts/',
  '/services-maintenance/repair-overhaul': '/services/repair/', '/services-maintenance/training-on-site-support': '/services/training/', '/services-maintenance/transportation-logistics': '/services/logistics/',
  '/support-systems/ablutionwash-houses': '/services/support/ablutions/', '/support-systems/electrical-mechanical-water': '/services/support/emw/', '/support-systems/floors': '/services/support/floors/',
  '/support-systems/kitchen': '/services/support/kitchens/', '/support-systems/laundry': '/services/support/laundry/', '/support-systems/mobilizers-trailers': '/services/support/mobilizers/',
  '/support-systems/security': '/services/support/security/', '/support-systems/sleeping-quarters': '/services/support/sleeping/',
  '/electrical-mechanical-water': '/services/support/emw/', '/laundry': '/services/support/laundry/', '/sleeping-quarters': '/services/support/sleeping/',
};
const esc = p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const legacy = [
  // news articles: /Article?name=… → /news/?article=… (the news page finds the article and opens it)
  { src: '^/Article/?$', caseSensitive: true, has: [{ type: 'query', key: 'name', value: '(?<name>.+)' }], status: 301, headers: { Location: '/news/?article=$name' } },
  { src: '^/(Article|News)/?$', caseSensitive: true, status: 301, headers: { Location: '/news/' } },
  ...Object.entries(LEGACY).map(([from, to]) => ({ src: `^${esc(from)}/?$`, caseSensitive: true, status: 301, headers: { Location: to } })),
];
// drop every header-only route already there (Astro's /_astro cache rule, or ours from an earlier run), then add ours
cfg.routes = [...routes, ...legacy, ...(cfg.routes || []).filter(r => !(r.continue && r.headers && !r.dest && !r.status && !r.handle) && !(r.status === 301 && legacy.some(l => l.src === r.src)))];
fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
console.log(`postbuild: ${legacy.length} legacy redirects; headers added (inline scripts ${inlineElsewhere ? 'allowed everywhere: found outside /ar/' : 'only on /ar/'})`);
