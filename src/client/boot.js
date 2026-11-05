/* Client entry: 3D engine scripts load on demand; the app boots on the prerendered DOM. */
import { boot as appBoot, ASSETS } from './app.js';
import LAND from '../generated/land.b64?raw';
window.WH_MODELS = ASSETS.models;
window.LAND_B64 = LAND.trim();
let enginePromise = null;
// The TRECC model and its decoder download in parallel with the engine, so the model is ready when the scene is.
export function prefetchTrecc() {
  if (window.__whPre) return;
  const M = ASSETS.models, get = (u, t, low) => fetch(u, { credentials: 'same-origin', priority: low ? 'low' : 'auto' }).then(r => { if (!r.ok) throw new Error(r.status); return t === 'text' ? r.text() : r.arrayBuffer(); });
  const pre = {};
  pre[M.stowed] = get(M.stowed, 0, 1); pre[M.open] = get(M.open, 0, 1);
  pre['draco_wasm_wrapper.js'] = get(M.dracoPath + 'draco_wasm_wrapper.js', 'text');
  pre['draco_decoder.wasm'] = get(M.dracoPath + 'draco_decoder.wasm');
  Object.values(pre).forEach(p => p.catch(() => { }));
  window.__whPre = pre;
}
const treccPage = () => { const p = location.pathname; return p === '/' || p.startsWith('/products/trecc'); };
export function loadEngine() {
  if (enginePromise) return enginePromise;
  if (treccPage()) prefetchTrecc();
  const one = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = res; s.onerror = () => rej(new Error('failed ' + src)); document.head.appendChild(s); });
  enginePromise = one(ASSETS.js + 'three.min.js').then(() => Promise.all([one(ASSETS.js + 'GLTFLoader.js'), one(ASSETS.js + 'DRACOLoader.js')])).then(() => one(ASSETS.js + 'viewer3d.js')).then(() => Promise.all([one(ASSETS.js + 'fitouts.js'), one(ASSETS.js + 'globe.js')]));
  return enginePromise;
}
window.__whLoadEngine = loadEngine;
export function boot() { appBoot(); }
// consent banner (only rendered when PUBLIC_CONSENT=1)
const consent = document.getElementById('consent');
if (consent) {
  try { if (localStorage.getItem('wh-consent')) consent.remove(); } catch (_) { }
  consent.addEventListener('click', e => { const b = e.target.closest('[data-consent]'); if (!b) return; try { localStorage.setItem('wh-consent', b.dataset.consent); } catch (_) { } consent.remove(); });
}
