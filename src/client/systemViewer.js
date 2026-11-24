/* Product-page 3D viewer for every system with a model in src/lib/system-models.ts (all but the TRECC,
   which keeps its own viewer). The stage itself (src/lib/three/systemStage.ts) is shared with the US site;
   this file is the controls around it: packed/deployed, show inside, step inside, finish, AR, full screen.
   three.js downloads only when the viewer comes near the screen, and only on a GPU: software WebGL keeps
   the poster, with the deploy video and the interior render instead. */
import { SYSTEM_MODELS, MODEL_NAMES } from '../lib/system-models';
import { SITE_FOR } from '../lib/site-for';

// Site (the shelter in the climate it's sold for) or studio (the clean grid); remembered per visitor.
const SITE_LABEL = { desert: 'Desert', arctic: 'Arctic', temperate: 'Forest', tropical: 'Tropical' };
const viewPref = () => { try { return localStorage.getItem('wh-sv-view') || 'site'; } catch (_) { return 'site'; } };

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const FINISHES = [['green', 'Green', '#4b5a37'], ['tan', 'Desert tan', '#a38c62'], ['arctic', 'Arctic white', '#e4e7e6']];
const KEYS = { ArrowUp: 'forward', w: 'forward', ArrowDown: 'back', s: 'back', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };

export function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const software = /swiftshader|llvmpipe|softpipe|software|basic render driver/.test(name);
    return !software || !!window.__WH_ALLOW_SOFTWARE__;
  } catch (_) { return false; }
}

export const modelName = id => MODEL_NAMES[id] || (SYSTEM_MODELS[id] && SYSTEM_MODELS[id].ar ? SYSTEM_MODELS[id].ar.title.replace(/^See the | at full size$/g, '').replace(/^See an? /, '') : id);

/** Markup for the viewer (rendered at build time). */
export function systemViewerHTML(ids, esc) {
  const m = SYSTEM_MODELS[ids[0]]; if (!m) return '';
  const fin = !!m.finishMaterials;
  return `<div class="sv" data-sv="${ids[0]}">
    ${ids.length > 1 ? `<div class="sv-models" role="group" aria-label="Model">${ids.map((id, i) => `<button data-svm="${id}" aria-pressed="${i === 0}">${esc(modelName(id))}</button>`).join('')}</div>` : ''}
    <div class="sv-stage">
      <img class="sv-poster" src="${m.poster}" alt="${esc(m.ar ? m.ar.alt : '')}" width="1600" height="900" loading="lazy" decoding="async">
      <canvas class="sv-canvas" tabindex="0" aria-label="3D model. Drag to turn it; when you step inside, drag to look round, click the floor to walk, or use the arrow keys."></canvas>
      <p class="sv-status" aria-live="polite"></p>
      <p class="sv-walkhint" hidden>Drag to look round · click the floor to walk · arrow keys to move</p>
      <button class="sv-out" data-sv-out hidden>Back outside</button>
    </div>
    <div class="sv-bar">
      <div class="sv-seg sv-3d" role="group" aria-label="Packed or deployed"><button data-sv-dep="0" aria-pressed="false">Packed</button><button data-sv-dep="1" aria-pressed="true">Deployed</button></div>
      <button class="sv-btn sv-3d" data-sv-inside aria-pressed="false">Show inside</button>
      <button class="sv-btn sv-3d" data-sv-walk>Step inside</button>
      <div class="sv-seg sv-3d sv-view" role="group" aria-label="Background"><button data-sv-view="site" aria-pressed="true" data-sv-sitelabel>${esc(SITE_LABEL[SITE_FOR[ids[0]] || 'temperate'])}</button><button data-sv-view="studio" aria-pressed="false">Studio</button></div>
      <span class="sv-fin sv-3d" role="group" aria-label="Finish" ${fin ? '' : 'hidden'}>${FINISHES.map(([k, l, c], i) => `<button data-sv-fin="${k}" aria-pressed="${i === 0}" title="${l}" aria-label="${l}"><i style="background:${c}"></i></button>`).join('')}</span>
      <button class="sv-btn sv-2d" data-sv-video>Watch it deploy</button>
      <button class="sv-btn sv-2d" data-sv-still aria-pressed="false">Inside</button>
      <span class="sv-sp"></span>
      <a class="sv-btn sv-ar" data-sv-ar href="/ar/${ids[0]}/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7zM12 12 3 7M12 12l9-5M12 12v10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>See it full size</a>
      <button class="sv-btn sv-icon" data-sv-fs aria-label="Full screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
    </div>
    <p class="sv-note"><span data-sv-src>${esc(m.source)}</span>. Not engineering CAD. Inside: an example <span data-sv-label>${esc(m.inside ? m.inside.label.toLowerCase() : '')}</span> fit-out.</p>
  </div>`;
}

