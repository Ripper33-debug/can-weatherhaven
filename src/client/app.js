/* Weatherhaven site — client app and build-time page renderers. Ported from the concept SPA. */
import SITE from '../content/site.json';
import STATS from '../content/stats.json';
import FAMILIES from '../content/families.json';
import PRODUCTS from '../content/products.json';
import HQSS from '../content/hqss.json';
import ACCESSORIES from '../content/accessories.json';
import SUPPORT from '../content/support.json';
import SERVICES from '../content/services.json';
import SECTORS from '../content/sectors.json';
import TIMELINE from '../content/timeline.json';
import PEOPLE from '../content/people.json';
import CONTACTS from '../content/contacts.json';
import NEWS from '../content/news.json';
import PLACES from '../content/places.json';
import FINDER from '../content/finder.json';
import TRUSTED from '../content/trusted.json';
import OFFICES from '../content/offices.json';
import ANNOUNCE from '../content/announce.json';
import MANIFESTO from '../content/manifesto.json';
import STORY from '../content/story.json';
import PLAN_TYPES from '../content/plan_types.json';
import PLAN_EXAMPLES from '../content/plan_examples.json';
import IMG from '../generated/img.json';
import IMGPOS from '../generated/imgpos.json';
import FITOUTS_META from '../generated/fitouts.json';
import { isBrowser, matchMedia, navigator, sessionStorage } from './env.js';
export const ASSETS = { js: '/assets/js/', models: { open: '/assets/models/trecc-open.glb', stowed: '/assets/models/trecc-stowed.glb', dracoPath: '/assets/draco/' }, ar: '/ar/' };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const win = isBrowser ? window : {};
const P = id => PRODUCTS.find(p => p.id === id);
const img = (key, alt = '', attrs = '') => IMG[key] ? `<img src="${IMG[key]}" alt="${esc(alt)}" decoding="async"${/loading=/.test(attrs) ? '' : ' loading="lazy"'}${IMGPOS[key] ? ` style="object-position:${IMGPOS[key]}"` : ''} ${attrs}>` : '';

/* ---------------- icons ---------------- */
const I = {
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>',
  page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>',
  drag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 9 4 12l4 3M16 9l4 3-4 3M4 12h16"/></svg>',
  door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4h10v17M3 21h18M15 4l4 1.5V21"/><circle cx="12" cy="13" r=".8" fill="currentColor"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>'
};

/* ---------------- nav model ---------------- */
const NAV = [
  { key: 'solutions', label: 'Solutions', routes: ['military', 'medical', 'commercial'], cols: ['military', 'medical', 'commercial'].map(k => ({ title: SECTORS[k].name, href: `/${k}`, blurb: SECTORS[k].lead.split('. ')[0] + '.', items: SECTORS[k].apps.map(a => ({ t: a.name, href: `/${k}/${a.id}` })) })), feature: { t: 'Not sure what you need?', d: 'Answer four questions and get the systems that fit your mission, transport and climate.', a: 'Find a shelter', action: 'finder', img: 'mil_rapid' } },
  { key: 'products', label: 'Products', routes: ['products'], cols: [
    { title: FAMILIES.expandable.name, href: '/products?f=expandable', blurb: 'Ship compact, open big. ISO-standard and pallet-sized.', items: PRODUCTS.filter(p => p.family === 'expandable').map(p => ({ t: p.name, s: p.list.gain, href: `/products/${p.id}` })) },
    { title: FAMILIES.soft.name, href: '/products?f=soft', blurb: 'Tensioned fabric shelters for every climate on Earth.', items: PRODUCTS.filter(p => p.family === 'soft').map(p => ({ t: p.name, s: p.list.gain, href: `/products/${p.id}` })) },
    { title: 'Complete the system', href: '/services', blurb: 'Everything that turns shelters into a working camp.', items: [{ t: 'Camp planner', s: 'New', href: '/plan' }, { t: 'Accessories', href: '/products/accessories' }, { t: 'Support systems', href: '/services/support' }, { t: 'Compare products', href: '/products/compare' }, { t: 'In-stock inventory', s: 'PDF', href: SITE.instock, ext: 1 }, { t: 'RFP guide', s: 'PDF', href: SITE.rfpGuide, ext: 1 }] }
  ], feature: { t: 'Watch a MECC deploy', d: 'Fold it out in real time, raise the roof as an EHMECC, and change the climate around it.', a: 'Open the 3D model', href: '/products/mecc/viewer', img: 'p_mecc' } },
  { key: 'services', label: 'Services', routes: ['services'], href: '/services' },
  { key: 'company', label: 'Company', routes: ['company', 'innovation', 'news'], cols: [
    { title: 'About Weatherhaven', href: '/company', blurb: 'Designing, building and supporting redeployable shelter since 1981.', items: [{ t: 'Our story', href: '/company/about' }, { t: 'History', href: '/company/history' }, { t: 'Leadership', href: '/company/leadership' }, { t: 'Where we’ve worked', href: '/record' }] },
    { title: 'Innovation', href: '/innovation', blurb: '51 patents in 30 countries, and a world-class engineering team.', items: [{ t: 'Engineering & patents', href: '/innovation/engineering' }, { t: 'HQSS spec sheet', href: '/innovation/hqss' }, { t: 'Expandable space', href: '/innovation/expandable' }, { t: 'Energy efficiency', href: '/innovation/energy' }] },
    { title: 'News & contact', href: '/news', blurb: 'Announcements, events and the right person to talk to.', items: [{ t: 'Latest news', href: '/news' }, { t: 'Contact & offices', href: '/contact' }, { t: 'Supplier information', href: SITE.supplier, ext: 1 }, { t: '40th anniversary book', href: SITE.book, ext: 1 }] }
  ], feature: { t: 'A field record on every continent', d: 'Explore four decades of camps, hospitals and research stations on the globe.', a: 'Explore the map', href: '/record', img: 'antarctica' } }
];

