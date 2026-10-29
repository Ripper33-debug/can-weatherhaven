/* Performance budget: bytes transferred for the home page before any 3D (must be under 2 MB), and total with the engine. */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8800';
const LIMIT = 2_000_000;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [label, mobile] of [['desktop', false], ['phone', true]]) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' } : { viewport: { width: 1280, height: 800 } });
  const pg = await ctx.newPage(); const seen = new Map();
  pg.on('response', async r => { try { const buf = await r.body(); const u = new URL(r.url()); seen.set(u.pathname, buf.length); } catch { } });
  await pg.goto(BASE + '/', { waitUntil: 'load', timeout: 120000 });
  await pg.waitForTimeout(1500);
  const sum = f => [...seen].filter(([p]) => f(p)).reduce((a, [, n]) => a + n, 0);
  const isEngine = p => /\/assets\/(js|models|draco)\//.test(p);
  const core = sum(p => !isEngine(p)), engine = sum(isEngine);
  const top = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${(n / 1e3).toFixed(0)} kB ${p.split('/').pop()}`).join(', ');
  console.log(`${label}: first load (no 3D) ${(core / 1e6).toFixed(2)} MB ${core <= LIMIT ? 'OK' : 'OVER BUDGET'}; 3D engine+models ${(engine / 1e6).toFixed(2)} MB; total ${((core + engine) / 1e6).toFixed(2)} MB`);
  console.log('   largest:', top);
  await ctx.close();
}
await b.close();