/** Wires up one viewer. Returns a cleanup function. */
export function mountSystemViewer(root, { reduced = false } = {}) {
  if (!root) return () => { };
  const $ = s => root.querySelector(s), $$ = s => Array.from(root.querySelectorAll(s));
  const stageEl = $('.sv-stage'), poster = $('.sv-poster'), status = $('.sv-status'), hint = $('.sv-walkhint'), outBtn = $('[data-sv-out]');
  let canvas = $('.sv-canvas');
  let id = root.dataset.sv, stage = null, raf = 0, visible = false, lastMove = 0, tween = null, pending = null;
  let dep = 1, inside = false, walking = false, cancelled = false, token = 0, started = false, firstPlay = true;
  const say = t => { status.textContent = t || ''; status.hidden = !t; };

  const frame = () => {
    raf = 0; if (!stage) return;
    if (tween) {
      const t = Math.min(1, (performance.now() - tween.start) / tween.ms);
      dep = tween.from + (tween.to - tween.from) * ease(t); stage.setDeploy(dep);
      if (t >= 1) {
        tween = null;
        if (pending === 'inside' && dep === 1) { pending = null; stage.setInside(true, !reduced).then(kick); }
        if (pending === 'walk' && dep === 1) { pending = null; stage.setWalk(true, !reduced).then(ok => { if (!ok) cantWalk(); else walkUI(true); kick(); }); }
      }
    }
    if (pending === 'pack' && stage.insideProgress() === 0) { pending = null; tween = { from: dep, to: 0, start: performance.now(), ms: stage.deployMs }; }
    stage.render();
    const busy = !!tween || stage.isAnimating() || performance.now() - lastMove < 400;
    if (visible && busy && !raf) raf = requestAnimationFrame(frame);
  };
  const kick = () => { lastMove = performance.now(); if (!raf) raf = requestAnimationFrame(frame); };
  const tweenTo = to => {
    if (!stage) return;
    if (reduced) { dep = to; stage.setDeploy(to); tween = null; }
    else tween = { from: dep, to, start: performance.now(), ms: stage.deployMs * Math.max(0.35, Math.abs(to - dep)) };
    kick();
  };
  const setViewUI = v => { $$('[data-sv-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.svView === v))); const l = $('[data-sv-sitelabel]'); if (l) l.textContent = SITE_LABEL[SITE_FOR[id] || 'temperate']; };
  const setDepUI = on => $$('[data-sv-dep]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.svDep === '1') === on)));
  const setInsideUI = on => { inside = on; $('[data-sv-inside]').setAttribute('aria-pressed', String(on)); };
  const walkUI = on => { walking = on; root.classList.toggle('sv-walking', on); hint.hidden = !on; outBtn.hidden = !on; if (on) canvas.focus({ preventScroll: true }); };
  const cantWalk = () => { walkUI(false); stage && stage.setInside(true, !reduced).then(kick); };

  // iPhone Safari has no full screen for page elements: don't show a button that can't work
  if (!document.fullscreenEnabled || !root.requestFullscreen) { const fs = $('[data-sv-fs]'); fs && (fs.hidden = true); }
  const onScreen = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
  onScreen.observe(root);

  const fallback = () => {
    root.classList.add('sv-fallback'); root.classList.remove('sv-ready'); say('');
  };
  const load = async () => {
    const my = ++token;
    if (!canUseWebGL()) return fallback();
    say('Loading the 3D model…'); root.classList.remove('sv-ready');
    try {
      const { createSystemStage } = await import('../lib/three/systemStage');
      if (my !== token || cancelled) return;
      if (stage) { stage.dispose(); stage = null; const c = canvas.cloneNode(false); canvas.replaceWith(c); canvas = c; bindCanvas(); }
      const s = await createSystemStage(canvas, SYSTEM_MODELS[id], { maxDpr: 1.75, site: viewPref() === 'studio' ? null : (SITE_FOR[id] || 'temperate') });
      if (my !== token || cancelled) { s.dispose(); return; }
      stage = s; stage.enableControls(kick); setViewUI(viewPref());
      tween = null; pending = null; setInsideUI(false); walkUI(false);
      $$('.sv-3d[data-sv-dep], [data-sv-dep]').forEach(b => b.disabled = !stage.canStow);
      $('[data-sv-inside]').hidden = !stage.hasInside; $('[data-sv-walk]').hidden = !stage.canWalk;
      root.classList.add('sv-ready'); say('');
      if (stage.canStow && !reduced && firstPlay) { firstPlay = false; dep = 0; stage.setDeploy(0); setDepUI(true); setTimeout(() => { if (stage === s) tweenTo(1); }, 450); }
      else { dep = 1; stage.setDeploy(1); setDepUI(true); }
      kick();
    } catch (err) { if (my === token) { console.warn('3D viewer', err); fallback(); } }
  };
  // start when the viewer comes within half a screen
  const near = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; near.disconnect(); load(); } }, { rootMargin: '50% 0px' });
  near.observe(root);

  // ---- controls ----
  const deployTo = next => {
    setDepUI(next); if (!stage) return;
    const to = next ? 1 : 0;
    if (!next && inside) { setInsideUI(false); if (walking) { walkUI(false); stage.setWalk(false, false); } stage.setInside(false, !reduced).then(kick); if (!reduced) { pending = 'pack'; kick(); return; } }
    if (!next && pending === 'inside') { pending = null; setInsideUI(false); }
    tweenTo(to);
  };
  const toggleInside = async () => {
    if (!stage) return;
    const next = !inside; setInsideUI(next);
    if (!next) { if (pending === 'inside') pending = null; if (walking) { walkUI(false); await stage.setWalk(false, !reduced); } await stage.setInside(false, !reduced); kick(); return; }
    if (dep < 1 || pending === 'pack') { pending = null; setDepUI(true); tweenTo(1); }
    say('Loading the interior…');
    try { await stage.preloadInside(); } catch (_) { setInsideUI(false); say(''); return; }
    say(''); if (!inside) return;
    if (tween) pending = 'inside'; else await stage.setInside(true, !reduced);
    kick();
  };
  const stepInside = async () => {
    if (!stage || walking) return;
    setInsideUI(true);
    if (dep < 1 || pending === 'pack') { pending = null; setDepUI(true); tweenTo(1); }
    say('Loading the interior…');
    try { await stage.preloadInside(); } catch (_) { setInsideUI(false); say(''); return; }
    say('');
    if (tween) { pending = 'walk'; kick(); return; }
    if (!(await stage.setWalk(true, !reduced))) { cantWalk(); return; }
    walkUI(true); kick();
  };
  const stepOutside = async () => {
    if (!stage) return;
    if (pending === 'walk') { pending = 'inside'; walkUI(false); kick(); return; }
    walkUI(false); await stage.setWalk(false, !reduced); kick();
  };
  function bindCanvas() {
    canvas.addEventListener('keydown', e => { const k = KEYS[e.key]; if (!walking || !stage || !k) { if (e.key === 'Escape' && walking) stepOutside(); return; } e.preventDefault(); stage.walkKey(k); kick(); });
  }
  bindCanvas();
  const onClick = e => {
    const b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
    if (b.dataset.svDep != null) deployTo(b.dataset.svDep === '1');
    else if (b.hasAttribute('data-sv-inside')) toggleInside();
    else if (b.hasAttribute('data-sv-walk')) stepInside();
    else if (b.hasAttribute('data-sv-out')) stepOutside();
    else if (b.dataset.svView) { const v = b.dataset.svView; try { localStorage.setItem('wh-sv-view', v); } catch (_) { } setViewUI(v); stage && (stage.setSite(v === 'studio' ? null : (SITE_FOR[id] || 'temperate')), kick()); }
    else if (b.dataset.svFin) { $$('[data-sv-fin]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); stage && (stage.setFinish(b.dataset.svFin, !reduced), kick()); }
    else if (b.hasAttribute('data-sv-fs')) { const fs = document.fullscreenElement; fs ? document.exitFullscreen() : (root.requestFullscreen ? root.requestFullscreen().catch(() => { }) : null); }
    else if (b.dataset.svm) switchModel(b.dataset.svm);
    else if (b.hasAttribute('data-sv-video')) playVideo();
    else if (b.hasAttribute('data-sv-still')) toggleStill(b);
  };
  root.addEventListener('click', onClick);
  const onFs = () => { root.classList.toggle('sv-fs', document.fullscreenElement === root); setTimeout(() => { stage && stage.resize(); kick(); }, 60); };
  document.addEventListener('fullscreenchange', onFs);
  const onResize = () => { stage && stage.resize(); kick(); };
  addEventListener('resize', onResize);

  // ---- fallback: video and interior render ----
  const playVideo = () => {
    const m = SYSTEM_MODELS[id]; if (!m.deployVideo) return;
    let v = stageEl.querySelector('video'); if (v) { v.currentTime = 0; v.play(); return; }
    v = document.createElement('video'); v.className = 'sv-video'; v.src = m.deployVideo; v.muted = true; v.playsInline = true; v.controls = true; v.autoplay = true; v.poster = m.poster;
    v.setAttribute('aria-label', `Deploy video of the ${modelName(id)}`); stageEl.appendChild(v);
  };
  const toggleStill = b => {
    const m = SYSTEM_MODELS[id], on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on)); stageEl.querySelector('video')?.remove();
    poster.src = on && m.interiorStill ? m.interiorStill : m.poster;
  };

  // ---- the Polar page switches between three models ----
  const switchModel = next => {
    if (next === id) return;
    id = next; root.dataset.sv = id; const m = SYSTEM_MODELS[id];
    $$('[data-svm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.svm === id)));
    poster.src = m.poster; poster.alt = m.ar ? m.ar.alt : ''; stageEl.querySelector('video')?.remove();
    $('[data-sv-ar]').href = `/ar/${id}/`; $('[data-sv-src]').textContent = m.source; $('[data-sv-label]').textContent = m.inside ? m.inside.label.toLowerCase() : '';
    $('.sv-fin').hidden = !m.finishMaterials; $$('[data-sv-fin]').forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0)));
    const st = $('[data-sv-still]'); st && st.setAttribute('aria-pressed', 'false');
    firstPlay = true;
    if (!root.classList.contains('sv-fallback')) load();
  };

  return () => {
    cancelled = true; token++; onScreen.disconnect(); near.disconnect();
    removeEventListener('resize', onResize); document.removeEventListener('fullscreenchange', onFs); root.removeEventListener('click', onClick);
    if (raf) cancelAnimationFrame(raf); stage && stage.dispose(); stage = null;
  };
}