/* ---------------- header / footer ---------------- */
function linkAttrs(href, ext) { return ext ? `href="${href}" target="_blank" rel="noopener"` : `href="${href}"`; }
function chromeHTML() {
  const out = {};
  const nav = NAV.map(n => {
    if (n.href) return `<li data-key="${n.key}"><a class="nav-t" href="${n.href}">${n.label}</a></li>`;
    const cols = n.cols.map(c => `<div class="mega-col"><h3><a href="${c.href}">${esc(c.title)}</a></h3><p>${esc(c.blurb)}</p><ul>${c.items.map(i => `<li><a ${linkAttrs(i.href, i.ext)}><b>${esc(i.t)}</b>${i.s ? `<span>${esc(i.s)}</span>` : ''}</a></li>`).join('')}</ul></div>`).join('');
    const f = n.feature;
    const feat = `<div class="mega-feature"><div class="ph" style="background-image:url(${IMG[f.img]})"></div><div><h4>${esc(f.t)}</h4><p>${esc(f.d)}</p></div>${f.action ? `<button class="btn btn-primary btn-sm" data-action="${f.action}">${esc(f.a)}</button>` : `<a class="btn btn-primary btn-sm" href="${f.href}">${esc(f.a)}</a>`}</div>`;
    return `<li data-key="${n.key}"><button class="nav-t" aria-expanded="false" aria-controls="mega-${n.key}">${n.label}${I.chev}</button><div class="mega" id="mega-${n.key}"><div class="wrap mega-in">${cols}${feat}</div></div></li>`;
  }).join('');
  const drawer = NAV.map(n => n.href ? `<a class="d-link" href="${n.href}">${n.label}</a>` : `<details><summary>${n.label}${I.chev}</summary><ul>${n.cols.map(c => `<li><a href="${c.href}"><b>${esc(c.title)}</b></a></li>` + c.items.map(i => `<li><a ${linkAttrs(i.href, i.ext)}>${esc(i.t)}</a></li>`).join('')).join('')}</ul></details>`).join('');
  out.hdr = `<div class="wrap bar">
    <a class="brand" href="/" aria-label="Weatherhaven home"><img class="l-white" src="${IMG.logo_w}" alt="Weatherhaven"><img class="l-navy" src="${IMG.logo_n}" alt="Weatherhaven"></a>
    <ul class="nav" role="list">${nav}</ul>
    <div class="hdr-r">
      <button class="search-btn" data-action="search" aria-label="Search the site">${I.search}<span class="lbl">Search</span><kbd>${navigator.platform && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd></button>
      <a class="instock" href="${SITE.instock}" target="_blank" rel="noopener"><i></i>In stock</a>
      <a class="btn btn-primary btn-sm" href="/contact">Contact us</a>
      <button class="burger" aria-label="Open menu" aria-expanded="false">${I.menu}</button>
    </div></div>`;
  out.drawer = drawer + `<div class="d-actions"><button class="btn btn-line" data-action="search">${I.search}Search</button><button class="btn btn-line" data-action="finder">Find a shelter</button><a class="btn btn-line" href="${SITE.instock}" target="_blank" rel="noopener">In-stock inventory</a><a class="btn btn-primary" href="/contact">Contact us</a></div>`;

  out.annc = `<div class="wrap annc-in"><span class="annc-tag">News</span><a href="${ANNOUNCE.url}" target="_blank" rel="noopener">${esc(ANNOUNCE.t)}<span class="annc-go" aria-hidden="true">${I.right}</span></a><button class="annc-x" aria-label="Dismiss announcement">${I.x}</button></div>`;
  out.ftr = `<div class="wrap">
    <div class="clocks" role="group" aria-label="Local time at Weatherhaven sites">${OFFICES.map(o => `<div><span>${esc(o.n)}</span><b class="num" data-tz="${o.tz}">--:--</b><small>${esc(o.s)}</small></div>`).join('')}</div>
    <div class="ftr-top">
      <div><img src="${IMG.logo_w}" alt="Weatherhaven" style="height:26px;width:auto"><div class="addr">${SITE.address.join('<br>')}<br><br>Toll free (Canada & USA) <a href="tel:${SITE.tollFree}">${SITE.tollFree}</a><br>International <a href="tel:${SITE.intl}">${SITE.intl}</a><br><a href="mailto:${SITE.email}">${SITE.email}</a></div></div>
      <div><h2 class="ftr-h">Solutions</h2><ul><li><a href="/military">Military</a></li><li><a href="/medical">Medical</a></li><li><a href="/commercial">Commercial</a></li><li><a href="#" data-action="finder">Find a shelter</a></li></ul></div>
      <div><h2 class="ftr-h">Products</h2><ul><li><a href="/products?f=expandable">Expandable containers</a></li><li><a href="/products?f=soft">Softwall shelters</a></li><li><a href="/plan">Camp planner</a></li><li><a href="/products/accessories">Accessories</a></li><li><a href="/services/support">Support systems</a></li><li><a href="${SITE.instock}" target="_blank" rel="noopener">In-stock inventory</a></li></ul></div>
      <div><h2 class="ftr-h">Company</h2><ul><li><a href="/company">About</a></li><li><a href="/innovation">Innovation</a></li><li><a href="/services">Services</a></li><li><a href="/news">News</a></li><li><a href="${SITE.supplier}" target="_blank" rel="noopener">Supplier information</a></li><li><a href="${SITE.iso}" target="_blank" rel="noopener">ISO 9001:2015 certificate</a></li></ul></div>
      <div><h2 class="ftr-h">Regional websites</h2><ul>${SITE.regional.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener">${r.name}</a></li>`).join('')}</ul><h2 class="ftr-h" style="margin-top:24px">Follow</h2><ul>${SITE.social.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener">${r.name}</a></li>`).join('')}</ul></div>
    </div>
    <div class="ftr-bot"><span>© 2026 Weatherhaven Global Resources Ltd. All rights reserved.</span><span class="concept"><i></i>Website redesign concept — content from weatherhaven.com</span></div>
    <div class="ftr-mark" aria-hidden="true"><img src="${IMG.logo_w}" alt=""></div></div>`;
  return out;
}
function renderChrome() {
  if ($('#hdr').dataset.ssr === '1') return;
  const c = chromeHTML();
  $('#hdr').innerHTML = c.hdr; $('#drawer').innerHTML = c.drawer; $('#annc').innerHTML = c.annc; $('#ftr').innerHTML = c.ftr;
}

/* header behaviour */
function initHeader() {
  const hdr = $('#hdr');
  const root = document.documentElement;
  let barOff = true; try { barOff = sessionStorage.getItem('wh-annc') !== 'on'; } catch (_) { }
  root.classList.toggle('has-bar', !barOff);
  $('.annc-x').addEventListener('click', () => { root.classList.remove('has-bar'); try { sessionStorage.setItem('wh-annc', 'off'); } catch (_) { } });
  const onScroll = () => { const y = window.scrollY > 24; hdr.classList.toggle('solid', y || document.body.dataset.solid === '1'); root.classList.toggle('scrolled', y); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  let closeT;
  const closeAll = except => $$('.nav>li.on', hdr).forEach(li => { if (li !== except) { li.classList.remove('on'); const b = $('.nav-t', li); b && b.setAttribute('aria-expanded', 'false'); } });
  $$('.nav>li', hdr).forEach(li => {
    const btn = $('button.nav-t', li); if (!btn) return;
    const open = () => { clearTimeout(closeT); closeAll(li); li.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); };
    btn.addEventListener('click', () => { li.classList.contains('on') ? (li.classList.remove('on'), btn.setAttribute('aria-expanded', 'false')) : open(); });
    li.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) open(); });
    li.addEventListener('mouseleave', () => { closeT = setTimeout(() => { li.classList.remove('on'); btn.setAttribute('aria-expanded', 'false'); }, 160); });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) closeAll(); if (e.target.closest('.mega a')) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); setDrawer(false); } });
  const burger = $('.burger', hdr);
  burger.addEventListener('click', () => setDrawer(!hdr.classList.contains('open')));
  $('#drawer').addEventListener('click', e => { if (e.target.closest('a,button[data-action]')) setDrawer(false); });
}
function tickClocks() {
  $$('[data-tz]').forEach(b => { try { b.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: b.dataset.tz }).format(new Date()); } catch (_) { } });
}
function setDrawer(on) {
  const hdr = $('#hdr'); hdr.classList.toggle('open', on);
  const b = $('.burger', hdr); b.setAttribute('aria-expanded', on); b.innerHTML = on ? I.x : I.menu; b.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
  document.body.style.overflow = on ? 'hidden' : '';
}

/* ---------------- shared bits ---------------- */
function crumbs(list) { return `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a>${list.map(([t, h]) => `<span aria-hidden="true">/</span>${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}`).join('')}</nav>`; }
function pageHero({ crumb, title, lead, imgKey, stats, actions, sub }) {
  return `<section class="phero"><div class="wrap phero-in">
    <div class="phero-copy">${crumbs(crumb)}<h1 class="h-xl">${esc(title)}</h1>${sub ? `<p class="kicker" style="margin:-6px 0 0;font-size:17px">${esc(sub)}</p>` : ''}<p class="lead">${esc(lead)}</p>
    ${actions ? `<div class="hero-cta">${actions}</div>` : ''}
    ${stats ? `<div class="pstats">${stats.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>` : ''}</div>
    <div class="phero-img">${img(imgKey, '', 'loading="eager" fetchpriority="high"')}</div></div></section>`;
}
function ctaBand(title = 'Tell us what you need to deploy.', lead = 'From a single shelter to a turnkey camp, we’ll work with you on a redeployable solution that suits your operation.', imgKey = 'workforce') {
  return `<section class="cta"><div class="ph" style="background-image:url(${IMG[imgKey]})"></div><div class="wrap cta-in"><div><h2 class="h-l">${esc(title)}</h2><p class="lead">${esc(lead)}</p></div><div class="acts"><a class="btn btn-primary" href="/contact">Contact us</a><a class="btn btn-ghost" href="${SITE.rfpGuide}" target="_blank" rel="noopener">${I.doc}Download the RFP guide</a></div></div></section>`;
}
function productChips(ids) { return ids.map(id => P(id)).filter(Boolean).map(p => `<a class="chip" href="/products/${p.id}">${esc(p.name)}</a>`).join(''); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600); }

/* ---------------- 3D viewer singleton ---------------- */
let viewer = null, viewerUI = null, storyViewer = null;
const FIT = FITOUTS_META;
const SHELTER_CLIMATES = { arctic: { label: 'Arctic' }, desert: { label: 'Desert' }, temperate: { label: 'Temperate' }, tropical: { label: 'Tropical' } };
function insidePickTrecc() { return `<div class="inside-pick ip-trecc" role="group" aria-label="Step inside the TRECC"><button type="button" data-fit="trecc" aria-pressed="false">${I.door}Step inside</button></div>`; }
function insidePick(label = 'Step inside') { return `<div class="inside-pick" role="group" aria-label="Step inside an illustrative interior"><span class="ip-label">${I.door}${label}</span>${Object.entries(FIT).map(([k, f]) => `<button type="button" data-fit="${k}" aria-pressed="false">${esc(f.label)}</button>`).join('')}</div>`; }
function insideUI(kind) {
  const tr = kind === 'trecc';
  return `<div class="inside-ui" aria-hidden="true" inert>
    <button type="button" class="inside-back">${I.left}<span>Back outside</span></button>
    <div class="inside-card" role="region" aria-label="Interior view"><span class="ill">${tr ? 'Weatherhaven CAD model' : 'Illustrative layout'}</span><h2 data-ft>${tr ? 'Inside the TRECC' : ''}</h2><p data-fd>${tr ? 'The interior as drawn in Weatherhaven’s CAD: panels, fittings and the centre core that carries the furnishings in transit.' : ''}</p><p class="inside-status">Deploying the ${tr ? 'TRECC' : 'MECC'} first…</p>
      ${tr ? '' : `<div class="seg inside-tabs" role="group" aria-label="Choose an interior">${Object.entries(FIT).map(([k, f]) => `<button type="button" data-fit="${k}" aria-pressed="false">${esc(f.label)}</button>`).join('')}</div>`}
      <p class="inside-hint">${I.drag}Drag to look around · Esc to step out</p></div></div>`;
}
function getViewer() {
  if (viewer) return viewer;
  if (!win.ShelterViewer) return null;
  viewer = new win.ShelterViewer();
  if (!viewer.ok) return null;
  window.__whViewer = viewer;
  viewer.on(s => viewerUI && viewerUI(s));
  return viewer;
}
const CLIMATE_NOTES = {
  arctic: 'Antarctic camps since 1988 — more than 20 of the 32 countries conducting climate change research in Antarctica use Weatherhaven products.',
  desert: 'Solarshades block 95% of UV. Compared with standard insulation, they cut fuel use by 2,631 litres a year.',
  temperate: 'Weatherhaven shelters go from set-up to fully operational in 20 minutes.',
  tropical: 'For hot, humid sites, Series 8 tropical models add Cool White™ materials and maximum ventilation.'
};
// shown while storm mode is on — all from weatherhaven.com
const STORM_NOTES = {
  arctic: '“Big winter storm with 70mph winds at Red Mountain last night! Our crews were cozy in our tough Weatherhaven tents.” — IDM Mining Camp',
  desert: 'Expandable containers can be over-pressurized to protect against dust and other contaminants.',
  temperate: '“11 fabric shelters from Weatherhaven were still standing, having withstood gales that had pulverized 7 wooden buildings.” — Mike Kenney, Matrix Aviation Solutions, Baffinland Mining Camp',
  tropical: 'Expandables protect personnel and equipment in all weather — extreme heat, high humidity, snow and hail.'
};
function ftIn(h) { const ft = Math.floor(h + 1e-6), inch = Math.round((h - ft) * 12); return inch ? `${ft}\u0027${inch}\u0022` : `${ft}\u0027`; }
const PAINTS = [['green', 'Green'], ['tan', 'Tan'], ['white', 'Arctic white']];
function paintPick() { return `<div class="paint" role="group" aria-label="Paint finish">${PAINTS.map(([k, n]) => `<button type="button" data-paint="${k}" aria-pressed="false" aria-label="${n}" title="${n}"></button>`).join('')}</div>`; }
function climateSeg(cur) { return `<div class="seg" role="group" aria-label="Environment">${Object.entries(SHELTER_CLIMATES).map(([k, c]) => `<button type="button" data-climate="${k}" aria-pressed="${k === cur}">${c.label}</button>`).join('')}</div>`; }
function bindViewerControls(root, v, opts = {}) {
  const btn = $('[data-deploy]', root), range = $('[data-scrub]', root), eh = $('[data-eh]', root), note = $('[data-cnote]', root), temp = $('[data-ctemp]', root);
  const area = $('[data-area]', root), height = $('[data-height]', root), width = $('[data-width]', root);
  btn && btn.addEventListener('click', () => v.toggle());
  range && range.addEventListener('input', () => v.scrub(range.value / 100));
  eh && eh.addEventListener('change', () => v.setExtended(eh.checked));
  const tod = $('[data-tod]', root), storm = $('[data-storm]', root);
  tod && tod.addEventListener('input', () => v.setTimeOfDay(tod.value / 100));
  storm && storm.addEventListener('change', () => v.setStorm(storm.checked));
  $$('[data-climate]', root).forEach(b => b.addEventListener('click', () => { v.setClimate(b.dataset.climate); }));
  $$('[data-paint]', root).forEach(b => b.addEventListener('click', () => v.setPaint(b.dataset.paint)));
  const xrT = $('[data-xray-toggle]', root), xrS = $('[data-xray]', root);
  xrT && xrT.addEventListener('change', () => { v.setXray(xrT.checked ? 1 : 0); if (xrT.checked && v.pT < 1) v.deploy(true); });
  xrS && xrS.addEventListener('input', () => { v.setXray(xrS.value / 100); if (+xrS.value > 0 && v.pT < 1) v.deploy(true); });
  const iroot = opts.insideRoot || root, ui = $('.inside-ui', iroot);
  let wasIn = false;
  if (ui) {
    $$('[data-fit]', iroot).forEach(b => b.addEventListener('click', () => v.enterFitout(b.dataset.fit)));
    $('.inside-back', ui).addEventListener('click', () => v.exitFitout());
    const onKey = e => { if (e.key === 'Escape' && wasIn && v.container && iroot.contains(v.container)) v.exitFitout(); };
    document.addEventListener('keydown', onKey); cleanups.push(() => document.removeEventListener('keydown', onKey));
  }
  const insideSync = s => {
    if (!ui) return;
    const on = !!s.inside;
    iroot.classList.toggle('is-inside', on); iroot.classList.toggle('is-pending', !!s.pending);
    ui.setAttribute('aria-hidden', String(!on)); ui.inert = !on;
    const f = FIT[s.fitout]; if (f && s.model !== 'trecc') { $('[data-ft]', ui).textContent = f.t; $('[data-fd]', ui).textContent = f.d; }
    $$('[data-fit]', iroot).forEach(b => b.setAttribute('aria-pressed', String(on && b.dataset.fit === s.fitout)));
    const a = document.activeElement;
    if (on && !wasIn && a && a.closest && a.closest('[data-fit]') && !ui.contains(a)) setTimeout(() => $('.inside-back', ui).focus({ preventScroll: true }), 60);
    if (!on && wasIn && a && ui.contains(a)) { const b = $('.inside-pick [data-fit]', iroot); b && b.focus({ preventScroll: true }); }
    wasIn = on;
  };
  viewerUI = s => {
    insideSync(s);
    if (btn) { const on = v.pT > 0.5; btn.setAttribute('aria-pressed', on); $('.t', btn).textContent = on ? 'Pack up' : 'Deploy'; }
    if (range && document.activeElement !== range) { range.value = Math.round(s.p * 100); }
    if (range) range.style.setProperty('--v', Math.round(s.p * 100) + '%');
    if (eh) eh.checked = v.eT > 0.5;
    if (area) area.textContent = s.tr ? s.tr.mult.toFixed(1) + '×' : s.area.toLocaleString('en-US') + ' ft²';
    if (width) width.textContent = `≈ 20\u0027 × ${Math.round(8 + 16 * (s.area - 160) / 320)}\u0027`;
    if (height) height.textContent = ftIn(s.tr ? s.tr.height : s.height);
    const su = $('[data-su]', root), tm = $('[data-tm]', root), ehOn = v.eT > 0.5 || s.e > 0.5;
    if (su) { $('small', su).textContent = ehOn ? 'Deploys with' : 'Set-up'; $('b', su).textContent = ehOn ? 'No special tools' : '2 people'; }
    if (tm) tm.hidden = ehOn;
    $$('[data-climate]', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.climate === s.climate));
    $$('[data-paint]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paint === s.paint)));
    if (xrT) xrT.checked = (v.xrayT || 0) > 0.5;
    if (xrS && document.activeElement !== xrS) { xrS.value = Math.round((s.xray || 0) * 100); xrS.style.setProperty('--v', xrS.value + '%'); }
    if (tod) { if (document.activeElement !== tod) tod.value = Math.round((s.tod == null ? 0.55 : s.tod) * 100); tod.style.setProperty('--v', tod.value + '%'); }
    if (storm) storm.checked = !!s.storm;
    if (note) note.textContent = (s.storm ? STORM_NOTES : CLIMATE_NOTES)[s.climate];
    if (temp) temp.textContent = SHELTER_CLIMATES[s.climate].label;
  };
  viewerUI(v.state());
}

/* ---------------- HOME ---------------- */
function pageHome() {
  const routerCols = ['military', 'medical', 'commercial'].map(k => {
    const s = SECTORS[k];
    return `<article class="rt"><a class="rt-img" href="/${k}" tabindex="-1" aria-hidden="true">${img(s.img)}</a><div class="rt-body"><h3><a href="/${k}">${s.name}</a></h3><p>${esc(s.lead)}</p><div class="rt-list">${s.apps.map(a => `<a href="/${k}/${a.id}">${esc(a.name)}${I.right}</a>`).join('')}</div></div></article>`;
  }).join('');
  return `
  <section class="hero" id="hero">
    <div class="stage" id="hero-stage" style="background:url(${IMG.p_trecc}) 60% 55%/cover"></div>
    <div class="hero-shade"></div>
    <div class="drag-hint">${I.drag}Drag to rotate</div>
    <div class="wrap hero-copy">
      <h1 class="h-xl"><span class="ln"><span>Rapidly deploying shelter,</span></span> <span class="ln"><span>anywhere in the world.</span></span></h1>
      <p class="lead">Expandable containers, softwall shelters and complete camps for military, medical and commercial operations. Founded in Canada in 1981, deployed in more than 95 countries.</p>
      <div class="hero-cta"><button class="btn btn-primary" data-action="finder">Find the right shelter</button><a class="btn btn-ghost" href="/products">Explore products</a></div>
      ${insidePickTrecc()}
    </div>
    ${insideUI('trecc')}
    <div class="dock"><div class="wrap">
      <div class="dock-tray" id="hero-tray" hidden>
        <div class="tray-row"><span class="tray-k">Finish</span>${paintPick()}<span class="tray-sep"></span><label class="toggle" title="Section cut: see inside the deployed unit"><input type="checkbox" data-xray-toggle>X-ray</label><span class="tray-sep"></span><label class="tod" title="Time of day">${I.sun}<input type="range" min="0" max="100" value="55" data-tod aria-label="Time of day, from midday to night">${I.moon}</label><label class="toggle"><input type="checkbox" data-storm>Storm</label></div>
        <div class="tray-row"><span class="tray-k">Deployment</span><input type="range" min="0" max="100" value="0" data-scrub aria-label="Deployment progress" class="tray-scrub"><span class="tray-facts"><span data-su0><small>Set-up</small><b>1–2 people</b></span><span data-tm0><small>Time</small><b>A few minutes</b></span></span><button type="button" class="present-btn" data-action="present" title="Present mode (P)">${I.play}Present<kbd>P</kbd></button></div>
        <p class="climate-note" data-cnote></p>
      </div>
      <div class="dock-in" id="hero-dock">
      <div class="dock-cell"><span class="dock-label" data-mlabel>TRECC</span><button class="deploy-btn" data-deploy aria-pressed="false"><span class="ic">${I.up}</span><span class="t">Deploy</span></button></div>
      <div class="dock-cell dc-read"><div class="readout"><div><small>Floor area vs. footprint</small><b data-area>1.0×</b></div><div><small>Height</small><b data-height>5\u0027</b></div></div></div>
      <div class="dock-cell dc-climate"><span class="dock-label"><span>Environment</span></span>${climateSeg('arctic')}</div>
      <div class="dock-cell dc-more"><button type="button" class="more-btn" data-more aria-expanded="false" aria-controls="hero-tray"><span>More</span>${I.chev}</button></div>
    </div></div></div>
    <p class="hero-foot">Weatherhaven CAD model of the TRECC · motion between packed and deployed is illustrative</p>
  </section>

  <section class="proof" aria-label="Weatherhaven at a glance"><div class="wrap proof-in">${STATS.map(s => `<div><b class="num">${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join('')}</div></section>
  <section class="manifesto" id="manifesto"><div class="wrap">
    <p class="mf" id="mf">${MANIFESTO.split(' ').map(w => `<span>${esc(w)} </span>`).join('')}</p>
    <div class="trusted"><p>Trusted in the field by</p><ul>${TRUSTED.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
  </div></section>

  ${storySection()}

  <section class="sec" id="plan">
    <div class="wrap">
      <div class="sec-head"><h2 class="h-l">What are you planning?</h2><p class="lead">Start with the mission. Every page below shows the systems, services and field record that matter for it.</p></div>
      <div class="router">${routerCols}</div>
    </div>
  </section>

  <section class="sec ice" id="systems">
    <div class="wrap">
      <div class="sec-head"><h2 class="h-l">Eleven systems. One that fits.</h2><div><p class="lead" style="margin-bottom:22px">Tell us the mission, the route to site, the climate and how long you’ll stay — the shelter finder narrows the range in four questions.</p><div class="hero-cta"><button class="btn btn-primary" data-action="finder">Start the shelter finder</button><a class="btn btn-line" href="/products">See all products</a></div></div></div>
      <div class="fleet">${fleetTiles()}</div>
    </div>
  </section>

  <section class="sec plan-teaser" id="plan-teaser"><div class="wrap pt-grid">
    <div><p class="kicker">New · Camp planner</p><h2 class="h-l">Sketch your camp. See it in 3D.</h2>
      <p class="lead">Drag MECCs, EHMECCs, ATEPS and softwall shelters onto a site plan and link them with standard interconnectors. Floor space and shipping add up as you go.</p>
      <div class="hero-cta"><a class="btn btn-primary" href="/plan">Open the camp planner</a></div></div>
    <a class="pt-art" href="/plan" aria-label="Open the camp planner">${img('plan_3d', '3D view of an example field hospital layout in the camp planner')}<span class="pt-plan">${plPreviewSVG(PLAN_EXAMPLES[1])}</span><span class="pt-tag">Example layout · illustrative 3D</span></a>
  </div></section>

  ${globeSection()}

  <section class="sec" id="voices">
    <div class="wrap quotes">
      <div class="qbox" aria-live="polite"><div class="qfade" id="qtext"></div></div>
      <div><p class="kicker">From the field</p><div class="qnav"><button data-q="-1" aria-label="Previous quote">${I.left}</button><button data-q="1" aria-label="Next quote">${I.right}</button><span class="qcount num" id="qcount"></span></div></div>
    </div>
  </section>

  <section class="sec ice">
    <div class="wrap">
      <div class="sec-head"><h2 class="h-l">More than shelter.</h2><p class="lead">Weatherhaven designs, ships, installs and supports the whole capability — from need assessment to repair and overhaul decades later.</p></div>
      ${lifecycle()}
    </div>
  </section>

  <section class="sec">
    <div class="wrap">
      <div class="sec-head"><h2 class="h-l">Latest news</h2><p class="lead"><a class="link" href="${SITE.newsArchive}" target="_blank" rel="noopener">Read the full news archive</a></p></div>
      ${newsList()}
      <div class="res">
        <a href="${SITE.rfpGuide}" target="_blank" rel="noopener"><span class="ri">${I.doc}</span><span><b>RFP guide</b><span>Everything to include when you specify a shelter system.</span></span><em>PDF</em></a>
        <a href="${SITE.instock}" target="_blank" rel="noopener"><span class="ri">${I.box}</span><span><b>In-stock inventory</b><span>Infrastructure ready to ship now.</span></span><em>PDF</em></a>
      </div>
    </div>
  </section>
  ${ctaBand()}`;
}
const FLEET_LAYOUT = { hercon: 'w2 h2', rdmss: 'w2', mts: 'w2 h2', mex26: 'w2', polar: 'w2' };
function fleetTiles() {
  const order = ['hercon', 'mecc', 'trecc', 'ehmecc', 'ateps', 'rdmss', 'mts', 'series4', 'series8', 'mex26', 'polar'];
  return order.map(P).map(p => `<a class="ft ${FLEET_LAYOUT[p.id] || ''}" href="/products/${p.id}">${img(p.imgs[0], '')}<span class="ftc"><small>${FAMILIES[p.family].short}</small><b>${esc(p.name)}</b><span class="ftx">${esc(p.tagline)}</span></span></a>`).join('');
}
function initManifesto() {
  const mf = $('#mf'); if (!mf) return;
  const words = $$('span', mf);
  if (reduceMotion) { words.forEach(w => w.classList.add('on')); return; }
  let lit = -1, raf = 0;
  const update = () => {
    raf = 0;
    const r = mf.getBoundingClientRect(), vh = innerHeight;
    const prog = Math.max(0, Math.min(1, (vh * 0.86 - r.top) / (r.height + vh * 0.36)));
    const n = Math.round(prog * words.length);
    if (n === lit) return; lit = n;
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  };
  const onS = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', onS, { passive: true }); update();
  cleanups.push(() => removeEventListener('scroll', onS));
}
const isPhone = () => matchMedia('(max-width: 759px)').matches;
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
  if (v && v.mount(stage, { offsetX: 0.23, offsetY: -0.03, offsetYNarrow: 0.13, offsetYTablet: -0.02, dist: 92, fewPins: true })) {
    v.setCamp(null); v.setModel('trecc'); v.setClimate('arctic');
    // if the CAD model can't load (no WebAssembly), the viewer falls back to the illustrative MECC
    const ready = v.whenModel().catch(() => {
      const ml = $('[data-mlabel]', hero); if (ml) ml.textContent = 'MECC'; const hf = $('.hero-foot', hero); if (hf) hf.textContent = 'Illustrative 3D model of the MECC';
      const pp = $('.paint', hero); if (pp) pp.remove(); const ipk = $('.inside-pick', hero); if (ipk) ipk.remove(); const iui = $('.inside-ui', hero); if (iui) iui.remove();
      const su = $('[data-su0] b', hero), tm = $('[data-tm0] b', hero); if (su) su.textContent = '2 people'; if (tm) tm.textContent = '10–15 min';
      const ar = $('[data-area]', hero); if (ar) ar.previousElementSibling.textContent = 'Floor area, approx.';
    });
    if (first && !reduceMotion) {
      v.scrub(0);
      playIntro(() => {
        hero.classList.add('go');
        if (v.container !== stage) return;
        v.intro(3.8);
        const t0 = performance.now();
        ready.then(() => setTimeout(() => { if (v.container === stage && v.pT === 0) v.deploy(true); }, Math.max(0, 900 - (performance.now() - t0))));
      });
    } else { v.scrub(1); hero.classList.add('go', 'no-anim'); }
    bindViewerControls(hero, v);
    const pb = $('.present-btn', hero); pb && pb.addEventListener('click', () => startPresent(v, hero));
    const mb = $('[data-more]', hero), tray = $('#hero-tray');
    if (mb && tray) {
      const setTray = on => { tray.hidden = !on; mb.setAttribute('aria-expanded', String(on)); mb.querySelector('span').textContent = on ? 'Less' : 'More'; hero.classList.toggle('tray-open', on); };
      mb.addEventListener('click', () => setTray(tray.hidden));
      $$('[data-climate]', hero).forEach(b => b.addEventListener('click', () => { /* keep tray state */ }));
    }
    const onP = e => { if ((e.key === 'p' || e.key === 'P') && !presenting && !e.target.closest('input,textarea,select,[contenteditable]') && !e.metaKey && !e.ctrlKey && !e.altKey) startPresent(v, hero); };
    document.addEventListener('keydown', onP); cleanups.push(() => document.removeEventListener('keydown', onP));
  } else {
    const pb0 = $('.present-btn', hero); pb0 && pb0.remove();
    stage.innerHTML = `<div class="fallback" style="background-image:url(${IMG.p_trecc})"></div>`;
    $('#hero-dock').closest('.dock').style.display = 'none'; $('.drag-hint').style.display = 'none';
    const ip = $('.inside-pick', hero); ip && ip.remove();
    hero.classList.add('go', 'no-anim');
  }
}
function initQuotes() {
  // quotes
  const quotes = [SECTORS.commercial.quotes[0], SECTORS.military.quotes[0], SECTORS.medical.quotes[0], SECTORS.military.quotes[2], SECTORS.commercial.quotes[2], P('trecc').quote];
  let qi = 0; const qt = $('#qtext'), qc = $('#qcount');
  const showQ = () => { qt.style.opacity = 0; setTimeout(() => { const q = quotes[qi]; qt.innerHTML = `<blockquote>${esc(q.q)}</blockquote><cite>${esc(q.a)}</cite>`; qc.textContent = `${qi + 1} / ${quotes.length}`; qt.style.opacity = 1; }, reduceMotion ? 0 : 200); };
  $$('[data-q]').forEach(b => b.addEventListener('click', () => { qi = (qi + +b.dataset.q + quotes.length) % quotes.length; showQ(); }));
  showQ();
}

/* ---------------- present mode: hands-free loop of the hero for a meeting ---------------- */
// captions are drawn from the TRECC product page (data.js)
const PRESENT = [
  { d: 4500, cap: 'TRECC — Tactical Redeployable Expanding Container Capability.', run: v => { v.exitFitout(true); v.setStorm(false); v.setClimate('arctic'); v.setTimeOfDay(0.55); v.scrub(0); v.intro(3.6); } },
  { d: 7500, cap: 'Extends in height from five to eight feet. Three times its shipping footprint.', run: v => v.deploy(true) },
  { d: 5500, cap: 'Helicopter, sealift, fixed-wing or vehicle transport — the TRECC-P fits a single 463L pallet.', run: v => v.setClimate('desert') },
  { d: 5500, cap: 'Set up in a few minutes by one or two people.', run: v => v.setClimate('temperate') },
  { d: 5500, cap: 'Fully insulated, rugged fabric cover system.', run: v => { v.setClimate('arctic'); v.setTimeOfDay(0.9); } },
  { d: 5500, cap: 'Command posts, forward operating bases, workshops, medical facilities.', run: v => v.setStorm(true) },
  { d: 9000, cap: 'Furnishings ship inside the centre core, protected in transit.', run: v => { v.setStorm(false); v.setTimeOfDay(0.55); v.enterFitout('trecc'); } },
  { d: 5000, cap: 'Interconnects with other shelters into a larger facility.', run: v => v.exitFitout() },
  { d: 7000, cap: 'Redeployable: back on one pallet, ready for the next mission.', run: v => v.deploy(false) }
];
let presenting = null;
function startPresent(v, hero) {
  if (presenting || !v || v.container !== $('#hero-stage')) return;
  const cap = document.createElement('div'); cap.className = 'present-cap';
  cap.innerHTML = `<p class="pc-kicker">Weatherhaven · TRECC</p><p class="pc-text" aria-live="polite"></p><p class="pc-exit">Esc to exit · P to pause</p>`;
  hero.appendChild(cap); document.body.classList.add('presenting');
  try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (_) { }
  const P = { i: -1, timer: 0, paused: false, cap, frame: { offsetX: v.offsetX, offsetY: v.offsetY, offsetYNarrow: v.offsetYNarrow, baseDist: v.baseDist } };
  v.offsetX = 0; v.offsetY = 0.04; v.offsetYNarrow = 0.04; v.baseDist = 62; v.resize();
  const text = $('.pc-text', cap);
  const step = () => {
    if (P.paused) return;
    P.i = (P.i + 1) % PRESENT.length; const st = PRESENT[P.i];
    text.classList.remove('on'); setTimeout(() => { text.textContent = st.cap; text.classList.add('on'); }, 250);
    try { st.run(v); } catch (_) { }
    v.idle = 10; v.start();
    P.timer = setTimeout(step, reduceMotion ? Math.min(st.d, 2500) : st.d);
  };
  const onKey = e => {
    if (e.key === 'Escape') { stopPresent(v); }
    else if (e.key === 'p' || e.key === 'P') { P.paused = !P.paused; cap.classList.toggle('paused', P.paused); if (!P.paused) step(); else clearTimeout(P.timer); }
    else if (e.key === 'ArrowRight') { clearTimeout(P.timer); step(); }
  };
  const onVis = () => { if (document.hidden) { clearTimeout(P.timer); } else if (!P.paused) { clearTimeout(P.timer); step(); } };
  const onFs = () => { if (!document.fullscreenElement && presenting) stopPresent(v); };
  document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis); document.addEventListener('fullscreenchange', onFs);
  P.off = () => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('fullscreenchange', onFs); };
  presenting = P; cleanups.push(() => stopPresent(v));
  setTimeout(() => cap.classList.add('settled'), 4000);
  step();
}
function stopPresent(v) {
  const P = presenting; if (!P) return; presenting = null;
  clearTimeout(P.timer); P.off(); P.cap.remove(); document.body.classList.remove('presenting');
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); } catch (_) { }
  if (v && v.ok) { Object.assign(v, P.frame); v.resize(); v.exitFitout(true); v.setStorm(false); v.setClimate('arctic'); v.setTimeOfDay(0.55); v.deploy(true); v.idle = 0; }
}

