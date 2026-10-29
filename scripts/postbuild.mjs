/* After `astro build`: add security + caching headers to the Vercel build output. */
import fs from 'node:fs';
const p = '.vercel/output/config.json';
const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
const sec = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=(self)', 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io https://va.vercel-scripts.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://plausible.io https://vitals.vercel-insights.com https://*.ingest.sentry.io; media-src 'self'; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" };
const routes = [
  { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '/_astro/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '/(.*)', headers: sec, continue: true }
];
cfg.routes = [...routes, ...(cfg.routes || []).filter(r => !r.__wh)];
routes.forEach(r => r.__wh = 1);
fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
console.log('postbuild: headers added');
