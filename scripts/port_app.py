"""One-time port of the concept's app.js into src/client/app.js (ES module, real URLs, SSR-able renderers).
Re-runnable: edits are expressed as replacements so the original stays the source of truth until the port is frozen."""
import re, os, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = '/home/claude/weatherhaven-redesign/src'
s = open(os.path.join(OLD, 'app.js'), encoding='utf-8').read()
vj = open(os.path.join(OLD, 'viewer3d.js'), encoding='utf-8').read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n >= 1, 'missing: ' + a[:80]
    if count == 1: assert n == 1, f'ambiguous ({n}): ' + a[:80]
    s = s.replace(a, b)

# fit-out labels for SSR (viewer3d.js owns the geometry; the labels are data)
m = re.search(r"  const FITOUTS = \{\n(.*?)\n  \};", vj, re.S)
fit_src = '{\n' + m.group(1) + '\n}'
import subprocess
fit = json.loads(subprocess.check_output(['node', '-e', 'const F=' + fit_src + '; const o={}; for (const [k,v] of Object.entries(F)) o[k]={label:v.label,t:v.t,d:v.d,eh:!!v.eh}; console.log(JSON.stringify(o))']))
json.dump(fit, open(os.path.join(ROOT, 'src/generated/fitouts.json'), 'w'), indent=1)

# 1. module shell
rep("(function () {\n'use strict';\n", "")
assert s.rstrip().endswith("route();\n})();") or s.rstrip().endswith("})();")
s = s[:s.rstrip().rfind("renderChrome();")]
names = ['SITE','STATS','FAMILIES','PRODUCTS','HQSS','ACCESSORIES','SUPPORT','SERVICES','SECTORS','TIMELINE','PEOPLE','CONTACTS','NEWS','PLACES','FINDER','TRUSTED','OFFICES','ANNOUNCE','MANIFESTO','STORY','PLAN_TYPES','PLAN_EXAMPLES']
imports = '\n'.join(f"import {n} from '../content/{n.lower()}.json';" for n in names)
head = f"""/* Weatherhaven site — client app and build-time page renderers. Ported from the concept SPA. */
{imports}
import IMG from '../generated/img.json';
import IMGPOS from '../generated/imgpos.json';
import FITOUTS_META from '../generated/fitouts.json';
import {{ isBrowser, matchMedia, navigator, sessionStorage }} from './env.js';
export const ASSETS = {{ js: '/assets/js/', models: {{ open: '/assets/models/trecc-open.glb', stowed: '/assets/models/trecc-stowed.glb', dracoPath: '/assets/draco/' }}, ar: '/ar/' }};
"""
s = head + s

# 2. browser globals that run at module load
rep("const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;", "const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;\nconst win = isBrowser ? window : {};")
rep("${(window.IMGPOS || {})[key] ? ` style=\"object-position:${IMGPOS[key]}\"` : ''}", "${IMGPOS[key] ? ` style=\"object-position:${IMGPOS[key]}\"` : ''}")
rep("const FIT = window.SHELTER_FITOUTS || {};", "const FIT = FITOUTS_META;\nconst SHELTER_CLIMATES = { arctic: { label: 'Arctic' }, desert: { label: 'Desert' }, temperate: { label: 'Temperate' }, tropical: { label: 'Tropical' } };")
rep("if (!window.ShelterViewer) return null;", "if (!win.ShelterViewer) return null;")
rep("if (window.ShelterViewer) { sv = storyViewer || new ShelterViewer({ story: true });", "if (win.ShelterViewer) { sv = storyViewer || new win.ShelterViewer({ story: true });")
rep("viewer = new ShelterViewer();", "viewer = new win.ShelterViewer();")
rep("(window.WH_MODELS && WH_MODELS.ar ? `<div class=\"ar-row\"><a class=\"btn btn-line\" href=\"${esc(WH_MODELS.ar)}\">", "(ASSETS.ar ? `<div class=\"ar-row\"><a class=\"btn btn-line\" href=\"${esc(ASSETS.ar)}\">")

# 3. real URLs instead of hash routes
rep("const link = e.target.closest('a[href^=\"#/\"]');\n    if (link && link.getAttribute('href') === location.hash) { e.preventDefault(); route(); }",
    "const link = e.target.closest('a[href]');\n    if (link && isInternal(link)) { e.preventDefault(); navigate(link.getAttribute('href')); }")