/* ---------------- scroll story ---------------- */
function storySection() {
  return `<section class="story" id="story" aria-labelledby="story-h">
    <div class="story-pin">
      <div class="story-stage" id="story-stage"></div>
      <div class="story-shade"></div>
      <div class="wrap story-ui">
        <div class="story-head"><p class="kicker">From truck to operational</p><h2 class="h-l" id="story-h">One pallet. Three times the floor.</h2></div>
        <ol class="story-steps">${STORY.map((st, i) => `<li data-i="${i}"><span class="n num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(st.t)}</h3><p>${esc(st.d)}</p></div></li>`).join('')}</ol>
      </div>
      <div class="story-prog" aria-hidden="true"><i></i></div>
      <p class="story-note">Keep scrolling · CAD model, motion illustrative</p>
    </div>
  </section>`;
}
function initStory() {
  const sec = $('#story'); if (!sec) return;
  const steps = $$('.story-steps li', sec), bar = $('.story-prog i', sec);
  let sv = null;
  if (win.ShelterViewer) { sv = storyViewer || new win.ShelterViewer({ story: true }); if (sv.ok) { storyViewer = sv; window.__whStory = sv; sv.mount($('#story-stage'), { offsetX: 0.18 }); } else sv = null; }
  if (!sv) sec.classList.add('nogl');
  let target = 0, cur = -1, raf = 0, act = -1, last = 0;
  const measure = () => { const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight); target = Math.max(0, Math.min(1, -r.top / span)); };
  const tick = () => {
    raf = 0;
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now - 16)) / 1000); last = now;
    cur = cur < 0 || reduceMotion ? target : cur + (target - cur) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - cur) < 0.0004) cur = target;
    if (sv) sv.setStory(cur);
    bar.style.transform = `scaleX(${cur.toFixed(4)})`;
    let a = 0; STORY.forEach((st, i) => { if (cur >= st.at - 0.002) a = i; });
    if (a !== act) { act = a; steps.forEach((li, i) => { li.classList.toggle('on', i === a); li.classList.toggle('done', i < a); }); }
    if (cur !== target) raf = requestAnimationFrame(tick); else last = 0;
  };
  const onS = () => { measure(); if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', onS, { passive: true }); addEventListener('resize', onS);
  cleanups.push(() => { removeEventListener('scroll', onS); removeEventListener('resize', onS); cancelAnimationFrame(raf); });
  onS();
}

/* ---------------- intro (once per session) ---------------- */
function playIntro(done) {
  let seen = false; try { seen = sessionStorage.getItem('wh-intro') === '1'; sessionStorage.setItem('wh-intro', '1'); } catch (_) { }
  if (seen || reduceMotion) { done(); return; }
  const el = document.createElement('div'); el.className = 'intro'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="intro-in"><img class="intro-logo" src="${IMG.logo_w}" alt=""><span class="intro-line"><i></i></span><p class="intro-sub">Rapidly deploying shelter systems anywhere in the world</p></div><span class="intro-skip">Click or press any key to skip</span>`;
  document.body.appendChild(el); document.documentElement.classList.add('intro-on');
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true; clearTimeout(t1);
    removeEventListener('keydown', finish); removeEventListener('wheel', finish); removeEventListener('touchstart', finish);
    el.classList.add('out'); document.documentElement.classList.remove('intro-on'); done();
    setTimeout(() => el.remove(), 1000);
  };
  const t1 = setTimeout(finish, 2100);
  el.addEventListener('click', finish); addEventListener('keydown', finish); addEventListener('wheel', finish, { passive: true }); addEventListener('touchstart', finish, { passive: true });
}

/* ---------------- globe section ---------------- */
function globeSection() {
  return `<section class="sec dark globe-sec" id="record">
    <div class="wrap">
      <div class="sec-head"><h2 class="h-l">A field record on every continent.</h2><p class="lead">Four decades of camps, hospitals and research bases — from the Kuwait–Iraq demilitarized zone to the Antarctic ice. Drag the globe or pick a location.</p></div>
      <div class="globe-grid">
        <div class="globe-side">
          <div class="gfilter" role="group" aria-label="Filter locations">
            <button data-gf="all" aria-pressed="true">All</button>
            <button data-gf="military" aria-pressed="false"><i style="background:#EE8400"></i>Military</button>
            <button data-gf="medical" aria-pressed="false"><i style="background:#EE8400"></i>Medical</button>
            <button data-gf="commercial" aria-pressed="false"><i style="background:#EE8400"></i>Commercial & research</button>
            <button data-gf="office" aria-pressed="false"><i style="background:#fff"></i>Offices</button>
          </div>
          <div class="glist" id="glist"></div>
          <div class="gcard" id="gcard" aria-live="polite"></div>
        </div>
        <div class="globe-box" id="globe-box"><div class="globe-tip" id="gtip"></div></div>
      </div>
      <div class="gstats">${STATS.map(s => `<div><b class="num">${s.n}</b><span>${s.l}</span></div>`).join('')}</div>
    </div>
  </section>`;
}
let globe = null;
function initGlobe() {
  const box = $('#globe-box'); if (!box) return;
  const list = $('#glist'), card = $('#gcard'), tip = $('#gtip');
  let filter = 'all', current = 'burnaby';
  const yearOf = p => { const ys = p.entries.map(e => e.y).filter(Boolean); return ys.length ? ys.length > 1 ? `${ys[0]}–${ys[ys.length - 1]}` : ys[0] : (p.kind === 'office' ? 'Office' : 'Field'); };
  const draw = () => {
    const items = PLACES.filter(p => filter === 'all' || p.sector === filter).sort((a, b) => (a.entries[0].y || '9999').localeCompare(b.entries[0].y || '9999'));
    list.innerHTML = items.map(p => `<button data-place="${p.id}" aria-current="${p.id === current}">${esc(p.name)}<span>${yearOf(p)}</span></button>`).join('');
  };
  const show = (id, fromGlobe) => {
    current = id; const p = PLACES.find(x => x.id === id);
    const pic = p.entries.find(e => e.img);
    card.innerHTML = `${pic ? `<div class="gimg">${img(pic.img, p.name)}</div>` : ''}<div class="gbody"><h3>${esc(p.name)}</h3><ol>${p.entries.map(e => `<li><b>${e.y || '—'}</b><span><strong>${esc(e.t)}</strong>${esc(e.d)}</span></li>`).join('')}</ol></div>`;
    $$('button', list).forEach(b => b.setAttribute('aria-current', b.dataset.place === id));
    globe && globe.focus(id);
    if (fromGlobe) { const b = $(`[data-place="${id}"]`, list); b && b.scrollIntoView({ block: 'nearest' }); }
  };
  list.addEventListener('click', e => { const b = e.target.closest('[data-place]'); if (b) show(b.dataset.place); });
  $$('[data-gf]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.gf; $$('[data-gf]').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); }));
  draw();
  if (window.Globe) {
    globe = new Globe(box, PLACES, (id) => show(id, true), (p, x, y) => {
      if (!p) { tip.classList.remove('on'); return; }
      tip.textContent = p.name; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
    });
    if (!globe.ok) { globe = null; box.style.display = 'none'; }
  }
  show(current);
}

/* ---------------- lifecycle (services) ---------------- */
function lifecycle(sel = 'engineering') {
  return `<div class="steps" id="lifecycle"><div class="step-list" role="group" aria-label="Services">${SERVICES.map(s => `<button data-step="${s.id}" aria-pressed="${s.id === sel}"><b>${esc(s.name)}</b><p>${esc(s.text)}</p></button>`).join('')}
    <p style="margin-top:24px"><a class="link" href="/services">All services and support systems</a></p></div>
    <div class="step-media">${SERVICES.map(s => img(s.img, s.name, `data-sm="${s.id}" class="${s.id === sel ? 'on' : ''}"`)).join('')}</div></div>`;
}
function initLifecycle(sel) {
  const root = $('#lifecycle'); if (!root) return;
  const pick = id => { $$('[data-step]', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.step === id)); $$('[data-sm]', root).forEach(i => i.classList.toggle('on', i.dataset.sm === id)); };
  root.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) pick(b.dataset.step); });
  root.addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const bs = $$('[data-step]', root), i = bs.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const n = bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; n.focus(); pick(n.dataset.step);
  });
  if (sel) pick(sel);
}
function newsList() { return `<div class="news">${NEWS.map(n => `<a href="${n.url}" target="_blank" rel="noopener"><time>${n.date}</time><h3>${esc(n.t)}</h3><p>${esc(n.d)}</p></a>`).join('')}</div>`; }

/* ---------------- SECTOR ---------------- */
function pageSector(key) {
  const s = SECTORS[key];
  return `${pageHero({ crumb: [['Solutions', null], [s.name, null]], title: s.name, lead: s.lead, imgKey: s.img, stats: s.stats, actions: `<a class="btn btn-primary" href="/contact?sector=${key}">Talk to the ${s.name.toLowerCase()} team</a><button class="btn btn-ghost" data-action="finder">Find a shelter</button>` })}
  <nav class="subnav" aria-label="On this page"><div class="wrap">${s.apps.map(a => `<a href="/${key}/${a.id}" data-sub="${a.id}">${esc(a.name)}</a>`).join('')}<a href="/${key}/why" data-sub="why">Why Weatherhaven</a><a href="/${key}/voices" data-sub="voices">From the field</a></div></nav>
  <section class="sec"><div class="wrap apps">${s.apps.map(a => `<article class="app" id="${a.id}"><div class="app-img">${img(a.img, a.name)}</div><div><h2 class="h-l">${esc(a.name)}</h2><p>${esc(a.text)}</p><div class="uses"><span>Systems used</span>${productChips(a.products)}</div></div></article>`).join('')}</div></section>
  <section class="sec dark" id="why"><div class="wrap"><div class="sec-head"><h2 class="h-l">Why ${s.name.toLowerCase()} customers choose Weatherhaven</h2><p class="lead">Rapid, ecodesigned and redeployable — the three principles behind every system.</p></div>
    <div class="pillars">${s.pillars.map(([t, d, k]) => `<div class="pillar"><div class="pimg">${img(k, '')}</div><h3>${t}</h3><p>${esc(d)}</p></div>`).join('')}</div></div></section>
  <section class="sec" id="voices"><div class="wrap"><div class="sec-head one"><h2 class="h-l">From the field</h2></div>
    <div class="fgroups">${s.quotes.map(q => `<figure class="pquote" style="margin:0"><p>${esc(q.q)}</p><cite>${esc(q.a)}</cite></figure>`).join('')}</div></div></section>
  ${ctaBand(`Planning a ${s.name.toLowerCase()} deployment?`, 'Tell us the mission, location and timeline. We’ll handle need assessment, design, logistics and installation.', s.img)}`;
}
function initSubnav() {
  const links = $$('.subnav a'); if (!links.length) return;
  const ids = links.map(a => a.dataset.sub);
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.dataset.sub === e.target.id)); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ids.forEach(id => { const el = document.getElementById(id); el && io.observe(el); });
  cleanups.push(() => io.disconnect());
}

