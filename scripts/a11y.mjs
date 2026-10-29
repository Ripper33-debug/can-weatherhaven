/* Accessibility audit with axe-core on the key pages. Prints violations grouped by rule. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8800';
const PAGES = ['/', '/products/', '/products/trecc/', '/plan/', '/contact/', '/company/', '/services/'];
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
await pg.addInitScript("try{sessionStorage.setItem('wh-intro','1')}catch(e){}");
let total = 0;
for (const path of PAGES) {
  await pg.goto(BASE + path, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForTimeout(path === '/' ? 6000 : 2000);
  await pg.addScriptTag({ content: axe });
  const res = await pg.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } }); return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); });
  total += res.length;
  console.log(`\n${path}: ${res.length} violation types`);
  for (const v of res) console.log(`  [${v.impact}] ${v.id} ×${v.n} — ${v.help}\n      ${v.nodes.join(' | ').slice(0, 220)}`);
}
await b.close();
process.exitCode = total ? 1 : 0;