s = s.replace('href="#/"', 'href="/"').replace("href=\"#/", "href=\"/").replace("href='#/", "href='/")
s = re.sub(r"(['\"`])#/", r"\1/", s)                      # string literals that start with #/
rep("addEventListener('hashchange', route);", "addEventListener('popstate', () => route());")
rep("const raw = location.hash.replace(/^#\\/?/, '');\n  const [path, qs] = raw.split('?');", "const raw = location.pathname.replace(/^\\/+|\\/+$/g, '');\n  const [path] = raw.split('?'); const qs = location.search.replace(/^\\?/, '');")
rep("else if (location.hash === x.href) route(); else location.hash = x.href; };", "else navigate(x.href); };")
rep("window.__planNote = plSummary(); location.hash = '/contact?product=camp&plan=1'; return; }", "window.__planNote = plSummary(); navigate('/contact?product=camp&plan=1'); return; }")
rep("if (!list.length) { location.hash = '/products/all'; toast(", "if (!list.length) { navigate('/products/all'); toast(")
rep("openCompare(); history.replaceState(null, '', '/products'); return; }", "openCompare(); history.replaceState(null, '', '/products/'); return; }")

# 4. page table shared by SSR and client
rep("function renderPage(page, seg, q, qs, section, pageKey) {\n  let html, init, title;\n  const main = $('#main');\n  teardown();\n  switch (page) {",
    "export function pageFor(page, seg, q, section = null) {\n  let html, init, title;\n  switch (page) {")
rep("""    default: html = `<section class="phero">""", """    default: html = `<section class="phero">""")
rep("""  main.innerHTML = html;
  main.classList.remove('page-enter');""", """  return { html, init, title, section };
}
function renderPage(page, seg, q, qs, section, pageKey) {
  const main = $('#main');
  teardown();
  const R = pageFor(page, seg, q, section); let { html, init, title } = R; section = R.section;
  if (main.dataset.ssr === '1') { delete main.dataset.ssr; } else main.innerHTML = html;
  main.classList.remove('page-enter');""")

# 5. boot + navigation helpers
s += """
/* ---------------- navigation ---------------- */
function isInternal(a) {
  const href = a.getAttribute('href') || '';
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (a.target === '_blank' || a.hasAttribute('download') || /^\\/(assets|ar|api)\\//.test(href)) return false;
  return true;
}
export function navigate(href, replace) {
  const url = new URL(href, location.origin);
  const same = url.pathname === location.pathname && url.search === location.search;
  if (replace) history.replaceState(null, '', url); else if (!same) history.pushState(null, '', url);
  route();
}
export function ssrRender(pathname, search = '') {
  const raw = pathname.replace(/^\\/+|\\/+$/g, '');
  const seg = raw.split('/').filter(Boolean), page = seg[0] || '';
  const q = new URLSearchParams(search.replace(/^\\?/, ''));
  const { html, title } = pageFor(page, seg, q);
  return { html, title, chrome: chromeHTML() };
}
export function boot() {
  renderChrome();
  initHeader();
  tickClocks(); setInterval(tickClocks, 20000);
  initOverlays();
  initGlobal();
  route();
}
"""
# chrome: split renderChrome into a pure HTML builder + DOM writer
rep("function renderChrome() {", "function chromeHTML() {\n  const out = {};")
rep("  $('#hdr').innerHTML = `<div class=\"wrap bar\">", "  out.hdr = `<div class=\"wrap bar\">")
rep("  $('#drawer').innerHTML = drawer + `", "  out.drawer = drawer + `")
rep("  $('#annc').innerHTML = `", "  out.annc = `")
rep("  $('#ftr').innerHTML = `<div class=\"wrap\">", "  out.ftr = `<div class=\"wrap\">")
# close chromeHTML: find the end of the footer template (ends with `</div>`;\n}\n\n/* header behaviour */)
rep("""    <div class="ftr-mark" aria-hidden="true"><img src="${IMG.logo_w}" alt=""></div></div>`;
}
""", """    <div class="ftr-mark" aria-hidden="true"><img src="${IMG.logo_w}" alt=""></div></div>`;
  return out;
}
function renderChrome() {
  if ($('#hdr').dataset.ssr === '1') return;
  const c = chromeHTML();
  $('#hdr').innerHTML = c.hdr; $('#drawer').innerHTML = c.drawer; $('#annc').innerHTML = c.annc; $('#ftr').innerHTML = c.ftr;
}
""")

# 6. posters for the lazy 3D stages + engine gating
rep('    <div class="stage" id="hero-stage"></div>', '    <div class="stage" id="hero-stage" style="background:url(${IMG.p_trecc}) 60% 55%/cover"></div>')
rep('<div class="viewer-card" id="pd-card"><div class="stage" id="pd-stage"></div>', '<div class="viewer-card" id="pd-card"><div class="stage" id="pd-stage" style="background:url(${IMG[p.imgs[0]]}) center/cover"></div>')
rep("""  if (main.dataset.ssr === '1') { delete main.dataset.ssr; } else main.innerHTML = html;""", """  if (main.dataset.ssr === '1') { delete main.dataset.ssr; } else main.innerHTML = html;
  const needs3d = page === '' || page === 'plan' || page === 'record' || (page === 'products' && P(seg[1]) && P(seg[1]).viewer);
  const init0 = init, run = init0 ? () => { if (lastPage === pageKey) init0(); } : () => { };
  if (needs3d && !win.ShelterViewer && win.__whLoadEngine) { init = null; win.__whLoadEngine().then(run, run); }""")