/* ---------------- PRODUCTS ---------------- */
const compare = new Set();
function regRows(list) {
  return list.map(p => `<div class="reg-row" data-pid="${p.id}" data-fam="${p.family}">
    <a href="/products/${p.id}" class="reg-name" style="text-decoration:none">${esc(p.name)}<small>${FAMILIES[p.family].short}</small></a>
    <a href="/products/${p.id}" class="reg-full" style="text-decoration:none">${esc(p.full)}<span>${esc(p.tagline)}</span></a>
    <div class="reg-stat"><b>${esc(p.list.deploy)}</b>${esc(p.list.gain)}</div>
    <button class="reg-cmp" data-cmp="${p.id}" aria-pressed="${compare.has(p.id)}" aria-label="Compare ${esc(p.name)}" title="Add to compare">${compare.has(p.id) ? I.check : I.plus}</button>
  </div>`).join('');
}
function pageProducts(q) {
  const f = q.get('f') || 'all';
  const count = k => PRODUCTS.filter(p => k === 'all' || p.family === k).length;
  return `${pageHero({ crumb: [['Products', null]], title: 'Products', lead: 'Expandable containers and softwall shelters, plus the accessories and support systems that turn them into a working camp.', imgKey: 'rapid_forest', stats: [['3×', 'Floor area from a MECC, EHMECC or TRECC'], ['Up to 6×', 'Living space from a HERCon'], ['< 10 min', 'Set-up for the ATEPS and most RDMSS models']], actions: `<button class="btn btn-primary" data-action="finder">Find the right shelter</button><a class="btn btn-ghost" href="${SITE.instock}" target="_blank" rel="noopener">In-stock inventory</a>` })}
  <nav class="lineup" aria-label="Product lineup"><div class="wrap"><ul>${PRODUCTS.map(p => `<li><a href="/products/${p.id}"><span class="lt-img">${img(p.imgs[0], '')}</span><b>${esc(p.name)}</b><small>${FAMILIES[p.family].short}</small></a></li>`).join('')}
    <li class="lt-tool"><a href="/products/compare"><span class="lt-img lt-ic">${I.box}</span><b>Compare</b><small>Side by side</small></a></li>
    <li class="lt-tool"><a href="#" data-action="finder"><span class="lt-img lt-ic">${I.spark}</span><b>Finder</b><small>4 questions</small></a></li></ul></div></nav>
  <nav class="subnav" aria-label="On this page"><div class="wrap"><a href="/products/all" data-sub="all">All systems</a><a href="/products/scale" data-sub="scale">Ships small, opens big</a><a href="/products/accessories" data-sub="accessories">Accessories</a><a href="/products/hqss" data-sub="hqss">Canada’s HQSS</a></div></nav>
  <section class="sec" id="all"><div class="wrap">
    <div class="reg-tools"><div class="filters" role="group" aria-label="Filter products">
      ${[['all', 'All systems'], ['expandable', 'Expandable containers'], ['soft', 'Softwall shelters']].map(([k, t]) => `<button data-filter="${k}" aria-pressed="${f === k}">${t}<span>${count(k)}</span></button>`).join('')}
    </div><p class="muted" style="font-size:15px">Select ${I.plus.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} on up to three systems to compare them.</p></div>
    <div class="reg"><div class="reg-list" id="reg">${regRows(PRODUCTS)}</div>
      <aside class="reg-preview" aria-hidden="true"><div class="pv-img">${PRODUCTS.map((p, i) => img(p.imgs[0], '', `data-pv="${p.id}" class="${i === 0 ? 'on' : ''}"`)).join('')}</div><div class="pv-body"><h3 id="pv-t">${PRODUCTS[0].name}</h3><p id="pv-d">${esc(PRODUCTS[0].summary)}</p></div></aside>
    </div></div></section>
  <section class="sec ice" id="scale"><div class="wrap"><div class="sec-head"><h2 class="h-l">Ships small, opens big.</h2><p class="lead">Expandables travel at a fraction of their working size. Drag the slider to unfold each one. Plans are drawn to scale where dimensions are published, and proportional elsewhere.</p></div>${scaleExplorer()}</div></section>
  <section class="sec" id="accessories"><div class="wrap"><div class="sec-head"><h2 class="h-l">Accessories</h2><p class="lead">Every shelter can be as unique as the mission. Accessories tune it to the climate and link it into a complex.</p></div>
    <div class="acc">${ACCESSORIES.map(a => `<div><div class="aimg">${img(a.img, a.name)}</div><h3>${esc(a.name)}</h3><p>${esc(a.text)}</p><a class="link" href="${a.src}" target="_blank" rel="noopener">Full details</a></div>`).join('')}</div>
    <p class="note">Looking for kitchens, ablutions, laundry, power or water? See <a class="link" href="/services/support">support systems</a>.</p></div></section>
  <section class="sec dark" id="hqss"><div class="wrap two"><div><h2 class="h-l">Canada’s Headquarters Shelter System</h2><p class="lead" style="margin:18px 0 26px">${esc(HQSS.intro)}</p><a class="btn btn-primary" href="/innovation/hqss">Open the HQSS spec sheet</a></div><div class="photo" style="aspect-ratio:737/490;background:#fff">${img('hqss_diag', 'HQSS modular frame and fabric components')}</div></div></section>
  ${ctaBand()}`;
}
function initProducts(q) {
  const reg = $('#reg'); const pvT = $('#pv-t'), pvD = $('#pv-d');
  const apply = f => { $$('.reg-row', reg).forEach(r => r.style.display = f === 'all' || r.dataset.fam === f ? '' : 'none'); $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === f)); };
  $$('[data-filter]').forEach(b => b.addEventListener('click', () => apply(b.dataset.filter)));
  apply(q.get('f') || 'all');
  reg.addEventListener('mouseover', e => {
    const r = e.target.closest('.reg-row'); if (!r) return;
    const p = P(r.dataset.pid); $$('.reg-row', reg).forEach(x => x.classList.toggle('hot', x === r));
    $$('[data-pv]').forEach(i => i.classList.toggle('on', i.dataset.pv === p.id)); pvT.textContent = p.name; pvD.textContent = p.summary;
  });
  initScale();
}
/* compare */
function toggleCompare(id) {
  if (compare.has(id)) compare.delete(id);
  else { if (compare.size >= 3) { toast('Compare holds up to three systems. Remove one to add another.'); return; } compare.add(id); }
  syncCompare();
}
function syncCompare() {
  $$('[data-cmp]').forEach(b => { const on = compare.has(b.dataset.cmp); b.setAttribute('aria-pressed', on); if (b.classList.contains('reg-cmp')) b.innerHTML = on ? I.check : I.plus; else b.textContent = on ? 'Added to compare' : 'Add to compare'; });
  const bar = $('#cmpbar');
  bar.classList.toggle('on', compare.size > 0);
  $('.names', bar).innerHTML = [...compare].map(id => `<span>${esc(P(id).name)}</span>`).join('');
  $('[data-action="compare"]', bar).textContent = compare.size > 1 ? `Compare ${compare.size}` : 'Compare';
}
function openCompare() {
  const list = [...compare].map(P);
  if (!list.length) { navigate('/products/all'); toast('Pick up to three systems to compare.'); return; }
  const rows = [
    ['Type', p => FAMILIES[p.family].name],
    ['Set-up', p => p.list.deploy],
    ['Space', p => p.list.gain],
    ['Transport', p => p.list.move],
    ['Key facts', p => `<ul class="ticks">${p.facts.slice(0, 3).map(f => `<li><b>${esc(f[0])}:</b> ${esc(f[1])}</li>`).join('')}</ul>`],
    ['Best for', p => p.apps.slice(0, 4).map(esc).join(', ')]
  ];
  openModal('Compare systems', `<div style="overflow-x:auto"><table class="cmp-table"><thead><tr><th></th>${list.map(p => `<th><div class="cmp-img">${img(p.imgs[0], p.name)}</div>${esc(p.name)}<small>${esc(p.full)}</small></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([h, f]) => `<tr><th scope="row">${h}</th>${list.map(p => `<td>${f(p)}</td>`).join('')}</tr>`).join('')}
    <tr><th></th>${list.map(p => `<td><a class="btn btn-line btn-sm" href="/products/${p.id}" data-close>View ${esc(p.name)}</a></td>`).join('')}</tr></tbody></table></div>
    ${list.length < 3 ? `<p class="note">Add ${3 - list.length === 1 ? 'one more system' : 'up to two more systems'} from the <a class="link" href="/products/all" data-close>product list</a>.</p>` : ''}`);
}

/* scale explorer */
const SCALE = [
  { id: 'mecc', name: 'MECC', sub: '20\u0027 × 8\u0027 → ≈20\u0027 × 24\u0027', note: 'Three times the floor space of a conventional module with the same shipping footprint. Drawn from a standard 20\u0027 × 8\u0027 ISO footprint; deployed width is approximate.', L: 240, W0: 96, W1: 288, unit: 'in', toScale: true, packed: '≈160 ft²', open: '≈480 ft²', mult: '3×' },
  { id: 'ateps', name: 'ATEPS', sub: '84\u0022 × 104\u0022 → 244\u0022 × 104\u0022', note: 'One 463L pallet position, expanding to 244\u0022 wide in under ten minutes. Drawn to scale.', L: 104, W0: 84, W1: 244, unit: 'in', toScale: true, packed: '61 ft²', open: '176 ft²', mult: '2.9×' },
  { id: 'trecc', name: 'TRECC', sub: '3× footprint, 5\u0027 → 8\u0027 high', note: 'Expands to three times its shipping footprint and rises from five to eight feet. Proportional — exact dimensions vary by model.', L: 150, W0: 60, W1: 180, toScale: false, packed: '1×', open: '3×', mult: '3×' },
  { id: 'hercon', name: 'HERCon', sub: 'Up to 6× its shipping footprint', note: 'Two 4\u0027-wide units ship together as one 8\u0027 container, then deploy separately — up to six times the living space of their shipping footprint. Proportional.', L: 200, W0: 48, W1: 288, toScale: false, packed: '1×', open: 'Up to 6×', mult: '6×', twin: true }
];
function scaleExplorer() {
  return `<div class="scale"><div><div class="scale-tabs" role="group" aria-label="Product">${SCALE.map((s, i) => `<button data-scale="${s.id}" aria-pressed="${i === 0}"><b>${s.name}</b><span>${esc(s.sub)}</span><em>${esc(s.note)}</em></button>`).join('')}</div>
    <p style="margin-top:20px"><a class="link" href="/products/mecc/viewer">See the MECC deploy in 3D</a></p></div>
    <div class="scale-stage"><svg id="scale-svg" viewBox="0 0 640 420" role="img" aria-label="Top-down plan of the product, packed and deployed"></svg>
      <div class="scale-ctl"><span style="font-size:14px;color:rgba(222,233,244,.7)">Packed</span><input type="range" min="0" max="100" value="100" id="scale-r" aria-label="Packed to deployed"><span style="font-size:14px;color:rgba(222,233,244,.7)">Deployed</span></div>
      <div class="scale-read"><div><b id="sr-a">—</b><span>Shipping footprint</span></div><div><b id="sr-b">—</b><span>Deployed floor</span></div><div><b id="sr-c">—</b><span>Gain</span></div></div></div></div>`;
}
function initScale() {
  const svg = $('#scale-svg'); if (!svg) return;
  const r = $('#scale-r'); let cur = SCALE[0];
  const draw = () => {
    const t = r.value / 100, s = cur; r.style.setProperty('--v', r.value + '%');
    const maxW = 520, maxH = 290;
    const k = Math.min(maxW / Math.max(s.L, 1), maxH / s.W1);
    const L = s.L * k, w0 = s.W0 * k, w = (s.W0 + (s.W1 - s.W0) * t) * k;
    const cx = 340, cy = 180;
    let g = '';
    // grid
    for (let x = 20; x < 640; x += 20) g += `<line x1="${x}" y1="20" x2="${x}" y2="360" stroke="rgba(141,179,218,.08)"/>`;
    for (let y = 20; y < 360; y += 20) g += `<line x1="20" y1="${y}" x2="620" y2="${y}" stroke="rgba(141,179,218,.08)"/>`;
    const units = s.twin ? [-1, 1] : [0];
    units.forEach(u => {
      const ox = s.twin ? u * (L / 4 + 6) * (t) : 0;
      const Lu = s.twin ? L / 2 - 6 : L;
      const x0 = cx - Lu / 2 + ox;
      const ww = s.twin ? (w0 / 2 + (s.W1 * k / 2 - w0 / 2) * t) : w;
      const ww0 = s.twin ? w0 / 2 : w0;
      const yOff = s.twin ? (t < 1 ? u * (ww0 / 2) * (1 - t) : 0) : 0;
      g += `<rect x="${x0}" y="${cy - ww / 2 + yOff}" width="${Lu}" height="${ww}" fill="rgba(13,66,117,.55)" stroke="#8db3da" stroke-width="1.5"/>`;
      g += `<rect x="${x0}" y="${cy - ww0 / 2 + yOff}" width="${Lu}" height="${ww0}" fill="rgba(238,132,0,.18)" stroke="#EE8400" stroke-width="2"/>`;
    });
    // dimension labels
    if (s.toScale) {
      const inch = (v, w) => s.unit === 'in' && s.id !== 'mecc' ? `${Math.round(v)}\u0022` : `${w && s.id === 'mecc' && v > s.W0 + 1 ? '≈' : ''}${Math.round(v / 12)}\u0027`;
      const curW = s.W0 + (s.W1 - s.W0) * t;
      g += `<line x1="${cx - L / 2}" y1="${cy + w / 2 + 22}" x2="${cx + L / 2}" y2="${cy + w / 2 + 22}" stroke="#cfe0f0" stroke-width="1"/><text x="${cx}" y="${cy + w / 2 + 40}" fill="#cfe0f0" font-size="14" text-anchor="middle" font-family="Barlow">${inch(s.L)}</text>`;
      g += `<line x1="${cx + L / 2 + 22}" y1="${cy - w / 2}" x2="${cx + L / 2 + 22}" y2="${cy + w / 2}" stroke="#cfe0f0" stroke-width="1"/><text x="${cx + L / 2 + 30}" y="${cy + 5}" fill="#fff" font-size="16" font-weight="600" font-family="Barlow">${inch(curW, 1)}</text>`;
      // a person for scale (≈ 24\u0022 shoulder width)
      const pr = 12 * k;
      g += `<circle cx="${cx - L / 2 - 26}" cy="${cy}" r="${Math.max(3, pr)}" fill="#EE8400"/><text x="${cx - L / 2 - 26}" y="${cy + Math.max(3, pr) + 16}" fill="rgba(222,233,244,.7)" font-size="12" text-anchor="middle" font-family="Barlow">person</text>`;
    } else {
      g += `<text x="${cx}" y="${cy + w / 2 + 34}" fill="rgba(222,233,244,.7)" font-size="13" text-anchor="middle" font-family="Barlow">Proportional — not to scale</text>`;
    }
    g += `<g font-family="Barlow" font-size="13"><rect x="24" y="394" width="14" height="10" fill="rgba(238,132,0,.3)" stroke="#EE8400"/><text x="44" y="403" fill="rgba(222,233,244,.8)">Shipping footprint</text><rect x="180" y="394" width="14" height="10" fill="rgba(13,66,117,.7)" stroke="#8db3da"/><text x="200" y="403" fill="rgba(222,233,244,.8)">Deployed floor</text></g>`;
    svg.innerHTML = g;
    $('#sr-a').textContent = s.packed; $('#sr-b').textContent = t > 0.98 ? s.open : '…'; $('#sr-c').textContent = t > 0.98 ? s.mult : `${(1 + (parseFloat(s.mult) - 1) * t).toFixed(1)}×`;
  };
  $$('[data-scale]').forEach(b => b.addEventListener('click', () => {
    cur = SCALE.find(s => s.id === b.dataset.scale); $$('[data-scale]').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (reduceMotion) { r.value = 100; draw(); return; }
    r.value = 0; draw(); let v = 0; const step = () => { v = Math.min(100, v + 2.5); r.value = v; draw(); if (v < 100) requestAnimationFrame(step); }; requestAnimationFrame(step);
  }));
  r.addEventListener('input', draw); draw();
}

/* ---------------- PRODUCT DETAIL ---------------- */
function pageProduct(p) {
  const fam = FAMILIES[p.family];
  const related = PRODUCTS.filter(x => x.id !== p.id && x.family === p.family).slice(0, 4);
  return `${pageHero({ crumb: [['Products', '/products'], [fam.name, `/products?f=${p.family}`], [p.name, null]], title: p.name, sub: p.full, lead: p.tagline + ' ' + p.summary.split('. ')[0] + '.', imgKey: p.imgs[0], stats: p.stats,
    actions: `<a class="btn btn-primary" href="/contact?product=${p.id}">Request a quote</a><button class="btn btn-ghost" data-cmp="${p.id}" aria-pressed="${compare.has(p.id)}">${compare.has(p.id) ? 'Added to compare' : 'Add to compare'}</button>` })}
  <nav class="subnav pillnav" aria-label="On this page"><div class="wrap"><div class="pill">
    <a href="/products/${p.id}/overview" data-sub="overview">Overview</a>${p.viewer ? `<a href="/products/${p.id}/viewer" data-sub="viewer">3D model</a>` : ''}<a href="/products/${p.id}/applications" data-sub="applications">Applications</a><a href="/products/${p.id}/related" data-sub="related">Related</a>
    <a class="pill-cta" href="/contact?product=${p.id}"><span class="pc-full">Request a quote</span><span class="pc-short">Quote</span></a></div></div></nav>
  <section class="sec" id="overview"><div class="wrap pd">
    <div class="gallery"><div class="main">${img(p.imgs[0], `${p.name} — photo 1`, 'id="gmain"')}</div>${p.imgs.length > 1 ? `<div class="thumbs">${p.imgs.map((k, i) => `<button data-g="${k}" aria-pressed="${i === 0}" aria-label="Photo ${i + 1}">${img(k, '')}</button>`).join('')}</div>` : ''}</div>
    <div><h2 class="h-m" style="color:var(--navy);margin-bottom:18px">${esc(p.full)}</h2><p class="muted" style="margin-bottom:24px">${esc(p.summary)}</p>
      <dl class="facts" style="margin:0">${p.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
      <div class="pd-acts"><a class="btn btn-primary" href="/contact?product=${p.id}">Request a quote</a><a class="btn btn-line" href="${SITE.rfpGuide}" target="_blank" rel="noopener">${I.doc}RFP guide</a></div></div>
  </div></section>
  ${p.viewer ? (() => { const isM = p.viewer === 'mecc' || p.viewer === 'ehmecc', V = VIEWER_COPY[p.viewer]; return `<section class="sec-tight ice" id="viewer"><div class="wrap"><div class="sec-head"><h2 class="h-l">See it deploy.</h2><p class="lead">${esc(V.lead)} Drag to look around.</p></div>
    <div class="viewer-card" id="pd-card"><div class="stage" id="pd-stage" style="background:url(${IMG[p.imgs[0]]}) center/cover"></div>${isM ? insideUI() : p.viewer === 'trecc' ? insideUI('trecc') : ''}<div class="vbar" id="pd-vbar"><button class="deploy-btn" data-deploy aria-pressed="false"><span class="ic">${I.up}</span><span class="t">Deploy</span></button>${p.viewer === 'trecc' ? paintPick() + `<label class="xr-ctl" title="Section cut"><span>Section cut</span><input type="range" min="0" max="100" value="0" data-xray aria-label="Section cut depth"></label>` : ''}
      ${p.viewer === 'trecc' ? `<div class="readout"><div><small>Floor area vs. footprint</small><b data-area>1.0×</b></div><div><small>Height</small><b data-height>5\u0027</b></div></div>` : isM ? `<div class="readout"><div><small>Floor area, approx.</small><b data-area>160 ft²</b></div><div><small>Height</small><b data-height>8\u0027</b></div></div>` : `<div class="readout"><div><small>${esc(V.k)}</small><b>${esc(V.v)}</b></div></div>`}
      <input type="range" min="0" max="100" value="0" data-scrub aria-label="Deployment progress" style="flex:1;min-width:140px">
      ${isM ? `<label class="toggle"><input type="checkbox" data-eh>Raise roof</label>` : ''}${climateSeg('temperate')}</div></div>${isM ? insidePick('Step inside') : p.viewer === 'trecc' ? insidePickTrecc() + (ASSETS.ar ? `<div class="ar-row"><a class="btn btn-line" href="${esc(ASSETS.ar)}">${I.box}See it at full size in AR</a><span>Opens a page you can scan with a phone — the deployed TRECC placed in your room, at real scale.</span></div>` : '') : ''}</div></section>`; })() : ''}
  <section class="sec" id="applications"><div class="wrap">
    <div class="sec-head"><h2 class="h-l">Applications</h2><div class="appgrid">${p.apps.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div></div>
    ${p.examples ? `<div style="margin:-12px 0 56px"><p class="kicker">Example uses</p><ul class="ticks" style="columns:2;column-gap:48px">${p.examples.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    <div class="fgroups">${p.groups.map(([h, items]) => `<div><h3>${esc(h)}</h3><ul class="ticks">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>
    ${p.quote ? `<figure class="pquote" style="margin:64px 0 0;max-width:820px"><p>${esc(p.quote.q)}</p><cite>${esc(p.quote.a)}</cite></figure>` : ''}
  </div></section>
  <section class="sec ice" id="related"><div class="wrap"><div class="sec-head"><h2 class="h-m" style="color:var(--navy)">More ${fam.name.toLowerCase()}</h2><p class="lead"><a class="link" href="/products">All products</a></p></div>
    <div class="related">${related.map(r => `<a href="/products/${r.id}"><div class="rimg">${img(r.imgs[0], r.name)}</div><b>${esc(r.name)}</b><span>${esc(r.list.gain)}</span></a>`).join('')}</div></div></section>
  ${ctaBand(`Spec a ${p.name} for your mission.`, 'Tell us the application, climate and transport route — we’ll configure the electrical, mechanical and interior fit-out.', p.imgs[1] || p.imgs[0])}`;
}
// lead text and one published fact for each product's 3D model
const VIEWER_COPY = {
  mecc: { lead: 'An illustrative model of the MECC — deploy it and watch the floor space triple.' },
  ehmecc: { lead: 'An illustrative model of the EHMECC — deploy it, then raise the roof 4.5 feet.' },
  series4: { lead: 'An illustrative model of a Series 4: the frame goes up arch by arch, then the cover goes on. Proportions are illustrative.', k: 'Climate', v: 'All, incl. polar' },
  trecc: { lead: 'Weatherhaven’s own CAD model of the TRECC, simplified for the web. Deploy it to watch it grow in width and height — the motion between packed and open is illustrative.' },
  hercon: { lead: "An illustrative model of the HERCon: two 4'-wide units ship together like one 8'-wide container, then deploy separately. Proportions and fold sequence are illustrative.", k: 'Living space', v: 'Up to 6×' }
};
function initProduct(p) {
  const main = $('#gmain');
  $$('[data-g]').forEach(b => b.addEventListener('click', () => { main.src = IMG[b.dataset.g]; $$('[data-g]').forEach(x => x.setAttribute('aria-pressed', x === b)); }));
  if (p.viewer) {
    const v = getViewer(), stage = $('#pd-stage');
    if (v && v.mount(stage, { dist: p.viewer === 'trecc' ? 52 : 64 })) {
      v.setCamp(null); v.setModel(p.viewer === 'ehmecc' ? 'mecc' : p.viewer); v.scrub(0); v.setClimate('temperate');
      bindViewerControls($('#pd-vbar'), v, { insideRoot: $('#viewer') });
      if (p.viewer !== 'ehmecc') { const t = $('#pd-vbar .toggle'); t && (t.style.display = 'none'); }
      initSubnav();
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !reduceMotion) { v.whenModel().then(() => v.container === stage && v.pT === 0 && v.deploy(true), () => v.deploy(true)); if (p.viewer === 'ehmecc') setTimeout(() => v.container === stage && v.setExtended(true), 4600); io.disconnect(); } }, { threshold: 0.5 });
      io.observe(stage); cleanups.push(() => io.disconnect());
    } else { stage.innerHTML = `<div class="fallback" style="position:absolute;inset:0;background:url(${IMG[p.imgs[0]]}) center/cover"></div>`; $('#pd-vbar').style.display = 'none'; const ip = $('#viewer .inside-pick'); ip && ip.remove(); }
  }
}

/* ---------------- SERVICES ---------------- */
function pageServices() {
  return `${pageHero({ crumb: [['Services', null]], title: 'Services & support', lead: 'To complement the shelters, a fully integrated service: engineering and design, logistics, installation, training, repair and parts — from start to finish.', imgKey: 'sv_install', stats: [['6', 'Integrated services, one team'], ['1,000', 'People fed three fresh meals a day by a full-service kitchen'], ['< 1 hr', 'To a working field laundry once connected']] })}
  <nav class="subnav" aria-label="On this page"><div class="wrap"><a href="/services/lifecycle" data-sub="lifecycle-sec">How we support you</a><a href="/services/support" data-sub="support">Support systems</a><a href="/services/accessories" data-sub="accessories">Accessories</a></div></nav>
  <section class="sec" id="lifecycle-sec"><div class="wrap"><div class="sec-head"><h2 class="h-l">From first drawing to final overhaul.</h2><p class="lead">Building on a long track record of field projects, Weatherhaven assists with your shelter operation from start to finish.</p></div>${lifecycle()}</div></section>
  <section class="sec ice" id="services-detail"><div class="wrap"><div class="sec-head"><h2 class="h-l">Each service, in detail.</h2><p class="lead">What the teams do at each stage, from the services pages on weatherhaven.com.</p></div>
    <div class="svc-grid">${SERVICES.map(s => `<article class="svc" id="svc-${s.id}"><div class="svc-img">${img(s.img, s.name)}</div><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><ul class="ticks">${(s.detail || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul></article>`).join('')}</div></div></section>
  <section class="sec" id="support"><div class="wrap"><div class="sec-head"><h2 class="h-l">Support systems</h2><p class="lead">More than shelters: fully equipped capability that is functional, comfortable and ready when occupants arrive on site.</p></div>
    <div class="sgrid">${SUPPORT.map(s => `<div class="sitem" id="ss-${s.id}"><div class="simg">${img(s.img, s.name)}</div><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div></div></section>
  <section class="sec ice" id="accessories"><div class="wrap"><div class="sec-head"><h2 class="h-l">Accessories</h2><p class="lead">Solarshades, interconnectors and covers that adapt any shelter to its site.</p></div>
    <div class="acc">${ACCESSORIES.map(a => `<div><div class="aimg">${img(a.img, a.name)}</div><h3>${esc(a.name)}</h3><p>${esc(a.text)}</p></div>`).join('')}</div></div></section>
  ${ctaBand('Need parts, training or an overhaul?', 'Request spares, schedule field service or send equipment for repair and overhaul.', 'sv_parts')}`;
}

/* ---------------- INNOVATION ---------------- */
function pageInnovation() {
  const vids = [['IKZSBVyRhmc', 'Designed for speed and mobility', 'in_rain'], ['tllmaP7TDlw', 'Expandable portable space', 'p_ehmecc'], ['Ns0YkE_2dCc', 'Extreme climate and logistics', 'antarctica']];
  return `${pageHero({ crumb: [['Company', '/company'], ['Innovation', null]], title: 'Innovation', lead: 'Shelter solutions engineered for commercial, medical and military use — and proven in the harshest places on Earth.', imgKey: 'in_solar', stats: [['51', 'Patents'], ['30', 'Countries where they’re held'], ['3,000+', 'Expandable containers sold'], ['44%', 'Reduction in CO₂ emissions']] })}
  <nav class="subnav" aria-label="On this page"><div class="wrap"><a href="/innovation/engineering" data-sub="engineering">Engineering & patents</a><a href="/innovation/hqss" data-sub="hqss">HQSS spec sheet</a><a href="/innovation/expandable" data-sub="expandable">Expandable space</a><a href="/innovation/energy" data-sub="energy">Energy efficiency</a><a href="/innovation/videos" data-sub="videos">Videos</a></div></nav>
  <section class="sec" id="engineering"><div class="wrap two"><div><h2 class="h-l">A world-class engineering team.</h2><p class="lead" style="margin:18px 0">Recognised by media and global CAD experts, the engineering team is the backbone behind 51 patents in more than 30 countries — and works with customers to design the ideal shelter for each mission.</p><p class="muted">Rapid deployment and redeployment is the core design element of every product — containerized, softwall or hybrid — and of the power, electrical and lighting systems integrated into them.</p></div><div class="photo" style="aspect-ratio:4/3">${img('in_rain', 'Rain testing a shelter in the engineering facility')}</div></div></section>
  <section class="sec dark" id="hqss"><div class="wrap"><div class="sec-head"><h2 class="h-l">HQSS — the most advanced tactical shelter system ever developed.</h2><p class="lead">${esc(HQSS.intro)}</p></div>
    <div class="spec"><div><dl class="spec-table" style="margin:0;border-color:#fff">${HQSS.specs.map(([k, v]) => `<div style="border-color:var(--rule-dark)"><dt style="color:rgba(222,233,244,.7)">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <h3 class="h-s" style="margin:32px 0 12px">Semi-rigid flooring</h3><ul class="ticks">${HQSS.floor.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
      <div class="plan"><svg id="plan-svg" viewBox="0 0 640 420" role="img" aria-label="Plan of the HQSS operations shelter, 41.8 by 23.8 feet, drawn to scale"></svg>
        <div class="plan-legend"><span><i style="background:rgba(13,66,117,.8);border:1px solid #8db3da"></i>HQSS operations shelter, 995 ft²</span><label class="toggle"><input type="checkbox" id="plan-mecc">Overlay a deployed MECC (≈20\u0027 × 24\u0027)</label></div></div></div></div></section>
  <section class="sec" id="expandable"><div class="wrap two"><div class="photo" style="aspect-ratio:4/3">${img('p_ehmecc5', 'Inside an EHMECC')}</div><div><h2 class="h-l">Expandable portable space.</h2><p class="lead" style="margin:18px 0">Weatherhaven pioneered expandable containers and has sold more than 3,000 units to more than 25 military customers — from extended-height versions to small truck-mounted and trailer units.</p><p class="muted" style="margin-bottom:22px">All follow one principle: the smallest shipping configuration possible, expanding to the largest working space possible. The patented EHMECC’s walls swing down to triple the floor, then the roof rises from 8\u0027 to 12\u00276\u0022.</p><div class="hero-cta"><a class="btn btn-primary" href="/products/ehmecc/viewer">Raise an EHMECC roof in 3D</a><a class="btn btn-line" href="/products/scale">Compare expansion ratios</a></div></div></div></section>
  <section class="sec ice" id="energy"><div class="wrap calc"><div><h2 class="h-l">Energy efficiency, measured in fuel not trucked.</h2><p class="lead" style="margin:18px 0">The thermal performance of Weatherhaven systems cuts energy and fuel use — a 44% reduction in CO₂ emissions — and the redeployable softwall solution has the lowest carbon footprint of traditional shelter systems, from concrete to wood to modular.</p><p class="muted">Compared with shelters using standard insulation, Solarshades reduced fuel consumption by 2,631 litres a year — 7.33 tonnes of CO₂e — meaning less fuel to transport, and fewer convoys in hostile areas.</p></div>
    <div class="calc-box light-range"><label for="calc-n">Shelters with Solarshades <b id="calc-v" class="num">10</b></label><input type="range" id="calc-n" min="1" max="200" value="10" style="width:100%">
      <div class="calc-out"><div><b id="calc-fuel" class="num">26,310</b><span>litres of diesel saved per year</span></div><div><b id="calc-co2" class="num">73</b><span>tonnes CO₂e avoided per year</span></div></div>
      <p class="calc-note">Illustrative: assumes Weatherhaven’s published saving (2,631 L of fuel and 7.33 t CO₂e a year versus standard insulation) applies to each shelter.</p></div></div></section>
  <section class="sec" id="videos"><div class="wrap"><div class="sec-head"><h2 class="h-l">See the engineering at work.</h2><p class="lead">Videos load from YouTube when you press play.</p></div>
    <div class="vids">${vids.map(([id, t, k]) => `<div class="vid"><button data-yt="${id}" style="background-image:url(${IMG[k]})" aria-label="Play video: ${esc(t)}"><span class="play">${I.play}</span><b>${esc(t)}</b><span>YouTube</span></button></div>`).join('')}</div></div></section>
  ${ctaBand('Bring us the hard requirement.', 'From custom configurations to interoperability analysis, the engineering team designs around your mission.', 'in_solar')}`;
}
function initInnovation() {
  // HQSS plan
  const svg = $('#plan-svg'), chk = $('#plan-mecc');
  const drawPlan = () => {
    const k = 13.2, L = 41.8 * k, W = 23.8 * k, x0 = (640 - L) / 2, y0 = 40;
    let g = '';
    for (let x = 0; x <= 41.8; x += 1.5) g += `<line x1="${x0 + x * k}" y1="${y0}" x2="${x0 + x * k}" y2="${y0 + W}" stroke="rgba(141,179,218,.18)"/>`;
    for (let y = 0; y <= 23.8; y += 1.5) g += `<line x1="${x0}" y1="${y0 + y * k}" x2="${x0 + L}" y2="${y0 + y * k}" stroke="rgba(141,179,218,.18)"/>`;
    g = `<rect x="${x0}" y="${y0}" width="${L}" height="${W}" fill="rgba(13,66,117,.75)" stroke="#8db3da" stroke-width="2"/>` + g;
    g += `<line x1="${x0}" y1="${y0 + W + 24}" x2="${x0 + L}" y2="${y0 + W + 24}" stroke="#cfe0f0"/><text x="${x0 + L / 2}" y="${y0 + W + 44}" fill="#fff" font-family="Barlow" font-size="15" font-weight="600" text-anchor="middle">41.8 ft</text>`;
    g += `<line x1="${x0 - 22}" y1="${y0}" x2="${x0 - 22}" y2="${y0 + W}" stroke="#cfe0f0"/><text x="${x0 - 30}" y="${y0 + W / 2}" fill="#fff" font-family="Barlow" font-size="15" font-weight="600" text-anchor="middle" transform="rotate(-90 ${x0 - 30} ${y0 + W / 2})">23.8 ft</text>`;
    g += `<text x="${x0 + L / 2}" y="${y0 + W / 2 - 6}" fill="#fff" font-family="Barlow Semi Condensed" font-size="34" font-weight="600" text-anchor="middle">995 ft²</text><text x="${x0 + L / 2}" y="${y0 + W / 2 + 18}" fill="rgba(222,233,244,.75)" font-family="Barlow" font-size="13" text-anchor="middle">effective floor area · grid = 18\u0022 floor tiles</text>`;
    if (chk.checked) {
      const mL = 20 * k, mW = 24 * k, mx = x0 + L - mL - 8, my = y0 + (W - mW) / 2;
      g += `<rect x="${mx}" y="${Math.max(y0 - 22, my)}" width="${mL}" height="${mW}" fill="rgba(238,132,0,.18)" stroke="#EE8400" stroke-width="2" stroke-dasharray="6 4"/><text x="${mx + mL / 2}" y="${Math.max(y0 - 22, my) + 20}" fill="#EE8400" font-family="Barlow" font-size="13" font-weight="600" text-anchor="middle">MECC ≈480 ft²</text>`;
    }
    svg.innerHTML = g;
  };
  chk.addEventListener('change', drawPlan); drawPlan();
  // calculator
  const n = $('#calc-n');
  const calc = () => { const v = +n.value; $('#calc-v').textContent = v; $('#calc-fuel').textContent = (v * 2631).toLocaleString('en-US'); $('#calc-co2').textContent = Math.round(v * 7.33).toLocaleString('en-US'); n.style.setProperty('--v', ((v - 1) / 199 * 100) + '%'); };
  n.addEventListener('input', calc); calc();
  $$('[data-yt]').forEach(b => b.addEventListener('click', () => { b.parentElement.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" title="Weatherhaven video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; }));
}

/* ---------------- COMPANY ---------------- */
function pageCompany() {
  const ini = n => n.replace(/^(Dr\.|Lt Gen|Brig Gen)\s+/, '').split(' ').filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0, 2).join('');
  return `${pageHero({ crumb: [['Company', null]], title: 'Rapid, redeployable, since 1981.', lead: 'A designer, manufacturer and installer of portable turnkey shelters, camps and field hospitals — and an in-service support provider — working on multinational projects across all seven continents.', imgKey: 'workforce', stats: [['1981', 'Founded in British Columbia'], ['95+', 'Countries supplied'], ['ISO 9001:2015', 'Burnaby and Brockville']] })}
  <nav class="subnav" aria-label="On this page"><div class="wrap"><a href="/company/about" data-sub="about">Our story</a><a href="/company/history" data-sub="history">History</a><a href="/company/leadership" data-sub="leadership">Leadership</a><a href="/company/offices" data-sub="offices">Offices</a></div></nav>
  <section class="sec" id="about"><div class="wrap about-grid"><div class="copy">
    <p>Weatherhaven was founded in 1981 in British Columbia by the owners of a world-renowned expedition company and an exclusive Vancouver-based construction company.</p>
    <p>From its origins serving expedition and mining exploration, the company’s work is best showcased where transportation is hard, environments are extreme, and mobility, performance and sustainability matter most.</p>
    <p>From the commercial market, Weatherhaven grew into supporting government and non-government agencies and militaries — including peacekeeping missions around the world — with camp and medical capability. It has been listed among the top defence companies in Canada for its military work and product innovation.</p>
    <p>Today the focus is custom, leading-edge shelter solutions with turnkey options, energy efficiency, redeployability and integrated camp systems — staying true to a dynamic, creative and agile culture.</p>
    <div class="hero-cta" style="margin-top:12px"><a class="btn btn-line" href="${SITE.book}" target="_blank" rel="noopener">Read the 40th anniversary book</a><a class="btn btn-line" href="${SITE.iso}" target="_blank" rel="noopener">${I.doc}ISO certificate</a></div></div>
    <aside class="factbox"><div><b>1,000+ years</b><span>Of combined team experience planning and delivering shelter and camp solutions</span></div><div><b>ISO 9001:2015</b><span>Registered for design, development, manufacturing, installation and servicing of redeployable shelter systems</span></div><div><b>Top 50</b><span>Canadian defence companies, Canadian Defence Review — first named in 2011</span></div><div><b>Seven continents</b><span>Of deployments, from the Antarctic to the Arctic islands</span></div></aside></div></section>
  <section class="sec dark" id="history"><div class="wrap"><div class="sec-head"><h2 class="h-l">Four decades in the field.</h2><p class="lead">Use the years — or your arrow keys — to move through the company’s history.</p></div>
    <div class="tl"><div class="tl-track" role="group" aria-label="Years">${TIMELINE.map((t, i) => `<button data-tl="${i}" aria-pressed="${i === 0}">${t.y}</button>`).join('')}</div><div class="tl-panel" id="tl-panel" aria-live="polite"></div>
      <div class="tl-ctl"><button data-tlstep="-1" aria-label="Previous year">${I.left}</button><button data-tlstep="1" aria-label="Next year">${I.right}</button></div></div></div></section>
  <section class="sec" id="leadership"><div class="wrap"><div class="sec-head"><h2 class="h-l">Leadership</h2><p class="lead">An executive team with backgrounds in defence procurement, engineering, finance and government.</p></div>
    <div class="people">${PEOPLE.exec.map(p => `<div class="person"><div class="mono" aria-hidden="true">${ini(p.n)}</div><h3>${esc(p.n)}</h3><p class="role">${esc(p.r)}</p><p>${esc(p.b)}</p></div>`).join('')}</div>
    <div class="two" style="margin-top:64px;align-items:start"><div><h3 class="h-m" style="color:var(--navy);margin-bottom:18px">Regional managing directors</h3><div class="plist">${PEOPLE.regional.map(p => `<div><b>${esc(p.n)}</b><span>${esc(p.r)}</span></div>`).join('')}</div></div>
      <div><h3 class="h-m" style="color:var(--navy);margin-bottom:18px">US advisory board</h3><div class="plist">${PEOPLE.advisory.map(p => `<div><b>${esc(p.n)}</b><span>${esc(p.r)}</span></div>`).join('')}</div></div></div></div></section>
  <section class="sec ice" id="offices"><div class="wrap two" style="align-items:start"><div><h2 class="h-l">Head office and regional sites</h2><p class="lead" style="margin-top:16px">Expert teams across the world, wherever the project is.</p></div>
    <div class="cside"><div class="cblock"><h3>Head office</h3><p>${SITE.address.join('<br>')}</p><p style="margin-top:10px">Toll free (Canada & USA) <a href="tel:${SITE.tollFree}">${SITE.tollFree}</a><br>International <a href="tel:${SITE.intl}">${SITE.intl}</a><br><a href="mailto:${SITE.email}">${SITE.email}</a></p></div>
    <div class="cblock"><h3>Regional websites</h3><ul>${SITE.regional.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener">${r.name}</a></li>`).join('')}</ul></div>
    <div class="cblock"><h3>Suppliers</h3><p><a href="${SITE.supplier}" target="_blank" rel="noopener">Supplier information</a></p></div></div></div></section>
  ${ctaBand()}`;
}
function initCompany() {
  const panel = $('#tl-panel'); if (!panel) return;
  let i = 0;
  const show = n => {
    i = (n + TIMELINE.length) % TIMELINE.length; const t = TIMELINE[i];
    panel.innerHTML = `<div class="tl-img ${t.img ? '' : 'none'}">${t.img ? img(t.img, t.t) : t.y}</div><div><span class="yr">${t.y}</span><h3>${esc(t.t)}</h3><p>${esc(t.d)}</p></div>`;
    const track = $('.tl-track');
    $$('[data-tl]').forEach(b => { const on = +b.dataset.tl === i; b.setAttribute('aria-pressed', on); if (on) { const l = b.offsetLeft - track.offsetLeft, r = l + b.offsetWidth; if (l < track.scrollLeft || r > track.scrollLeft + track.clientWidth) track.scrollTo({ left: Math.max(0, l - 40), behavior: reduceMotion ? 'auto' : 'smooth' }); } });
  };
  $$('[data-tl]').forEach(b => b.addEventListener('click', () => show(+b.dataset.tl)));
  $$('[data-tlstep]').forEach(b => b.addEventListener('click', () => show(i + +b.dataset.tlstep)));
  $('.tl-track').addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(i + (e.key === 'ArrowRight' ? 1 : -1)); $(`[data-tl="${i}"]`).focus(); } });
  panel.innerHTML = ''; show(0);
}

/* ---------------- NEWS ---------------- */
function pageNews() {
  return `${pageHero({ crumb: [['Company', '/company'], ['News', null]], title: 'News', lead: 'Partnerships, programs and where to meet the team next.', imgKey: 'news_banner' })}
  <section class="sec"><div class="wrap">${newsList()}<p style="margin-top:36px"><a class="btn btn-line" href="${SITE.newsArchive}" target="_blank" rel="noopener">Browse the full news archive</a></p></div></section>${ctaBand()}`;
}

/* ---------------- CONTACT ---------------- */
function pageContact(q) {
  const prod = q.get('product') || '', sec = q.get('sector') || '';
  return `${pageHero({ crumb: [['Contact', null]], title: 'Contact us', lead: 'Tell us your needs and we’ll work with you to deliver a redeployable shelter solution that suits your operation.', imgKey: 'p_polar', stats: [[SITE.tollFree, 'Toll free, Canada & USA'], [SITE.intl, 'International']] })}
  <section class="sec"><div class="wrap contact"><div id="form-wrap">
    <h2 class="h-m" style="color:var(--navy);margin-bottom:24px">Start a request</h2>
    <form class="form" id="cform" novalidate>
      <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required><span class="err">Enter your name.</span></div>
      <div class="field"><label for="f-org">Organisation <span>(optional)</span></label><input id="f-org" name="org" autocomplete="organization"></div>
      <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required><span class="err">Enter a valid email, like name@example.com.</span></div>
      <div class="field"><label for="f-phone">Phone <span>(optional)</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
      <div class="field"><label for="f-sector">Sector</label><select id="f-sector" name="sector">${[['', 'Choose a sector'], ['military', 'Military & defence'], ['medical', 'Medical & emergency response'], ['commercial', 'Commercial, mining & research'], ['other', 'Other']].map(([v, t]) => `<option value="${v}" ${v === sec ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="f-region">Project region</label><select id="f-region" name="region">${['Choose a region', 'United States', 'Canada', 'UK & Europe', 'Latin America', 'Asia-Pacific', 'Middle East & Africa'].map((t, i) => `<option value="${i ? t : ''}">${t}</option>`).join('')}</select></div>
      <div class="field full"><label for="f-prod">System of interest</label><select id="f-prod" name="product"><option value="">Not sure yet — help me choose</option>${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === prod ? 'selected' : ''}>${p.name} — ${esc(p.full)}</option>`).join('')}<option value="camp">A complete turnkey camp</option><option value="parts">Parts, training or repair</option></select></div>
      <div class="field full"><label for="f-msg">What do you need to deploy?</label><textarea id="f-msg" name="message" placeholder="Mission, number of people, location, climate, timeline…"></textarea></div>
      <div class="field hp" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="sub"><button class="btn btn-primary" type="submit">Send request</button><p>Prefer the phone? Call ${SITE.tollFree}.</p></div><p class="form-err" role="alert" hidden></p>
    </form></div>
    <aside class="cside"><div class="cblock"><h3>Who to talk to</h3><div class="who">${CONTACTS.map((c, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(c.region)}${I.chev}</summary><ul>${c.people.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ul></details>`).join('')}</div></div>
    <div class="cblock"><h3>Head office</h3><p>${SITE.address.join('<br>')}</p></div>
    <div class="cblock"><h3>Regional websites</h3><p>${SITE.regional.map(r => `<a href="${r.url}" target="_blank" rel="noopener">${r.name}</a>`).join(' · ')}</p></div>
    <div class="cblock"><h3>Before you write</h3><p>The <a href="${SITE.rfpGuide}" target="_blank" rel="noopener">RFP guide</a> lists everything worth including, and the <a href="${SITE.instock}" target="_blank" rel="noopener">in-stock inventory</a> shows what can ship now.</p></div></aside></div></section>`;
}
function initContact() {
  const f = $('#cform'); if (!f) return;
  if (/[?&]plan=1/.test(location.search)) {
    let note = window.__planNote; try { note = note || sessionStorage.getItem('wh-plan-note'); } catch (_) { }
    if (note) { f.message.value = note; f.product.value = 'camp'; }
  }
  const team = { 'United States': 'US business development', 'Canada': 'Canada defence and medical', 'UK & Europe': 'UK and Europe', 'Latin America': 'Latin America', 'Asia-Pacific': 'global sales', 'Middle East & Africa': 'global sales' };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const name = f.name.value.trim(), email = f.email.value.trim();
    const okN = !!name, okE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    f.name.closest('.field').classList.toggle('bad', !okN); f.email.closest('.field').classList.toggle('bad', !okE);
    if (!okN) return f.name.focus(); if (!okE) return f.email.focus();
    const p = P(f.product.value);
    const t = team[f.region.value] || (f.sector.value === 'commercial' ? 'global commercial' : 'sales');
    const btn = $('button[type=submit]', f), err = $('.form-err', f); btn.disabled = true; btn.textContent = 'Sending…'; err.hidden = true;
    const data = Object.fromEntries(new FormData(f).entries()); data.page = location.href;
    fetch('/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json().then(j => ({ ok: r.ok && j.ok, j })), () => ({ ok: false, j: {} })).then(({ ok, j }) => {
      if (!ok) { btn.disabled = false; btn.textContent = 'Send request'; err.textContent = (j && j.error) || 'We could not send that just now. Please call us or try again.'; err.hidden = false; return; }
      $('#form-wrap').innerHTML = `<div class="sent" tabindex="-1" id="sent"><h3>Thanks, ${esc(name.split(' ')[0])}. Your request is on its way.</h3><p class="muted">It goes to the ${esc(t)} team${p ? ` with your interest in the ${esc(p.name)}` : ''}. We’ll reply by email${f.phone.value.trim() ? ' or phone' : ''}.</p><p style="margin-top:18px"><a class="link" href="/products">Keep browsing products</a></p></div>`;
      $('#sent').focus();
    });
  });
}

/* ---------------- RECORD (globe as its own page) ---------------- */
function pageRecord() { return `<div style="padding-top:var(--top0);background:var(--navy-900)"></div>${globeSection().replace('<h2 class="h-l">A field record on every continent.</h2>', '<h1 class="h-l">A field record on every continent.</h1>')}${ctaBand()}`; }

/* ---------------- modal / palette / finder ---------------- */
let lastFocus = null;
function openOverlay(el) { lastFocus = document.activeElement; el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeOverlay(el) { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; lastFocus && lastFocus.focus && lastFocus.focus(); }
function trapFocus(e, root) {
  if (e.key !== 'Tab') return;
  const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', root).filter(x => x.offsetParent !== null);
  if (!f.length) return; const a = f[0], b = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
}
function openModal(title, body) {
  const ov = $('#modal-ov');
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t"><div class="modal-h"><h2 id="modal-t">${esc(title)}</h2><button class="x" data-close aria-label="Close">${I.x}</button></div><div class="modal-b">${body}</div></div>`;
  openOverlay(ov); setTimeout(() => { const c = $('.x', ov); c && c.focus(); }, 30);
}
function initOverlays() {
  const ov = $('#modal-ov');
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeOverlay(ov); });
  ov.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(ov); trapFocus(e, ov); });
  const pal = $('#pal-ov');
  pal.addEventListener('click', e => { if (e.target === pal) closeOverlay(pal); });
}

/* search index */
function buildIndex() {
  const idx = [];
  const add = (t, s, href, type, kw = '', ext) => idx.push({ t, s, href, type, kw: (t + ' ' + s + ' ' + kw).toLowerCase(), ext });
  add('Find a shelter', 'Four questions to the right system', 'action:finder', 'Action', 'recommend choose help quiz wizard');
  add('Compare products', 'Side-by-side specifications', 'action:compare', 'Action', 'versus vs');
  add('Camp planner', 'Lay out shelters on a site plan, in 2D and 3D', '/plan', 'Tool', 'layout site plan camp design configurator builder interconnector');
  PRODUCTS.forEach(p => add(p.name, p.full, `/products/${p.id}`, 'Product', p.tagline + ' ' + p.apps.join(' ') + ' ' + p.family));
  add('HQSS', 'Headquarters Shelter System — Canada', '/innovation/hqss', 'Product', 'canada program spec sheet headquarters');
  Object.entries(SECTORS).forEach(([k, s]) => { add(s.name, 'Solutions', `/${k}`, 'Page', s.lead); s.apps.forEach(a => add(a.name, s.name, `/${k}/${a.id}`, 'Mission', a.text)); });
  [['Products', '/products'], ['Services & support', '/services'], ['Innovation', '/innovation'], ['Company', '/company'], ['History', '/company/history'], ['Leadership', '/company/leadership'], ['News', '/news'], ['Contact us', '/contact'], ['Where we’ve worked', '/record']].forEach(([t, h]) => add(t, 'Page', h, 'Page'));
  SERVICES.forEach(s => add(s.name, 'Service', `/services/${s.id}`, 'Service', s.text));
  SUPPORT.forEach(s => add(s.name, 'Support system', `/services/support`, 'Service', s.text));
  ACCESSORIES.forEach(a => add(a.name, 'Accessory', `/products/accessories`, 'Service', a.text));
  PEOPLE.exec.forEach(p => add(p.n, p.r, '/company/leadership', 'Person'));
  CONTACTS.forEach(c => c.people.forEach(([n, r]) => add(n, `${r} — ${c.region}`, '/contact', 'Person', c.region)));
  NEWS.forEach(n => add(n.t, n.date, n.url, 'News', n.d, 1));
  add('RFP guide', 'PDF download', SITE.rfpGuide, 'Download', 'request for proposal tender spec', 1);
  add('In-stock inventory', 'PDF download — ready to ship', SITE.instock, 'Download', 'available now stock inventory', 1);
  add('ISO 9001:2015 certificate', 'PDF download', SITE.iso, 'Download', 'quality', 1);
  add('Energy efficiency calculator', 'Solarshade fuel savings', '/innovation/energy', 'Page', 'fuel co2 carbon diesel');
  return idx;
}
const TYPE_ICON = { Action: I.spark, Product: I.cube, Page: I.page, Mission: I.pin, Service: I.box, Person: I.user, News: I.news, Download: I.doc };
let INDEX = null;
function openPalette() {
  INDEX = INDEX || buildIndex();
  const ov = $('#pal-ov');
  ov.innerHTML = `<div class="pal" role="dialog" aria-modal="true" aria-label="Search"><div class="pal-in">${I.search}<input id="pal-q" placeholder="Search products, missions, people, downloads…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="pal-res" aria-autocomplete="list"><kbd>Esc</kbd></div><div class="pal-res" id="pal-res" role="listbox"></div><div class="pal-foot"><span>↑ ↓ to move</span><span>Enter to open</span><span>Esc to close</span></div></div>`;
  openOverlay(ov);
  const q = $('#pal-q'), res = $('#pal-res'); let sel = 0, items = [];
  const SUGGEST = ['Find a shelter', 'MECC', 'TRECC', 'Field hospitals', 'Command & control', 'In-stock inventory', 'Contact us'];
  const run = () => {
    const v = q.value.trim().toLowerCase();
    if (!v) items = SUGGEST.map(s => INDEX.find(x => x.t === s)).filter(Boolean);
    else {
      const terms = v.split(/\s+/);
      items = INDEX.map(x => { const t = x.t.toLowerCase(); let sc = 0; if (t === v) sc += 100; if (t.startsWith(v)) sc += 50; if (t.includes(v)) sc += 25; if (terms.every(w => x.kw.includes(w))) sc += 10; else sc = sc > 0 ? sc : 0; return [sc, x]; }).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 12).map(a => a[1]);
    }
    sel = 0; render(v);
  };
  const render = v => {
    if (!items.length) { res.innerHTML = `<div class="pal-empty">No matches for “${esc(q.value)}”. Try a product name like <b>HERCon</b>, a mission like <b>field hospital</b>, or a person’s name.</div>`; return; }
    let group = '';
    res.innerHTML = items.map((x, i) => { const head = !v ? (i === 0 ? '<div class="pal-group">Suggested</div>' : '') : (x.type !== group ? `<div class="pal-group">${(group = x.type)}</div>` : ''); return `${head}<a class="pal-item ${i === sel ? 'sel' : ''}" role="option" aria-pressed="${i === sel}" data-i="${i}" ${x.href.startsWith('action:') ? 'href="#"' : linkAttrs(x.href, x.ext)}><span class="pi">${TYPE_ICON[x.type] || I.page}</span><span><b>${esc(x.t)}</b><span>${esc(x.s)}</span></span><em>${x.ext ? 'Opens in new tab' : ''}</em></a>`; }).join('');
  };
  const go = i => { const x = items[i]; if (!x) return; closeOverlay(ov); if (x.href === 'action:finder') openFinder(); else if (x.href === 'action:compare') openCompare(); else if (x.ext) window.open(x.href, '_blank', 'noopener'); else navigate(x.href); };
  q.addEventListener('input', run);
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; $$('.pal-item', res).forEach((a, i) => { a.classList.toggle('sel', i === sel); a.setAttribute('aria-pressed', i === sel); if (i === sel) a.scrollIntoView({ block: 'nearest' }); }); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    if (e.key === 'Escape') closeOverlay(ov);
  });
  res.addEventListener('click', e => { const a = e.target.closest('.pal-item'); if (!a) return; e.preventDefault(); go(+a.dataset.i); });
  res.addEventListener('mousemove', e => { const a = e.target.closest('.pal-item'); if (!a || +a.dataset.i === sel) return; sel = +a.dataset.i; $$('.pal-item', res).forEach((x, i) => x.classList.toggle('sel', i === sel)); });
  run(); setTimeout(() => q.focus(), 20);
}

