/* Client entry: 3D engine scripts load on demand; the app boots on the prerendered DOM. */
import { boot as appBoot, ASSETS } from './app.js';
import LAND from '../generated/land.b64?raw';
window.WH_MODELS = ASSETS.models;
window.LAND_B64 = LAND.trim();
let enginePromise = null;
export function loadEngine() {
  if (enginePromise) return enginePromise;
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