# 7. mobile-first hero: photo + short deploy clip, 3D on tap. Desktop unchanged.
rep("""function initHome() {
  const stage = $('#hero-stage'), hero = $('#hero');
  const v = getViewer();
  const first = !initHome.played; initHome.played = true;
  if (v && v.mount(stage,""", """const isPhone = () => matchMedia('(max-width: 759px)').matches;
function mobileHero(stage, hero) {
  hero.classList.add('go', 'no-anim', 'hero-mobile');
  stage.innerHTML = `<video class="hero-clip" autoplay muted loop playsinline preload="metadata" poster="/assets/img/hero-deploy-poster.jpg" aria-label="The TRECC deploying: five to eight feet high, three times the floor"><source src="/assets/img/hero-deploy.mp4" type="video/mp4"></video>`;
  const dock = $('#hero-dock'); const dep = $('[data-deploy]', dock);
  if (dep) { $('.t', dep).textContent = 'Open 3D model'; dep.setAttribute('aria-pressed', 'false'); }
  const open = e => {
    e && e.preventDefault(); if (hero.classList.contains('loading3d')) return; hero.classList.add('loading3d');
    if (dep) $('.t', dep).textContent = 'Loading…';
    try { sessionStorage.setItem('wh-3d-mobile', '1'); } catch (_) { }
    const go = () => { if (!document.body.contains(hero)) return; hero.classList.remove('hero-mobile', 'loading3d'); stage.innerHTML = ''; if (dep) $('.t', dep).textContent = 'Deploy'; initHome.played = true; initHero(stage, hero, true); };
    (win.__whLoadEngine ? win.__whLoadEngine() : Promise.resolve()).then(go, go);
  };
  dep && dep.addEventListener('click', open, { once: false });
  cleanups.push(() => { dep && dep.removeEventListener('click', open); });
}
function initHome() {
  const stage = $('#hero-stage'), hero = $('#hero');
  let wants3d = true; try { wants3d = !isPhone() || sessionStorage.getItem('wh-3d-mobile') === '1'; } catch (_) { }
  if (!wants3d && !win.ShelterViewer) mobileHero(stage, hero); else initHero(stage, hero, false);
  initGlobe(); initLifecycle(); initManifesto(); initStory(); initQuotes();
}
function initHero(stage, hero, fromMobile) {
  const v = getViewer();
  const first = !initHome.played && !fromMobile; initHome.played = true;
  if (v && v.mount(stage,""")
rep("""    hero.classList.add('go', 'no-anim');
  }
  initGlobe(); initLifecycle(); initManifesto(); initStory();
  // quotes""", """    hero.classList.add('go', 'no-anim');
  }
}
function initQuotes() {
  // quotes""")
# engine gating: the home page on a phone defers the engine until the user asks for it
rep("const needs3d = page === '' || page === 'plan'", "const needs3d = (page === '' && (!isPhone() || sessionStorage.getItem('wh-3d-mobile') === '1')) || page === 'plan'")

# 8. contact form posts to /api/quote
rep("""      <div class="sub"><button class="btn btn-primary" type="submit">Send request</button><p>Prefer the phone? Call ${SITE.tollFree}.</p></div>""",
    """      <div class="field hp" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="sub"><button class="btn btn-primary" type="submit">Send request</button><p>Prefer the phone? Call ${SITE.tollFree}.</p></div><p class="form-err" role="alert" hidden></p>""")
rep("""  if (/[?&]plan=1/.test(location.hash)) {""", """  if (/[?&]plan=1/.test(location.search)) {""")
rep("""    const p = P(f.product.value);
    const t = team[f.region.value] || (f.sector.value === 'commercial' ? 'global commercial' : 'sales');
    $('#form-wrap').innerHTML = `<div class="sent" tabindex="-1" id="sent"><h3>Request ready, ${esc(name.split(' ')[0])}.</h3><p class="muted">On the live site this goes straight to the ${esc(t)} team${p ? ` with your interest in the ${esc(p.name)}` : ''}. This is a design concept, so nothing was sent.</p><p style="margin-top:18px"><a class="link" href="/products">Keep browsing products</a></p></div>`;
    $('#sent').focus();""", """    const p = P(f.product.value);
    const t = team[f.region.value] || (f.sector.value === 'commercial' ? 'global commercial' : 'sales');
    const btn = $('button[type=submit]', f), err = $('.form-err', f); btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true;
    const data = Object.fromEntries(new FormData(f).entries()); data.page = location.href;
    fetch('/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json().then(j => ({ ok: r.ok && j.ok, j })), () => ({ ok: false, j: {} })).then(({ ok, j }) => {
      if (!ok) { btn.disabled = false; btn.textContent = 'Send request'; err.textContent = (j && j.error) || 'We could not send that just now. Please call us or try again.'; err.hidden = false; return; }
      $('#form-wrap').innerHTML = `<div class="sent" tabindex="-1" id="sent"><h3>Thanks, ${esc(name.split(' ')[0])}. Your request is on its way.</h3><p class="muted">It goes to the ${esc(t)} team${p ? ` with your interest in the ${esc(p.name)}` : ''}. We’ll reply by email${f.phone.value.trim() ? ' or phone' : ''}.</p><p style="margin-top:18px"><a class="link" href="/products">Keep browsing products</a></p></div>`;
      $('#sent').focus();
    });""")