/* finder */
function openFinder() {
  const ans = {}; let step = 0;
  openModal('Find the right shelter', '<div id="finder"></div>');
  const root = $('#finder');
  const render = () => {
    if (step < FINDER.length) {
      const q = FINDER[step];
      root.innerHTML = `<div class="fprog">${FINDER.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div><div class="fq"><p class="kicker">Question ${step + 1} of ${FINDER.length}</p><h3 id="fq-h">${esc(q.q)}</h3><p class="muted">Pick the closest match — you can change it later.</p><div class="fopts" role="group" aria-labelledby="fq-h">${q.opts.map(([v, t]) => `<button data-v="${v}" aria-pressed="${ans[q.key] === v}"><i></i>${esc(t)}</button>`).join('')}</div>
        <div class="fnav"><button class="btn btn-line btn-sm" data-back ${step === 0 ? 'style="visibility:hidden"' : ''}>${I.left}Back</button><span class="muted" style="font-size:14px">Based on published Weatherhaven product data</span></div></div>`;
      $$('[data-v]', root).forEach(b => b.addEventListener('click', () => { ans[q.key] = b.dataset.v; step++; render(); }));
      $('[data-back]', root).addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
      const first = $('[data-v]', root); first && first.focus();
    } else results();
  };
  const results = () => {
    const W = { m: 3, t: 2, c: 2, d: 1 }, max = 3 * (W.m + W.t + W.c + W.d);
    let scored = PRODUCTS.map(p => { let s = 0; Object.keys(W).forEach(k => s += W[k] * (p.finder[k][ans[k]] || 0)); return { p, s, mOk: p.finder.m[ans.m] > 0 }; });
    let pool = scored.filter(x => x.mOk); if (pool.length < 3) pool = scored;
    pool.sort((a, b) => b.s - a.s);
    const top = pool.slice(0, 3);
    const label = (k) => FINDER.find(f => f.key === k).opts.find(o => o[0] === ans[k])[1];
    const reasons = p => { const r = []; ['m', 't', 'c', 'd'].forEach(k => { const w = p.why[ans[k]]; if (w && !r.includes(w)) r.push(w); }); if (r.length < 2) r.push(p.tagline); return r.slice(0, 3); };
    const extra = ans.m === 'camp' ? 'Complete the camp with kitchens, ablutions, laundry, power and water from <a class="link" href="/services/support" data-close>support systems</a>.' : ans.m === 'medical' ? 'Link shelters with <a class="link" href="/products/accessories" data-close>interconnectors and corridors</a> so patients never step outside.' : ans.c === 'hot' ? 'Add <a class="link" href="/products/accessories" data-close>Solarshades</a> — compared with standard insulation, they cut fuel use by 2,631 L a year.' : '';
    root.innerHTML = `<div class="fprog">${FINDER.map(() => '<i class="on"></i>').join('')}</div><p class="kicker">Your best matches</p><div class="fsum">${FINDER.map(f => `<span class="chip">${esc(label(f.key))}</span>`).join('')}</div>
      <div class="fres">${top.map((x, i) => { const pct = Math.round(x.s / max * 100); return `<div class="fr ${i === 0 ? 'top' : ''}"><div class="frimg">${img(x.p.imgs[0], x.p.name)}</div><div><h4>${esc(x.p.name)}<small>${esc(x.p.full)}</small></h4><ul>${reasons(x.p).map(r => `<li>${esc(r)}</li>`).join('')}</ul><div class="acts"><a class="btn btn-primary btn-sm" href="/products/${x.p.id}" data-close>View ${esc(x.p.name)}</a><a class="btn btn-line btn-sm" href="/contact?product=${x.p.id}" data-close>Request a quote</a></div></div><div class="match"><b class="num">${pct}%</b><span>${i === 0 ? 'Best match' : 'Match'}</span><div class="bar"><i style="width:${pct}%"></i></div></div></div>`; }).join('')}</div>
      ${extra ? `<p class="note">${extra}</p>` : ''}
      <div class="fnav"><button class="btn btn-line btn-sm" data-restart>${I.left}Start over</button><button class="btn btn-line btn-sm" data-cmpall>Compare these three</button></div>`;
    $('[data-restart]', root).addEventListener('click', () => { step = 0; Object.keys(ans).forEach(k => delete ans[k]); render(); });
    $('[data-cmpall]', root).addEventListener('click', () => { compare.clear(); top.forEach(x => compare.add(x.p.id)); syncCompare(); openCompare(); });
  };
  render();
}

