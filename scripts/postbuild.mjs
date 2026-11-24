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
// drop every header-only route already there (Astro's /_astro cache rule, or ours from an earlier run), then add ours
cfg.routes = [...routes, ...(cfg.routes || []).filter(r => !(r.continue && r.headers && !r.dest && !r.status && !r.handle))];
fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
console.log(`postbuild: headers added (inline scripts ${inlineElsewhere ? 'allowed everywhere: found outside /ar/' : 'only on /ar/'})`);