# 9. accessibility: manifesto exposes real text; tab lists get tabpanels; footer h4 → h2 (visually unchanged)
rep("""    <p class="mf" id="mf" aria-label="${esc(MANIFESTO)}">${MANIFESTO.split(' ').map(w => `<span aria-hidden="true">${esc(w)} </span>`).join('')}</p>""",
    """    <p class="mf" id="mf">${MANIFESTO.split(' ').map(w => `<span>${esc(w)} </span>`).join('')}</p>""")
for h in ['Solutions', 'Products', 'Company', 'Regional websites']:
    s = s.replace('<div><h4>' + h + '</h4>', '<div><h2 class="ftr-h">' + h + '</h2>')
s = s.replace('<h4 style="margin-top:24px">Follow</h4>', '<h2 class="ftr-h" style="margin-top:24px">Follow</h2>')

# 10. tab-like widgets become toggle-button groups (their content is inline, not in separate panels)
for a, b in [('<div class="step-list" role="tablist" aria-label="Services">', '<div class="step-list" role="group" aria-label="Services">'),
             ('<div class="scale-tabs" role="tablist" aria-label="Product">', '<div class="scale-tabs" role="group" aria-label="Product">'),
             ('<div class="tl-track" role="tablist" aria-label="Years">', '<div class="tl-track" role="group" aria-label="Years">')]:
    rep(a, b)
s = s.replace('<button role="tab" data-step=', '<button data-step=').replace('<button role="tab" data-scale=', '<button data-scale=').replace('<button role="tab" data-tl=', '<button data-tl=')
s = s.replace('aria-selected', 'aria-pressed')

# 11. copy: proof strip after the hero; services in depth; sourced from weatherhaven.com (data.js / scraped pages)
rep("""  <section class="manifesto" id="manifesto"><div class="wrap">""", """  <section class="proof" aria-label="Weatherhaven at a glance"><div class="wrap proof-in">${STATS.map(s => `<div><b class="num">${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join('')}</div></section>
  <section class="manifesto" id="manifesto"><div class="wrap">""")
rep("""  <section class="sec ice" id="support"><div class="wrap"><div class="sec-head"><h2 class="h-l">Support systems</h2>""", """  <section class="sec ice" id="services-detail"><div class="wrap"><div class="sec-head"><h2 class="h-l">Each service, in detail.</h2><p class="lead">What the teams do at each stage, from the services pages on weatherhaven.com.</p></div>
    <div class="svc-grid">${SERVICES.map(s => `<article class="svc" id="svc-${s.id}"><div class="svc-img">${img(s.img, s.name)}</div><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><ul class="ticks">${(s.detail || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul></article>`).join('')}</div></div></section>
  <section class="sec" id="support"><div class="wrap"><div class="sec-head"><h2 class="h-l">Support systems</h2>""")
rep("""  <section class="sec" id="accessories"><div class="wrap"><div class="sec-head"><h2 class="h-l">Accessories</h2><p class="lead">Solarshades""", """  <section class="sec ice" id="accessories"><div class="wrap"><div class="sec-head"><h2 class="h-l">Accessories</h2><p class="lead">Solarshades""")

# 12. the record page is the globe as a page: give it an h1 (the section's own heading stays an h2 on the home page)
rep("""function pageRecord() { return `<div style="padding-top:var(--top0);background:var(--navy-900)"></div>${globeSection()}${ctaBand()}`; }""",
    """function pageRecord() { return `<div style="padding-top:var(--top0);background:var(--navy-900)"></div>${globeSection().replace('<h2 class="h-l">A field record on every continent.</h2>', '<h1 class="h-l">A field record on every continent.</h1>')}${ctaBand()}`; }""")

open(os.path.join(ROOT, 'src/client/app.js'), 'w', encoding='utf-8').write(s)
print('ok', len(s))