/* ---------------- CAMP PLANNER ---------------- */
const PT = id => PLAN_TYPES.find(t => t.id === id);
const PLAN_KEY = 'wh-plan-v1';
const PL = { items: [], sel: null, undo: [], view: null, mode: 'plan', seq: 1 };
const plDims = it => { const T = PT(it.t), a = T.mod ? it.len : T.a, b = T.b, rot = it.r % 180 !== 0; return { a, b, w: rot ? b : a, h: rot ? a : b }; };
const plFt = v => { const ft = Math.floor(v + 1e-6), inch = Math.round((v - ft) * 12); return inch === 12 ? `${ft + 1}'` : inch ? `${ft}'${inch}"` : `${ft}'`; };
const plNum = n => Math.round(n).toLocaleString('en-US');
function plLoad() { try { const j = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); if (j && Array.isArray(j.items)) { PL.items = j.items.filter(i => PT(i.t)); PL.seq = PL.items.reduce((m, i) => Math.max(m, i.id + 1), 1); } } catch (_) { } }
function plSave() { try { localStorage.setItem(PLAN_KEY, JSON.stringify({ items: PL.items })); } catch (_) { } }
function plSnap() { PL.undo.push(JSON.stringify(PL.items)); if (PL.undo.length > 60) PL.undo.shift(); }
function plMake(t, x, y, r = 0, len) { const T = PT(t); return { id: PL.seq++, t, x, y, r, len: T.mod ? (len || T.a) : undefined }; }
function plBounds(items = PL.items) {
  if (!items.length) return null;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  items.forEach(it => { const d = plDims(it); x0 = Math.min(x0, it.x - d.w / 2); x1 = Math.max(x1, it.x + d.w / 2); y0 = Math.min(y0, it.y - d.h / 2); y1 = Math.max(y1, it.y + d.h / 2); });
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}
function plOverlaps() {
  const bad = new Set(), r = PL.items.map(it => { const d = plDims(it); return { id: it.id, x0: it.x - d.w / 2, x1: it.x + d.w / 2, y0: it.y - d.h / 2, y1: it.y + d.h / 2 }; });
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const A = r[i], B = r[j];
    if (Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) > 0.05 && Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) > 0.05) { bad.add(A.id); bad.add(B.id); }
  }
  return bad;
}
function plTotals(items = PL.items) {
  const count = {}, out = { area: 0, approx: false, iso: 0, pallet: 0, mex: 0, soft: 0, conn: 0, count };
  items.forEach(it => {
    const T = PT(it.t), d = plDims(it); count[it.t] = (count[it.t] || 0) + 1;
    out.area += d.a * d.b; if (T.approx) out.approx = true;
    if (T.ships === 'iso') out.iso++; else if (T.ships === 'pallet') out.pallet++; else if (T.ships === 'mex') out.mex++; else if (T.ships === 'soft') out.soft++;
    if (T.kind === 'conn') out.conn++;
  });
  out.bounds = plBounds(items);
  return out;
}
// one shelter, drawn in plan units (feet). opts.light = print colours for the downloaded plan
function plItemSVG(it, opts = {}) {
  const T = PT(it.t), d = plDims(it), a = d.a, b = d.b, L = opts.light;
  const fill = { exp: L ? '#fde9cf' : 'rgba(238,132,0,.2)', soft: L ? '#dfe8d5' : 'rgba(126,170,104,.24)', conn: L ? '#e3e6ea' : 'rgba(200,214,228,.22)' }[T.kind];
  const stroke = { exp: '#EE8400', soft: L ? '#5b7f46' : '#9fd28a', conn: L ? '#7b8794' : '#c3d2e2' }[T.kind];
  let inner = '';
  if (T.kind === 'exp') {
    const core = it.t === 'ateps' ? 84 / 12 : 8;
    inner += `<rect x="${-a / 2}" y="${-core / 2}" width="${a}" height="${core}" fill="${L ? '#f7c88f' : 'rgba(238,132,0,.38)'}"/>`;
    if (it.t !== 'ateps') inner += `<rect x="${-a / 2 - 0.35}" y="${1.6 - 1.35}" width="0.7" height="2.7" fill="${L ? '#0D4275' : '#fff'}"/>`;
  } else if (T.kind === 'soft') {
    inner += `<line x1="${-a / 2 + 1}" y1="0" x2="${a / 2 - 1}" y2="0" stroke="${stroke}" stroke-dasharray="1.2 1" stroke-width="${opts.sw || 0.12}"/>`;
    [-1, 1].forEach(s => { inner += `<rect x="${s * a / 2 - 0.35}" y="-2" width="0.7" height="4" fill="${L ? '#0D4275' : '#fff'}"/>`; });
  }
  const fs = T.kind === 'conn' ? 0 : Math.max(1.6, Math.min(3, Math.min(a, b) * 0.16));
  const lab = fs ? `<g transform="rotate(${-it.r})"><text x="0" y="${fs * 0.35}" font-size="${fs}" text-anchor="middle" font-family="Barlow Semi Condensed, Arial Narrow, sans-serif" font-weight="600" fill="${L ? '#0D4275' : '#fff'}">${esc(T.name)}</text></g>` : '';
  const cls = opts.cls || '';
  const aria = opts.light ? '' : ` tabindex="0" role="button" aria-label="${esc(T.name)}, ${plFt(d.w)} by ${plFt(d.h)}${PL.sel === it.id ? ', selected' : ''}"`;
  return `<g class="pi k-${T.kind} ${cls}" data-id="${it.id}" transform="translate(${it.x} ${it.y}) rotate(${it.r})"${aria}><rect class="pb" x="${-a / 2}" y="${-b / 2}" width="${a}" height="${b}" fill="${fill}" stroke="${stroke}" stroke-width="${opts.sw || 0.15}"/>${inner}${lab}</g>`;
}
function plPreviewSVG(ex) {
  const items = ex.items.map(([t, x, y, r, len], i) => ({ id: -1 - i, t, x, y, r, len: PT(t).mod ? len : undefined }));
  const B = plBounds(items), m = 4;
  return `<svg viewBox="${B.x0 - m} ${B.y0 - m} ${B.w + m * 2} ${B.h + m * 2}" role="img" aria-label="${esc(ex.name)} example layout">${items.map(it => plItemSVG(it, { light: false, sw: 0.25 }).replace(/ tabindex="0" role="button" aria-label="[^"]*"/, '')).join('')}</svg>`;
}

function pagePlan() {
  const card = T => `<button type="button" class="pp-card k-${T.kind}" data-add="${T.id}" aria-label="Add ${esc(T.name)} to the plan"><span class="pp-sw"></span><span class="pp-t"><b>${esc(T.short || T.name)}</b><small>${esc(T.size)}</small></span><span class="pp-plus" aria-hidden="true">${I.plus}</span></button>`;
  return `<section class="phero plan-hero"><div class="wrap phero-in" style="min-height:0">
    <div class="phero-copy" style="padding-bottom:36px">${crumbs([['Products', '/products'], ['Camp planner', null]])}<h1 class="h-xl">Plan a camp.</h1>
    <p class="lead">Drag Weatherhaven shelters onto a site plan and link them with standard interconnectors. Floor space and shipping add up as you go. Switch to 3D to walk around it, then send the plan with your quote request.</p></div>
    <div class="phero-img plan-hero-img">${img('app_fh', '')}</div></div></section>
  <section class="planner" id="planner"><div class="wrap pl-shell">
    <aside class="pl-palette" aria-label="Shelters you can add">
      <h2>Add to the plan</h2><p class="pl-help">Drag onto the site, or tap to add.</p>
      <div class="pp-group">${PLAN_TYPES.filter(T => T.kind !== 'conn').map(card).join('')}</div>
      <h3>Interconnectors <span>standard sizes</span></h3>
      <div class="pp-group">${PLAN_TYPES.filter(T => T.kind === 'conn').map(card).join('')}</div>
      <h3>Start from an example</h3>
      <div class="pp-ex">${PLAN_EXAMPLES.map(ex => `<button type="button" data-ex="${ex.id}"><b>${esc(ex.name)}</b><small>${esc(ex.d)}</small></button>`).join('')}</div>
      <button type="button" class="pl-clear" data-pl="clear">Clear the plan</button>
    </aside>
    <div class="pl-main">
      <div class="pl-bar" id="pl-bar">
        <div class="seg" role="group" aria-label="View"><button type="button" data-mode="plan" aria-pressed="true">Plan</button><button type="button" data-mode="3d" aria-pressed="false">${I.cube}3D</button></div>
        <div class="pl-tools pl-plan-only">
          <button type="button" data-pl="undo" aria-label="Undo" title="Undo (Ctrl+Z)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
          <button type="button" data-pl="zoomout" aria-label="Zoom out">−</button><button type="button" data-pl="zoomin" aria-label="Zoom in">+</button><button type="button" data-pl="fit">Fit</button>
        </div>
        <div class="pl-3d-only pl-wx">${climateSeg('arctic')}<div class="wx-row"><label class="tod" title="Time of day">${I.sun}<input type="range" min="0" max="100" value="55" data-tod aria-label="Time of day, from midday to night">${I.moon}</label><label class="toggle"><input type="checkbox" data-storm>Storm</label></div></div>
      </div>
      <div class="pl-stage" id="pl-stage">
        <svg id="pl-svg" tabindex="0" role="application" aria-label="Site plan. Select a shelter, then use the arrow keys to move it, R to rotate, D to duplicate and Delete to remove it." aria-describedby="pl-keys"></svg>
        <div class="pl-3d" id="pl-3d" hidden></div>
        <div class="pl-empty" id="pl-empty"><b>Your site is empty.</b><span>Drag a shelter from the left, or start from an example.</span></div>
        <div class="pl-scale" id="pl-scale" aria-hidden="true"><i></i><span></span></div>
        <p class="pl-keys" id="pl-keys">Drag to move · R rotate · D duplicate · Del remove · drag the background to pan</p>
        <p class="pl-ill pl-3d-only">Illustrative 3D · softwall heights not to scale</p>
      </div>
    </div>
    <aside class="pl-side" aria-label="Plan details">
      <div class="pl-sel" id="pl-sel"></div>
      <div class="pl-tot" id="pl-tot" aria-live="polite"></div>
      <div class="pl-acts"><button type="button" class="btn btn-primary" data-pl="quote">Request a quote with this plan</button><button type="button" class="btn btn-ghost" data-pl="download">${I.doc}Download the plan</button></div>
      <p class="pl-note">A planning aid, not an engineering drawing. Footprints use published dimensions; the MECC and EHMECC deployed width is approximate. Weatherhaven’s engineering and design team works with you on the final configuration.</p>
    </aside>
  </div></section>
  ${ctaBand('Not sure where to start?', 'Tell us the mission, the site and how long you’ll stay — Weatherhaven designs turnkey camps from a single shelter up.', 'workforce')}`;
}

function initPlan() {
  plLoad(); PL.sel = null; PL.undo = []; PL.mode = 'plan';
  const svg = $('#pl-svg'), stage = $('#pl-stage'), root = $('#planner');
  let V = { tx: 0, ty: 0, s: 6 }, guides = [];
  const toW = (cx, cy) => { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - V.tx) / V.s, y: (cy - r.top - V.ty) / V.s }; };
  const sel = () => PL.items.find(i => i.id === PL.sel);
  const fit = () => {
    const r = svg.getBoundingClientRect(), B = plBounds();
    if (!B) { V = { s: 6, tx: r.width / 2 - 30 * 6, ty: r.height / 2 - 20 * 6 }; return; }
    const m = 48, s = clampN(Math.min((r.width - m * 2) / Math.max(B.w, 20), (r.height - m * 2) / Math.max(B.h, 20)), 2, 16);
    V = { s, tx: r.width / 2 - (B.x0 + B.w / 2) * s, ty: r.height / 2 - (B.y0 + B.h / 2) * s };
  };
  const render = () => {
    const r = svg.getBoundingClientRect(), s = V.s, bad = plOverlaps();
    const x0 = -V.tx / s, y0 = -V.ty / s, W = r.width / s, H = r.height / s, sw = 1 / s;
    const minor = s >= 5 ? `<pattern id="plg1" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="rgba(141,179,218,.08)" stroke-width="${sw}"/></pattern>` : '';
    let g = `<defs>${minor}<pattern id="plg10" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(141,179,218,.2)" stroke-width="${sw}"/></pattern></defs>`;
    g += `<g transform="translate(${V.tx} ${V.ty}) scale(${s})">`;
    if (minor) g += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#plg1)"/>`;
    g += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#plg10)"/>`;
    PL.items.forEach(it => { g += plItemSVG(it, { cls: (it.id === PL.sel ? 'on ' : '') + (bad.has(it.id) ? 'bad' : ''), sw: 1.6 / s }); });
    guides.forEach(gd => { g += gd.x != null ? `<line x1="${gd.x}" y1="${y0}" x2="${gd.x}" y2="${y0 + H}" class="pl-guide" stroke-width="${sw}"/>` : `<line x1="${x0}" y1="${gd.y}" x2="${x0 + W}" y2="${gd.y}" class="pl-guide" stroke-width="${sw}"/>`; });
    g += '</g>';
    svg.innerHTML = g;
    $('#pl-empty').hidden = PL.items.length > 0;
    // scale bar: pick a round length near 120px
    const opts = [5, 10, 20, 25, 50, 100], ft = opts.find(o => o * s >= 90) || 100;
    $('#pl-scale i').style.width = (ft * s) + 'px'; $('#pl-scale span').textContent = `${ft} ft`;
  };
  const side = () => {
    const it = sel(), T = it && PT(it.t);
    $('#pl-sel').innerHTML = it ? `<p class="kicker">Selected</p><h3>${esc(T.name)}</h3><p class="muted">${esc(T.size)}${T.blurb ? ' — ' + esc(T.blurb) : ''}</p>
      ${T.mod ? `<label class="pl-len">Length <span><button type="button" data-len="-2" aria-label="Shorter">−</button><input type="number" min="12" max="200" step="2" value="${it.len}" id="pl-len" aria-label="Length in feet"><button type="button" data-len="2" aria-label="Longer">+</button></span> ft</label>` : ''}
      <div class="pl-sel-acts"><button type="button" data-pl="rotate">Rotate</button><button type="button" data-pl="dup">Duplicate</button><button type="button" data-pl="del">Remove</button></div>`
      : `<p class="kicker">Selected</p><p class="muted">Nothing selected. Tap a shelter on the plan to move, rotate or remove it.</p>`;
    const t = plTotals(), bad = plOverlaps();
    const lines = Object.entries(t.count).map(([k, n]) => `<li><span>${esc(PT(k).name)}</span><b>${n}</b></li>`).join('');
    const ships = [t.iso ? `${t.iso} × ISO container${t.iso > 1 ? 's' : ''} (MECC, EHMECC)` : '', t.pallet ? `${t.pallet} × 463L pallet${t.pallet > 1 ? 's' : ''} (ATEPS)` : '',
      t.mex ? `MEX-26: the first-line system fits one 463L pallet` : '', t.soft ? `Series 8: packed size depends on length` : ''].filter(Boolean);
    const setups = [...new Set(PL.items.map(i => PT(i.t)).filter(T => T.setup).map(T => `${T.name}: ${T.setup}`))];
    $('#pl-tot').innerHTML = PL.items.length ? `
      <div class="pl-big"><small>Floor space${t.approx ? ', approx.' : ''}</small><b>${t.approx ? '≈' : ''}${plNum(t.area)} ft²</b><span>${t.approx ? '≈' : ''}${plNum(t.area * 0.092903)} m²</span></div>
      <div class="pl-big"><small>Site footprint</small><b>${plFt(t.bounds.w)} × ${plFt(t.bounds.h)}</b><span>${plNum(t.bounds.w * t.bounds.h)} ft² incl. gaps</span></div>
      <h4>In the plan</h4><ul class="pl-list">${lines}</ul>
      ${ships.length ? `<h4>Ships as</h4><ul class="pl-plain">${ships.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${setups.length ? `<h4>Set-up, per shelter</h4><ul class="pl-plain">${setups.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${bad.size ? `<p class="pl-warn">${bad.size} shelters overlap — drag them apart.</p>` : ''}`
      : `<p class="muted">Add shelters to see floor space, shipping and set-up add up.</p>`;
    $$('[data-mode="3d"]', root).forEach(b => b.disabled = !PL.items.length);
  };
  const update = (save = true) => { render(); side(); if (save) plSave(); if (PL.mode === '3d') sync3d(); };
  const commit = () => { update(); };

  // free spot: to the right of everything, top-aligned
  const freeSpot = T => { const B = plBounds(); if (!B) return { x: T.a / 2 + 4, y: T.b / 2 + 4 }; return { x: B.x1 + 4 + (T.mod ? T.a : T.a) / 2, y: B.y0 + T.b / 2 }; };
  const add = (t, at) => { plSnap(); const T = PT(t), p = at || freeSpot(T); const it = plMake(t, Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2); PL.items.push(it); PL.sel = it.id; if (!at) { const r = svg.getBoundingClientRect(), d = plDims(it), sx = it.x * V.s + V.tx, sy = it.y * V.s + V.ty; if (sx + d.w * V.s / 2 > r.width || sy + d.h * V.s / 2 > r.height) fit(); } commit(); return it; };

  // edge snapping against the other shelters
  const snap = (it, nx, ny) => {
    const d = plDims(it), hw = d.w / 2, hh = d.h / 2; let bx = null, by = null, best = 1.25, bestY = 1.25;
    nx = Math.round(nx * 2) / 2; ny = Math.round(ny * 2) / 2; guides = [];
    PL.items.forEach(o => {
      if (o.id === it.id) return; const od = plDims(o), oL = o.x - od.w / 2, oR = o.x + od.w / 2, oT = o.y - od.h / 2, oB = o.y + od.h / 2;
      [[oL - (nx - hw), oL], [oR - (nx + hw), oR], [oL - (nx + hw), oL], [oR - (nx - hw), oR], [o.x - nx, o.x]].forEach(([dd, gx]) => { if (Math.abs(dd) < best) { best = Math.abs(dd); bx = { dd, gx }; } });
      [[oT - (ny - hh), oT], [oB - (ny + hh), oB], [oT - (ny + hh), oT], [oB - (ny - hh), oB], [o.y - ny, o.y]].forEach(([dd, gy]) => { if (Math.abs(dd) < bestY) { bestY = Math.abs(dd); by = { dd, gy }; } });
    });
    if (bx) { nx += bx.dd; guides.push({ x: bx.gx }); } if (by) { ny += by.dd; guides.push({ y: by.gy }); }
    return { x: nx, y: ny };
  };

  // pointer: move shelters, pan the site
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const g = e.target.closest('.pi'), p = toW(e.clientX, e.clientY);
    if (g) { const it = PL.items.find(i => i.id === +g.dataset.id); PL.sel = it.id; drag = { it, ox: p.x - it.x, oy: p.y - it.y, moved: false, before: JSON.stringify(PL.items) }; side(); render(); }
    else { drag = { pan: true, sx: e.clientX, sy: e.clientY, tx: V.tx, ty: V.ty, moved: false }; }
    svg.setPointerCapture(e.pointerId); svg.classList.add('grabbing');
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.pan) { const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; V.tx = drag.tx + dx; V.ty = drag.ty + dy; render(); return; }
    const p = toW(e.clientX, e.clientY), q = snap(drag.it, p.x - drag.ox, p.y - drag.oy);
    if (q.x !== drag.it.x || q.y !== drag.it.y) { drag.it.x = q.x; drag.it.y = q.y; drag.moved = true; render(); }
  });
  const up = () => {
    if (!drag) return; svg.classList.remove('grabbing'); guides = [];
    if (drag.pan) { if (!drag.moved && PL.sel != null) { PL.sel = null; side(); } render(); }
    else if (drag.moved) { PL.undo.push(drag.before); commit(); } else render();
    drag = null;
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01)); }, { passive: false });
  const zoomAt = (cx, cy, k) => { const r = svg.getBoundingClientRect(), p = toW(cx, cy), s = clampN(V.s * k, 2, 24); V.s = s; V.tx = cx - r.left - p.x * s; V.ty = cy - r.top - p.y * s; render(); };
  // keyboard
  svg.addEventListener('focusin', e => { const g = e.target.closest && e.target.closest('.pi'); if (g && PL.sel !== +g.dataset.id) { PL.sel = +g.dataset.id; side(); } });
  svg.addEventListener('keydown', e => {
    const it = sel(), k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); act('undo'); return; }
    if (!it) return;
    const step = e.shiftKey ? 5 : 0.5, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (mv) { e.preventDefault(); plSnap(); it.x += mv[0]; it.y += mv[1]; commit(); refocus(); }
    else if (k === 'r' || k === 'R') { e.preventDefault(); act('rotate'); }
    else if (k === 'd' || k === 'D') { e.preventDefault(); act('dup'); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); act('del'); }
    else if (k === 'Escape') { PL.sel = null; side(); render(); }
  });
  const refocus = () => { const g = svg.querySelector(`.pi[data-id="${PL.sel}"]`); g ? g.focus({ preventScroll: true }) : svg.focus({ preventScroll: true }); };

  const act = a => {
    const it = sel();
    if (a === 'undo') { if (!PL.undo.length) return toast('Nothing to undo'); PL.items = JSON.parse(PL.undo.pop()); if (!sel()) PL.sel = null; commit(); return; }
    if (a === 'zoomin' || a === 'zoomout') { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, a === 'zoomin' ? 1.25 : 0.8); return; }
    if (a === 'fit') { fit(); render(); return; }
    if (a === 'clear') { if (!PL.items.length) return; plSnap(); PL.items = []; PL.sel = null; commit(); toast('Plan cleared — Ctrl+Z to undo'); return; }
    if (a === 'download') return plDownload();
    if (a === 'quote') { if (!PL.items.length) return toast('Add a shelter first'); try { sessionStorage.setItem('wh-plan-note', plSummary()); } catch (_) { } window.__planNote = plSummary(); navigate('/contact?product=camp&plan=1'); return; }
    if (!it) return;
    if (a === 'rotate') { plSnap(); it.r = (it.r + 90) % 180; commit(); refocus(); }
    if (a === 'dup') { const d = plDims(it); plSnap(); const c = plMake(it.t, it.x + (it.r % 180 ? 0 : 0), it.y + d.h + 4, it.r, it.len); PL.items.push(c); PL.sel = c.id; commit(); refocus(); }
    if (a === 'del') { plSnap(); PL.items = PL.items.filter(i => i !== it); PL.sel = null; commit(); svg.focus({ preventScroll: true }); }
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]'); if (b) { act(b.dataset.pl); return; }
    const L = e.target.closest('[data-len]'); if (L) { const it = sel(); if (!it) return; plSnap(); it.len = clampN(it.len + +L.dataset.len, 12, 200); commit(); return; }
    const ex = e.target.closest('[data-ex]');
    if (ex) { const E = PLAN_EXAMPLES.find(x => x.id === ex.dataset.ex); plSnap(); PL.items = E.items.map(([t, x, y, r, len]) => plMake(t, x, y, r, len)); PL.sel = null; fit(); commit(); toast(`${E.name} loaded — an illustrative example`); return; }
    const m = e.target.closest('[data-mode]'); if (m && !m.disabled) setMode(m.dataset.mode);
  });
  root.addEventListener('change', e => { if (e.target.id === 'pl-len') { const it = sel(); if (!it) return; plSnap(); it.len = clampN(Math.round(+e.target.value / 2) * 2 || it.len, 12, 200); commit(); } });

  // palette: tap to add, or drag onto the site
  $$('[data-add]', root).forEach(card => {
    card.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const t = card.dataset.add, sx = e.clientX, sy = e.clientY; let it = null;
      const move = ev => {
        if (!it && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        const r = stage.getBoundingClientRect(), inside = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
        if (!it) { plSnap(); it = plMake(t, 0, 0); it.ghost = true; PL.items.push(it); PL.sel = it.id; card.classList.add('dragging'); if (PL.mode !== 'plan') setMode('plan'); }
        const p = toW(ev.clientX, ev.clientY), q = snap(it, p.x, p.y); it.x = q.x; it.y = q.y; it.out = !inside; render();
        const g = svg.querySelector(`.pi[data-id="${it.id}"]`); if (g) g.style.opacity = inside ? '' : '0.25';
      };
      const end = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); card.classList.remove('dragging'); guides = [];
        if (!it) return;
        delete it.ghost;
        if (it.out) { PL.items = PL.items.filter(i => i !== it); PL.undo.pop(); PL.sel = null; render(); side(); } else { delete it.out; commit(); }
        card._dragged = true; setTimeout(() => card._dragged = false, 0);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
    });
    card.addEventListener('click', () => { if (card._dragged) return; add(card.dataset.add); refocus(); });
  });

  // 3D view of the plan, in the shared viewer
  const v3 = $('#pl-3d');
  const forViewer = () => PL.items.map(it => { const T = PT(it.t), d = plDims(it); return { t: it.t, x: it.x, y: it.y, r: it.r, a: d.a, b: d.b }; });
  let synced = '';
  const sync3d = () => { const v = getViewer(); if (!v) return; const key = JSON.stringify(forViewer()); if (key === synced) return; synced = key; v.setCamp(forViewer()); };
  const setMode = mode => {
    if (mode === '3d' && !PL.items.length) return;
    PL.mode = mode; root.classList.toggle('is-3d', mode === '3d');
    $$('[data-mode]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    v3.hidden = mode !== '3d'; svg.style.visibility = mode === '3d' ? 'hidden' : '';
    if (mode === '3d') {
      const v = getViewer();
      if (!v || !v.mount(v3, { dist: 90 })) { toast('3D needs WebGL, which this browser has turned off'); setMode('plan'); return; }
      if (v.state().model !== 'mecc') v.setModel('mecc');
      synced = ''; sync3d(); if (!root._wx) { bindViewerControls($('#pl-bar'), v); root._wx = true; } else viewerUI && viewerUI(v.state());
    } else { const v = getViewer(); if (v) v.visible = false; render(); }
  };

  const ro = new ResizeObserver(() => render()); ro.observe(stage); cleanups.push(() => ro.disconnect());
  fit(); update(false);
}
function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }
function plSummary() {
  const t = plTotals(), B = t.bounds;
  const parts = Object.entries(t.count).map(([k, n]) => `${n} × ${PT(k).name}`);
  return `Camp plan from the online camp planner:\n- ${parts.join('\n- ')}\n- Floor space ${t.approx ? '≈' : ''}${plNum(t.area)} ft² (${t.approx ? '≈' : ''}${plNum(t.area * 0.092903)} m²)\n- Site footprint ${plFt(B.w)} × ${plFt(B.h)}${t.iso ? `\n- Ships as ${t.iso} × ISO container${t.iso > 1 ? 's' : ''}` : ''}${t.pallet ? ` and ${t.pallet} × 463L pallet${t.pallet > 1 ? 's' : ''}` : ''}\n\nMission, site and timeline: `;
}
function plDownload() {
  if (!PL.items.length) return toast('Add a shelter first');
  const t = plTotals(), B = t.bounds, m = 10, W = B.w + m * 2, Hh = B.h + m * 2, top = 16;
  const items = PL.items.map(it => plItemSVG(it, { light: true, sw: 0.18 })).join('');
  const lines = [`Floor space: ${t.approx ? '≈' : ''}${plNum(t.area)} ft² (${t.approx ? '≈' : ''}${plNum(t.area * 0.092903)} m²)`, `Site footprint: ${plFt(B.w)} × ${plFt(B.h)}`,
    Object.entries(t.count).map(([k, n]) => `${n} × ${PT(k).name}`).join(' · ')];
  if (t.iso || t.pallet) lines.push(`Ships as: ${[t.iso ? `${t.iso} × ISO container${t.iso > 1 ? 's' : ''}` : '', t.pallet ? `${t.pallet} × 463L pallet${t.pallet > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}`);
  const bar = [10, 20, 50].find(f => f >= B.w / 5) || 50;
  const svgTxt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${B.x0 - m} ${B.y0 - m - top} ${W} ${Hh + top + 4 + lines.length * 2.6}" width="${Math.round(W * 12)}" height="${Math.round((Hh + top + 4 + lines.length * 2.6) * 12)}">
<rect x="${B.x0 - m}" y="${B.y0 - m - top}" width="${W}" height="${Hh + top + 4 + lines.length * 2.6}" fill="#fff"/>
<defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#e4ebf2" stroke-width="0.1"/></pattern></defs>
<rect x="${B.x0 - m}" y="${B.y0 - m}" width="${W}" height="${Hh}" fill="url(#g)"/>
<text x="${B.x0 - m + 2}" y="${B.y0 - m - top + 6}" font-family="Barlow Semi Condensed, Arial Narrow, sans-serif" font-weight="600" font-size="4.2" fill="#0D4275">Weatherhaven camp plan</text>
<text x="${B.x0 - m + 2}" y="${B.y0 - m - top + 10.5}" font-family="Barlow, Arial, sans-serif" font-size="1.9" fill="#5f6b78">Planning aid made with the camp planner. Footprints from weatherhaven.com; MECC/EHMECC deployed width approximate. Not an engineering drawing.</text>
${items}
<g transform="translate(${B.x0} ${B.y1 + m - 3})"><rect width="${bar}" height="0.6" fill="#0D4275"/><text y="-1" font-family="Barlow, Arial, sans-serif" font-size="1.8" fill="#0D4275">${bar} ft</text></g>
${lines.map((l, i) => `<text x="${B.x0 - m + 2}" y="${B.y1 + m + 4 + i * 2.6}" font-family="Barlow, Arial, sans-serif" font-size="1.9" fill="#1d2a36">${esc(l)}</text>`).join('')}
</svg>`;
  const url = URL.createObjectURL(new Blob([svgTxt], { type: 'image/svg+xml' }));
  const a = document.createElement('a'); a.href = url; a.download = 'weatherhaven-camp-plan.svg'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Plan downloaded');
}

/* ---------------- router ---------------- */
let cleanups = [];
function teardown() {
  cleanups.forEach(f => { try { f(); } catch (_) { } }); cleanups = [];
  if (globe) { globe.destroy(); globe = null; }
  [viewer, storyViewer].forEach(vw => { if (vw) { vw.visible = false; if (vw.container && !document.body.contains(vw.container)) vw.container = null; } });
  viewerUI = null;
}
function setActiveNav(key) {
  $$('.nav>li').forEach(li => { const n = NAV.find(x => x.key === li.dataset.key); const on = n && n.routes.includes(key); const t = $('.nav-t', li); on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'); });
}
let lastPage = null;
function route() {
  const raw = location.pathname.replace(/^\/+|\/+$/g, '');
  const [path] = raw.split('?'); const qs = location.search.replace(/^\?/, ''); const q = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean);
  const page = seg[0] || '';
  let section = (page === 'products' && P(seg[1])) ? (seg[2] || null) : (seg[1] || null);
  $$('.overlay.on').forEach(o => { o.classList.remove('on'); o.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; });
  if ($('#hdr').classList.contains('open')) setDrawer(false);
  const pageKey = page + (page === 'products' && P(seg[1]) ? '/' + seg[1] : '') + (qs ? '?' + qs : '');
  // same page, only a section change → just scroll
  if (lastPage === pageKey && section) { scrollToSection(section, page); return; }
  if (page === 'products' && seg[1] === 'compare') { if (lastPage && lastPage.startsWith('products')) { openCompare(); history.replaceState(null, '', '/products/'); return; } section = 'all'; setTimeout(openCompare, 400); }
  const render = () => renderPage(page, seg, q, qs, section, pageKey);
  // cross-page transition: the old page slides away while the new one rises in (header stays put)
  if (document.startViewTransition && lastPage !== null && !reduceMotion) {
    document.documentElement.classList.add('vt');
    const t = document.startViewTransition(render);
    t.ready.catch(() => { }); t.updateCallbackDone.catch(() => { });
    t.finished.catch(() => { }).then(() => document.documentElement.classList.remove('vt'));
  } else render();
}
export function pageFor(page, seg, q, section = null) {
  let html, init, title;
  switch (page) {
    case '': html = pageHome(); init = initHome; title = 'Weatherhaven — Rapidly deploying shelter systems anywhere in the world'; break;
    case 'military': case 'medical': case 'commercial': html = pageSector(page); init = initSubnav; title = `${SECTORS[page].name} shelter solutions — Weatherhaven`; break;
    case 'products': {
      const p = P(seg[1]);
      if (p) { html = pageProduct(p); init = () => { initProduct(p); if (!p.viewer) initSubnav(); }; title = `${p.name} — ${p.full} — Weatherhaven`; }
      else { html = pageProducts(q); init = () => { initProducts(q); initSubnav(); }; title = 'Products — Weatherhaven'; }
      break; }
    case 'services': html = pageServices(); init = () => { initLifecycle(SERVICES.some(s => s.id === section) ? section : null); initSubnav(); }; title = 'Services & support — Weatherhaven'; if (SERVICES.some(s => s.id === section)) section = 'lifecycle-sec'; if (section === 'lifecycle') section = 'lifecycle-sec'; break;
    case 'innovation': html = pageInnovation(); init = () => { initInnovation(); initSubnav(); }; title = 'Innovation — Weatherhaven'; break;
    case 'company': html = pageCompany(); init = () => { initCompany(); initSubnav(); }; title = 'Company — Weatherhaven'; break;
    case 'news': html = pageNews(); title = 'News — Weatherhaven'; break;
    case 'contact': html = pageContact(q); init = initContact; title = 'Contact — Weatherhaven'; break;
    case 'record': html = pageRecord(); init = initGlobe; title = 'Where we’ve worked — Weatherhaven'; break;
    case 'plan': html = pagePlan(); init = initPlan; title = 'Camp planner — Weatherhaven'; break;
    default: html = `<section class="phero"><div class="wrap" style="padding:120px 0 96px"><h1 class="h-xl">That page has moved.</h1><p class="lead" style="margin:18px 0 28px">Search the site or head back to the start.</p><div class="hero-cta"><button class="btn btn-primary" data-action="search">Search the site</button><a class="btn btn-ghost" href="/">Go to the home page</a></div></div></section>`; title = 'Page not found — Weatherhaven';
  }
  return { html, init, title, section };
}
function renderPage(page, seg, q, qs, section, pageKey) {
  const main = $('#main');
  teardown();
  const R = pageFor(page, seg, q, section); let { html, init, title } = R; section = R.section;
  if (main.dataset.ssr === '1') { delete main.dataset.ssr; } else main.innerHTML = html;
  const needs3d = (page === '' && (!isPhone() || sessionStorage.getItem('wh-3d-mobile') === '1')) || page === 'plan' || page === 'record' || (page === 'products' && P(seg[1]) && P(seg[1]).viewer);
  const init0 = init, run = init0 ? () => { if (lastPage === pageKey) init0(); } : () => { };
  if (needs3d && !win.ShelterViewer && win.__whLoadEngine) { init = null; win.__whLoadEngine().then(run, run); }
  main.classList.remove('page-enter'); void main.offsetWidth; if (!reduceMotion) main.classList.add('page-enter');
  document.title = title;
  setActiveNav(page);
  lastPage = pageKey;
  init && init();
  syncCompare();
  if (section) requestAnimationFrame(() => setTimeout(() => scrollToSection(section, page, true), 60));
  else { window.scrollTo({ top: 0, behavior: 'instant' }); main.focus({ preventScroll: true }); }
  dispatchEvent(new Event('scroll'));
}
function scrollToSection(id, page, instant) {
  const map = { support: 'support', lifecycle: 'lifecycle-sec' };
  if (page === 'services' && SERVICES.some(s => s.id === id)) map[id] = 'lifecycle-sec';
  const el = document.getElementById(map[id] || id);
  if (!el) return window.scrollTo(0, 0);
  if (page === 'services' && SERVICES.some(s => s.id === id)) initLifecycle(id);
  const y = el.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 72) - ($('.subnav') ? 56 : 0) - 8;
  if (instant || reduceMotion) window.scrollTo({ top: y, behavior: 'instant' }); else tweenScroll(y);
}
let scrollTween = 0;
function tweenScroll(to) {
  const from = window.scrollY, d = to - from, id = ++scrollTween, dur = Math.min(900, 380 + Math.abs(d) * 0.18), t0 = performance.now();
  const stop = () => { scrollTween++; };
  addEventListener('wheel', stop, { once: true, passive: true }); addEventListener('touchstart', stop, { once: true, passive: true });
  const step = now => {
    if (id !== scrollTween) return;
    const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    window.scrollTo({ top: from + d * e, behavior: 'instant' });
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- global events ---------------- */
function initGlobal() {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (a) {
      e.preventDefault();
      const act = a.dataset.action;
      if (act === 'finder') openFinder();
      if (act === 'search') openPalette();
      if (act === 'compare') openCompare();
      if (act === 'clear-compare') { compare.clear(); syncCompare(); }
      return;
    }
    const c = e.target.closest('[data-cmp]');
    if (c) { e.preventDefault(); toggleCompare(c.dataset.cmp); }
    const link = e.target.closest('a[href]');
    if (link && isInternal(link)) { e.preventDefault(); navigate(link.getAttribute('href')); }
  });
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); $('#pal-ov').classList.contains('on') ? closeOverlay($('#pal-ov')) : openPalette(); }
    else if (k === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !$('.overlay.on')) { e.preventDefault(); openPalette(); }
  });
  addEventListener('popstate', () => route());
}


/* ---------------- navigation ---------------- */
function isInternal(a) {
  const href = a.getAttribute('href') || '';
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (a.target === '_blank' || a.hasAttribute('download') || /^\/(assets|ar|api)\//.test(href)) return false;
  return true;
}
export function navigate(href, replace) {
  const url = new URL(href, location.origin);
  const same = url.pathname === location.pathname && url.search === location.search;
  if (replace) history.replaceState(null, '', url); else if (!same) history.pushState(null, '', url);
  route();
}
export function ssrRender(pathname, search = '') {
  const raw = pathname.replace(/^\/+|\/+$/g, '');
  const seg = raw.split('/').filter(Boolean), page = seg[0] || '';
  const q = new URLSearchParams(search.replace(/^\?/, ''));
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
