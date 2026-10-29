/* Weatherhaven 3D — MECC / EHMECC expandable container, environments, interior fit-outs and the deploy story.
   Units: 1 = 1 foot. Geometry approximates the published MECC (20' ISO core, side walls fold down into floor,
   insulated fabric expansion, 3x floor area; EHMECC roof rises +4.5'). Details are based on Weatherhaven photos. */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Performance guard: all viewers share a quality tier (2 full, 1 lighter shadows + lower pixel ratio, 0 no shadows).
     Each viewer samples its own frame times once warmed up; a slow run steps every viewer down. Never steps back up. */
  const Q = { tier: 2, viewers: [], lock: null };
  try { const l = sessionStorage.getItem('wh-q-lock'); if (l != null) Q.lock = Q.tier = +l; else { const t = sessionStorage.getItem('wh-q'); if (t != null) Q.tier = Math.min(2, Math.max(0, +t)); } } catch (_) { }
  function setTier(t) {
    if (Q.lock != null || t >= Q.tier) return;
    Q.tier = t; try { sessionStorage.setItem('wh-q', String(t)); } catch (_) { }
    Q.viewers.forEach(v => v.applyTier());
  }

  /* ---------- TRECC: Weatherhaven's own CAD models (open + stowed), simplified for the web ----------
     The two GLBs are loaded once per page and shared by every viewer. The deploy is illustrative: the
     stowed unit dissolves into the open model collapsed to the same box, whose roof then rises
     (5 → 8 ft, published) and whose sides spread out (3× floor, published) — a vertex-shader deformation. */
  // the three factory finishes in the CAD files; by default pick the one that contrasts with the ground
  const TRECC_PAINT = { white: [0xffffff, 0x979797], tan: [0xb4a980, 0xb5a981], green: [0x70805e, 0x979797] };
  const TRECC_AUTO = { arctic: 'green', desert: 'green', temperate: 'tan', tropical: 'tan', dusk: 'green' };
  const TR = { XW: 1.06, YS: 1.40, DH: 0.954, F: 3.28084, zc: 0.056, wS: 1.084, wO: 2.26 };
  let treccAssets = null;
  function b64buf(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function loadTrecc() {
    if (treccAssets) return treccAssets;
    const M = window.WH_MODELS;
    if (!M || !THREE.GLTFLoader || !THREE.DRACOLoader || typeof WebAssembly !== 'object') return (treccAssets = Promise.reject(new Error('3D models unavailable')));
    const draco = new THREE.DRACOLoader();
    draco.setDecoderConfig({ type: 'wasm' });
    if (M.dracoPath) draco.setDecoderPath(M.dracoPath);
    else { const lib = { 'draco_wasm_wrapper.js': M.draco.wrapper, 'draco_decoder.wasm': b64buf(M.draco.wasm) }; draco._loadLibrary = url => Promise.resolve(lib[url]); }
    const gl = new THREE.GLTFLoader(); gl.setDRACOLoader(draco);
    const one = url => new Promise((res, rej) => gl.load(url, g => res(g.scene), undefined, rej));
    treccAssets = Promise.all([one(M.open), one(M.stowed)]).then(([open, stowed]) => { draco.dispose(); return { open, stowed }; });
    return treccAssets;
  }
  const TR_GLSL = `
    float trH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float trN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(trH(i), trH(i + vec3(1, 0, 0)), f.x), mix(trH(i + vec3(0, 1, 0)), trH(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(trH(i + vec3(0, 0, 1)), trH(i + vec3(1, 0, 1)), f.x), mix(trH(i + vec3(0, 1, 1)), trH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;
  // Canvas for the TRECC's fabric (the CAD has none): A = plain weave (tile 0.12 m), B = tension undulation,
  // creases and a stitched seam (tile 2.4 m). Both tile seamlessly; B also carries a light/dark tone.
  function trFabricTextures() {
    const SA = 128, ha = cvs(SA, SA), ax = ha.getContext('2d'), ia = ax.createImageData(SA, SA);
    for (let j = 0; j < SA; j++) for (let i = 0; i < SA; i++) {
      const warp = 0.5 + 0.5 * Math.cos(TAU * (i + 0.5) / 4), weft = 0.5 + 0.5 * Math.cos(TAU * (j + 0.5) / 4);
      const over = ((Math.floor(i / 4) + Math.floor(j / 4)) & 1) ? 1 : 0;
      const v = (over ? warp * 0.75 + weft * 0.25 : weft * 0.75 + warp * 0.25) * 200 + 28 + (hash(i * 3.1, j * 1.7) - 0.5) * 30;
      const k = (j * SA + i) * 4; ia.data[k] = ia.data[k + 1] = ia.data[k + 2] = clamp(v, 0, 255); ia.data[k + 3] = 255;
    }
    ax.putImageData(ia, 0, 0);
    const SB = 512, hb = cvs(SB, SB), bx = hb.getContext('2d'), ib = bx.createImageData(SB, SB), cb = cvs(SB, SB), cx = cb.getContext('2d'), ic = cx.createImageData(SB, SB);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // broad, uneven tension (low integer frequencies keep it tileable)
    const waves = []; for (let n = 0; n < 10; n++) waves.push([Math.round(1 + rnd() * 2) * (rnd() < 0.5 ? -1 : 1), Math.round(rnd() * 3), rnd() * TAU, 0.6 / (1 + n * 0.5)]);
    // a few soft folds that fade in and out along their length
    const folds = [[2, 1], [1, -2], [3, 1], [1, 3]].map(f => [f[0], f[1], rnd() * TAU, 0.22 + rnd() * 0.18, rnd() * TAU]);
    const H = new Float32Array(SB * SB); let mn = 1e9, mx = -1e9;
    for (let j = 0; j < SB; j++) for (let i = 0; i < SB; i++) {
      const u = i / SB, v = j / SB; let h = 0;
      waves.forEach(([fx, fy, ph, a]) => { h += a * Math.sin(TAU * (fx * u + fy * v) + ph); });
      folds.forEach(([fx, fy, ph, a, mp]) => { const r = 1 - Math.abs(Math.sin(Math.PI * (fx * u + fy * v) + ph)); const fade = Math.max(0, Math.sin(TAU * (fy * u - fx * v) + mp)); h -= a * Math.pow(r, 4) * fade * fade; });
      H[j * SB + i] = h; mn = Math.min(mn, h); mx = Math.max(mx, h);
    }
    for (let j = 0; j < SB; j++) for (let i = 0; i < SB; i++) {
      const n = (H[j * SB + i] - mn) / (mx - mn), k = (j * SB + i) * 4;
      // one double-stitched vertical seam per tile
      const du = Math.abs(i - SB / 2), seam = du < 2 ? 0.4 : ((du > 4 && du < 6) || (du > 7 && du < 9)) && j % 5 < 3 ? 0.44 : 0.5;
      ib.data[k] = ib.data[k + 1] = ib.data[k + 2] = clamp(n * 120 + 68 + (seam - 0.5) * 140, 0, 255); ib.data[k + 3] = 255;
      const tone = 150 + (n - 0.5) * 34 + (seam < 0.5 ? -14 : 0) + (hash(i * 0.37, j * 0.61) - 0.5) * 6;
      ic.data[k] = ic.data[k + 1] = ic.data[k + 2] = clamp(tone, 0, 255); ic.data[k + 3] = 255;
    }
    bx.putImageData(ib, 0, 0); cx.putImageData(ic, 0, 0);
    const lin = c => { const t = tex(c, 1, 1, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
    return { weave: lin(normalFromHeight(ha, 2.0)), wrinkle: lin(normalFromHeight(hb, 2.4)), tone: lin(cb) };
  }
  // deform: the open model's collapse (roof band squeezed, sides pulled in); sign: +1 appears, -1 dissolves;
  // fabric: canvas look (weave, tension creases, seams, tone) on the fabric, harder satin paint on the core
  function patchTrecc(m, U, deform, sign, depth, fabric) {
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U); sh.uniforms.uSign = { value: sign };
      sh.vertexShader = 'uniform float uRise, uSpread, uXW, uYS, uDH;\nvarying vec3 vTp;\n' + (fabric ? 'varying vec3 vAxX, vAxY, vAxZ;\n' : '') + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vTp = position;
        ${fabric ? 'vAxX = normalMatrix * vec3(1.0, 0.0, 0.0); vAxY = normalMatrix * vec3(0.0, 1.0, 0.0); vAxZ = normalMatrix * vec3(0.0, 0.0, 1.0);' : ''}
        ${deform ? `float tax = abs(transformed.x); if (tax > uXW) transformed.x = sign(transformed.x) * (uXW + (tax - uXW) * max(uSpread, 0.015));
        if (transformed.y > uYS) transformed.y = max(uYS, transformed.y - uDH * (1.0 - uRise));` : ''}`);
      // the swap sweeps down from the roof with a ragged, finely broken edge
      let fs = 'uniform float uDis, uSign; uniform vec3 uGlow; uniform vec4 uHole;\nvarying vec3 vTp;\n' + TR_GLSL + '\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (uHole.w > 0.0 && abs(vTp.z - uHole.z) < 0.32) { float hx = (vTp.x - uHole.x) / 0.56, hy = (vTp.y - uHole.y) / 0.92; if (hx * hx + hy * hy < uHole.w * uHole.w) discard; }
        float tdn = 0.8 * (1.0 - clamp(vTp.y / 1.5, 0.0, 1.0)) + 0.2 * trN(vTp * 18.0);
        float tdv = uSign * (uDis * 1.02 - tdn);
        if (tdv < 0.0) discard;`);
      if (!depth) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlow * (1.0 - smoothstep(0.0, 0.03, tdv)) * step(0.002, uDis) * step(uDis, 0.998) * 2.5;`);
      if (fabric && !depth) {
        fs = 'uniform sampler2D tWeave, tWrinkle, tTone;\nvarying vec3 vAxX, vAxY, vAxZ;\n' + fs
          .replace('#include <color_fragment>', `#include <color_fragment>
            // fabric everywhere except the hard lower core (door, frame, ECU surround)
            float trFab = 1.0 - step(abs(vTp.x), 1.12) * step(vTp.y, 1.46);
            vec3 trAx = normalize(vAxX), trAy = normalize(vAxY), trAz = normalize(vAxZ);
            vec3 trOn = normalize(vec3(dot(vNormal, trAx), dot(vNormal, trAy), dot(vNormal, trAz)));
            vec3 trW = pow(abs(trOn), vec3(4.0)); trW /= (trW.x + trW.y + trW.z);
            vec3 trB = vTp / 2.4;
            float trT = texture2D(tTone, trB.zy).r * trW.x + texture2D(tTone, trB.xz).r * trW.y + texture2D(tTone, trB.xy).r * trW.z;
            float trM = 0.95 + 0.1 * trN(vTp * 1.3);
            float trG = mix(0.84, 1.0, smoothstep(0.02, 0.55, vTp.y));
            diffuseColor.rgb *= mix(trM * trG * 0.97, (0.8 + 0.4 * trT) * trM * trG, trFab);`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = mix(0.5, 0.97, trFab);`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            if (trFab > 0.0) {
              vec3 trN0 = vec3(dot(normal, trAx), dot(normal, trAy), dot(normal, trAz));
              vec3 trAb = abs(trN0); float trMx = max(trAb.x, max(trAb.y, trAb.z));
              vec3 trSn = trAb.x == trMx ? vec3(sign(trN0.x), 0.0, 0.0) : trAb.y == trMx ? vec3(0.0, sign(trN0.y), 0.0) : vec3(0.0, 0.0, sign(trN0.z));
              trN0 = normalize(mix(trN0, trSn, smoothstep(0.75, 0.96, trMx) * 0.85));
              vec3 trAW = vTp / 0.12;
              vec3 nX = (texture2D(tWrinkle, trB.zy).xyz * 2.0 - 1.0) * vec3(0.9, 0.9, 1.0) + (texture2D(tWeave, trAW.zy).xyz * 2.0 - 1.0) * vec3(0.35, 0.35, 0.0);
              vec3 nY = (texture2D(tWrinkle, trB.xz).xyz * 2.0 - 1.0) * vec3(0.9, 0.9, 1.0) + (texture2D(tWeave, trAW.xz).xyz * 2.0 - 1.0) * vec3(0.35, 0.35, 0.0);
              vec3 nZ = (texture2D(tWrinkle, trB.xy).xyz * 2.0 - 1.0) * vec3(0.9, 0.9, 1.0) + (texture2D(tWeave, trAW.xy).xyz * 2.0 - 1.0) * vec3(0.35, 0.35, 0.0);
              nX = vec3(nX.xy + trN0.zy, abs(nX.z) * trN0.x);
              nY = vec3(nY.xy + trN0.xz, abs(nY.z) * trN0.y);
              nZ = vec3(nZ.xy + trN0.xy, abs(nZ.z) * trN0.z);
              vec3 trP = normalize(nX.zyx * trW.x + nY.xzy * trW.y + nZ.xyz * trW.z);
              normal = normalize(mix(normal, normalize(trP.x * trAx + trP.y * trAy + trP.z * trAz), trFab));
            }`);
      }
      sh.fragmentShader = fs;
    };
    m.customProgramCacheKey = () => 'trecc-' + (deform ? 'D' : 'S') + (depth ? 'd' : 'c') + (fabric ? 'f' : '');
  }


  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y, o) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
  const LIN = h => new THREE.Color(h).convertSRGBToLinear();
  const GRAVEL = new THREE.Color(), GRAVEL2 = new THREE.Color();

  /* ---------------- procedural textures ---------------- */
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, rx = 1, ry = 1, srgb = true) {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    if (srgb) t.encoding = THREE.sRGBEncoding; return t;
  }
  function normalFromHeight(hc, strength) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    const out = cvs(w, h), ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    const H = (x, y) => src[((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = -(H(x + 1, y) - H(x - 1, y)) * strength, ny = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
      d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return out;
  }
  // painted steel: mottling, grime toward the bottom, stiffener ribs and bolt lines
  function steelTextures() {
    const S = 512, c = cvs(S, S), x = c.getContext('2d'), hc = cvs(S, S), hx = hc.getContext('2d');
    x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, S, S);
    const id = x.getImageData(0, 0, S, S), d = id.data;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = (j * S + i) * 4, n = fbm(i / 60, j / 60, 4) * 18 + (hash(i, j) - 0.5) * 7, g = Math.pow(j / S, 5) * 46;
      const v = 214 + n - 9 - g; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255);
    }
    x.putImageData(id, 0, 0);
    for (let n = 0; n < 60; n++) { x.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`; x.lineWidth = 1; x.beginPath(); const px = Math.random() * S, py = Math.random() * S; x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 40, py + (Math.random() - 0.5) * 6); x.stroke(); }
    for (let n = 0; n < 30; n++) { x.fillStyle = `rgba(60,40,30,${Math.random() * 0.12})`; x.beginPath(); x.ellipse(Math.random() * S, S - Math.random() * 60, 2 + Math.random() * 10, 1 + Math.random() * 18, 0, 0, TAU); x.fill(); }
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, S, S);
    [S * 0.33, S * 0.66].forEach(yy => { const g = hx.createLinearGradient(0, yy - 7, 0, yy + 7); g.addColorStop(0, '#808080'); g.addColorStop(0.5, '#b0b0b0'); g.addColorStop(1, '#808080'); hx.fillStyle = g; hx.fillRect(0, yy - 7, S, 14); x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(0, yy + 6, S, 2); });
    for (let i = 10; i < S; i += 40) { [6, S - 6].forEach(yy => { hx.fillStyle = '#c8c8c8'; hx.beginPath(); hx.arc(i, yy, 3, 0, TAU); hx.fill(); x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.arc(i + 1, yy + 1, 2.5, 0, TAU); x.fill(); }); }
    return { map: tex(c), normal: tex(normalFromHeight(hc, 2.2), 1, 1, false) };
  }
  // tensioned fabric: weave, double-stitched seams, soft tension wrinkles, dirt at the hem
  function fabricTextures() {
    const S = 512, c = cvs(S, S), x = c.getContext('2d'), hc = cvs(S, S), hx = hc.getContext('2d');
    const id = x.createImageData(S, S), d = id.data, hd = hx.createImageData(S, S), h = hd.data;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = (j * S + i) * 4;
      const weave = ((i % 4 < 2) ^ (j % 4 < 2)) ? 1 : 0;
      const wr = Math.sin((i * 0.7 + j * 1.3) / 34 + fbm(i / 90, j / 90, 3) * 5) * 0.5 + 0.5;
      const dirt = Math.pow(j / S, 7) * 60 + fbm(i / 40, j / 22, 3) * 10 * Math.pow(j / S, 3);
      const v = 228 + weave * 4 + (hash(i, j) - 0.5) * 6 - wr * 8 - dirt;
      d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = 255;
      const hv = 128 + weave * 10 + wr * 26 + (hash(j, i) - 0.5) * 6;
      h[k] = h[k + 1] = h[k + 2] = clamp(hv, 0, 255); h[k + 3] = 255;
    }
    x.putImageData(id, 0, 0); hx.putImageData(hd, 0, 0);
    for (let s = 0; s < 4; s++) {
      const sx = s * 128 + 4;
      [0, 7].forEach(o => { x.fillStyle = 'rgba(0,0,0,0.13)'; x.fillRect(sx + o, 0, 2, S); hx.fillStyle = '#d0d0d0'; hx.fillRect(sx + o - 1, 0, 4, S); });
      for (let yy = 0; yy < S; yy += 6) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(sx + 3, yy, 2, 3); }
    }
    x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, S - 26, S, 3); hx.fillStyle = '#d8d8d8'; hx.fillRect(0, S - 28, S, 6);
    return { map: tex(c), normal: tex(normalFromHeight(hc, 1.6), 1, 1, false) };
  }
  function floorTexture(kind) {
    const S = 256, c = cvs(S, S), x = c.getContext('2d');
    if (kind === 'plate') {
      x.fillStyle = '#9aa0a6'; x.fillRect(0, 0, S, S);
      for (let j = 0; j < S; j += 16) for (let i = (j / 16 % 2) * 8; i < S; i += 16) { x.save(); x.translate(i + 4, j + 4); x.rotate(PI / 4); x.fillStyle = '#c3c8cd'; x.fillRect(-5, -1.3, 10, 2.6); x.fillStyle = '#6f757b'; x.fillRect(-5, 1.3, 10, 1); x.restore(); }
    } else if (kind === 'tile') {
      x.fillStyle = '#d9dee2'; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; x.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
      x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i <= S; i += 64) { x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
    } else if (kind === 'quarry') {
      x.fillStyle = '#4a3a33'; x.fillRect(0, 0, S, S);
      for (let j = 0; j < S; j += 32) for (let i = 0; i < S; i += 32) { const k = Math.random() * 14; x.fillStyle = `rgb(${104 + k},${66 + k * 0.6},${54 + k * 0.5})`; x.fillRect(i + 1.5, j + 1.5, 29, 29); }
    } else {
      x.fillStyle = '#5b6168'; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; x.fillRect(Math.random() * S, Math.random() * S, 1, 1); }
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S);
    }
    return tex(c, 1, 1);
  }
  // ground micro-relief: wind ripples + noise, tiled across the terrain
  function groundNormal(ripples) {
    const S = 256, hc = cvs(S, S), hx = hc.getContext('2d'), id = hx.createImageData(S, S), d = id.data;
    // tileable value noise (lattice wraps at the tile edge)
    const pn = (x, y, P) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const m = a => ((a % P) + P) % P, h = (a, b) => hash(m(a), m(b));
      return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
    };
    const tn = (i, j, f, o) => { let s = 0, a = 0.5, F = f; for (let k = 0; k < o; k++) { s += a * pn(i / S * F, j / S * F, F); F *= 2; a *= 0.5; } return s; };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = (j * S + i) * 4, u = i / S * TAU, v = j / S * TAU;
      const rip = Math.sin(u * 6 + Math.sin(v * 2) * 1.6 + Math.sin(u * 2 + v * 3) * 0.6) * 0.5 + 0.5;
      const n = tn(i, j, 8, 5), h = ripples ? 0.55 * rip * rip + 0.45 * n : n;
      d[k] = d[k + 1] = d[k + 2] = clamp(h * 255, 0, 255); d[k + 3] = 255;
    }
    hx.putImageData(id, 0, 0);
    return tex(normalFromHeight(hc, ripples ? 2.4 : 5), 160, 160, false);
  }
  // lit window: warm ceiling wash, silhouettes of racks and screens, bug-screen mesh, zip frame
  function windowTexture() {
    const W = 256, H = 168, c = cvs(W, H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff2d8'); g.addColorStop(0.45, '#f4c48a'); g.addColorStop(1, '#8a5a34');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = x.createRadialGradient(W * 0.5, -20, 10, W * 0.5, -20, W * 0.8); r.addColorStop(0, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(40,24,14,0.55)'; x.fillRect(18, 96, 70, 72); x.fillRect(150, 70, 26, 98); x.fillRect(196, 104, 60, 64);
    x.fillStyle = 'rgba(30,40,60,0.6)'; x.fillRect(24, 72, 54, 30); x.fillStyle = 'rgba(160,210,255,0.55)'; x.fillRect(27, 75, 48, 24);
    x.strokeStyle = 'rgba(0,0,0,0.13)'; x.lineWidth = 1;
    for (let i = 0; i < W; i += 4) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, H); x.stroke(); }
    for (let j = 0; j < H; j += 4) { x.beginPath(); x.moveTo(0, j + 0.5); x.lineTo(W, j + 0.5); x.stroke(); }
    x.strokeStyle = 'rgba(20,14,10,0.85)'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
    return tex(c);
  }
  function softRectTexture() {
    const S = 256, c = cvs(S, S), x = c.getContext('2d');
    x.fillStyle = '#000'; x.filter = 'blur(18px)'; x.fillRect(40, 40, S - 80, S - 80); x.filter = 'none';
    return tex(c, 1, 1, false);
  }
  function glowTexture() {
    const S = 128, c = cvs(S, S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S); return tex(c);
  }
  function stencilTexture(text) {
    const c = cvs(1024, 64), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.font = '600 40px "Barlow Semi Condensed", Arial Narrow, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText(text, 512, 34); return tex(c);
  }
  function treadTexture() {
    const c = cvs(256, 64), x = c.getContext('2d'); x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 256; i += 16) { x.fillStyle = '#cfcfcf'; x.beginPath(); x.moveTo(i, 8); x.lineTo(i + 10, 8); x.lineTo(i + 4, 32); x.lineTo(i - 6, 32); x.fill(); x.beginPath(); x.moveTo(i + 8, 56); x.lineTo(i + 18, 56); x.lineTo(i + 12, 32); x.lineTo(i + 2, 32); x.fill(); }
    return tex(c, 6, 1, false);
  }

  // a single merged, vertex-coloured tree (instanced across the hills)
  function treeGeometry(kind) {
    const parts = [];
    const add = (g, hex, jit = 0) => {
      g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, c = new THREE.Color(hex).convertSRGBToLinear(), arr = new Float32Array(p.count * 3);
      if (jit) for (let i = 0; i < p.count; i++) { const k = hash(Math.round(p.getX(i) * 50), Math.round(p.getZ(i) * 50) + Math.round(p.getY(i) * 50)) - 0.5; p.setXYZ(i, p.getX(i) * (1 + k * jit), p.getY(i), p.getZ(i) * (1 + k * jit)); }
      for (let i = 0; i < p.count; i++) { const sh = 0.82 + 0.3 * clamp(p.getY(i) / 12); arr[i * 3] = c.r * sh; arr[i * 3 + 1] = c.g * sh; arr[i * 3 + 2] = c.b * sh; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.deleteAttribute('uv'); parts.push(g);
    };
    if (kind === 'conifer') {
      add(new THREE.CylinderGeometry(0.22, 0.32, 2.6, 6).translate(0, 1.3, 0), 0x4a3828);
      [[2.6, 4.6, 3.2], [2.1, 4.0, 5.6], [1.55, 3.4, 7.8], [0.95, 2.6, 9.7]].forEach(([r, h, y], i) => add(new THREE.ConeGeometry(r, h, 9, 1).translate(0, y, 0), i % 2 ? 0x2f4a2c : 0x29412a, 0.22));
    } else {
      add(new THREE.CylinderGeometry(0.28, 0.42, 4.2, 6).translate(0, 2.1, 0), 0x51402d);
      [[0, 5.6, 0, 2.9], [1.4, 5.0, 0.6, 2.1], [-1.3, 5.2, -0.5, 2.2], [0.3, 6.6, -1.0, 1.9]].forEach(([x, y, z, r], i) => add(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), i % 2 ? 0x46682f : 0x3b5c2a, 0.28));
    }
    let n = 0; parts.forEach(g => n += g.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    parts.forEach(g => { g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  /* ---------------- environments ---------------- */
  const CLIMATES = {
    arctic: {
      label: 'Arctic', skyTop: 0x0b1a33, skyMid: 0x3a5480, skyBot: 0xf0b48c, fog: 0x7d8db2, fogNear: 260, fogFar: 1500,
      ground: 0xd3dfee, ground2: 0x7e90ab, steel: 0xa8392d, fabric: 0xe8e5dc, frame: 0x8f3027, gn: 0.35,
      sun: 0xffa774, sunI: 2.2, sunEl: 0.2, sunAz: 0.95, hemiSky: 0x6f8ccc, hemiGround: 0x2a3654, hemiI: 0.55, env: 0.55,
      exposure: 0.84, terrain: 'mountains', particles: 'snow', glow: 2.4, lamp: 1, tod: 0.55, storm: 0xb7c2d0
    },
    desert: {
      label: 'Desert', skyTop: 0x3f7fc4, skyMid: 0x8db4dc, skyBot: 0xf2dfc3, fog: 0xe8d4b6, fogNear: 220, fogFar: 1000,
      ground: 0xdcc39b, ground2: 0xc2a074, steel: 0xb09a75, fabric: 0xd8c49d, frame: 0x9a8562, gn: 0.28,
      sun: 0xfff2db, sunI: 3.1, sunEl: 0.85, sunAz: 0.75, hemiSky: 0xbfd8f2, hemiGround: 0xb08a5a, hemiI: 0.45, env: 0.85,
      exposure: 0.92, terrain: 'dunes', particles: 'dust', glow: 0.3, lamp: 0, tod: 0.18, storm: 0xb68c5a
    },
    temperate: {
      label: 'Temperate', skyTop: 0x5f88b8, skyMid: 0x9db6d0, skyBot: 0xe1e6df, fog: 0xc9d3cf, fogNear: 200, fogFar: 900,
      ground: 0x617049, ground2: 0x46532f, steel: 0x56603f, fabric: 0x67714c, frame: 0x4a5336,
      sun: 0xffe6b8, sunI: 2.5, sunEl: 0.5, sunAz: 0.85, hemiSky: 0xcfdcea, hemiGround: 0x4a5536, hemiI: 0.5, env: 0.8,
      exposure: 1.0, terrain: 'hills', particles: 'none', glow: 0.6, lamp: 0, trees: 'conifer', tod: 0.25, storm: 0x8d979e
    },
    tropical: {
      label: 'Tropical', skyTop: 0x84959d, skyMid: 0xadb9b8, skyBot: 0xd7ddd3, fog: 0xbcc6bf, fogNear: 140, fogFar: 650,
      ground: 0x56703f, ground2: 0x3c5430, steel: 0xd5d7d2, fabric: 0xe6e3d8, frame: 0xb9bcb6,
      sun: 0xf3f5f0, sunI: 1.5, sunEl: 0.7, sunAz: 0.9, hemiSky: 0xdfe6e0, hemiGround: 0x3b4d30, hemiI: 0.7, env: 0.9,
      exposure: 1.06, terrain: 'jungle', particles: 'rain', glow: 0.9, lamp: 0.4, trees: 'canopy', tod: 0.3, storm: 0x8f9a9c
    },
    // used by the scroll story: desert at last light
    dusk: {
      label: 'Dusk', skyTop: 0x203a66, skyMid: 0x7d7fa6, skyBot: 0xf4b07a, fog: 0xd7a787, fogNear: 200, fogFar: 950,
      ground: 0xc9a77f, ground2: 0x9a7658, steel: 0xb09a75, fabric: 0xd8c49d, frame: 0x9a8562, gn: 0.16,
      sun: 0xffa15a, sunI: 2.6, sunEl: 0.1, sunAz: 0.55, hemiSky: 0x9aa6c9, hemiGround: 0x6d4d36, hemiI: 0.5, env: 0.75,
      exposure: 1.0, terrain: 'dunes', particles: 'dust', glow: 2.2, lamp: 1, tod: 0.55, storm: 0xb68c5a
    }
  };

  // Time of day: universal looks; a climate's own tuned look replaces the key nearest its native time.
  const TOD_KEYS = [
    { t: 0.15, look: { skyTop: 0x3c74b8, skyMid: 0x8db2d8, skyBot: 0xe6ecef, fog: 0xc9d4de, sun: 0xfff3dc, sunI: 3.0, sunEl: 0.85, hemiSky: 0xc4d8ee, hemiI: 0.5, env: 0.85, exposure: 0.95, glow: 0.25, lamp: 0 } },
    { t: 0.55, look: { skyTop: 0x1c3560, skyMid: 0x7a7fa8, skyBot: 0xf2ad7c, fog: 0xb99a92, sun: 0xffa064, sunI: 2.4, sunEl: 0.12, hemiSky: 0x8798c4, hemiI: 0.5, env: 0.7, exposure: 0.92, glow: 2.3, lamp: 1 } },
    { t: 0.72, look: { skyTop: 0x0b1630, skyMid: 0x2c3a62, skyBot: 0x9a6a64, fog: 0x4a4e66, sun: 0xff7a48, sunI: 0.55, sunEl: 0.02, hemiSky: 0x55648e, hemiI: 0.45, env: 0.5, exposure: 1.0, glow: 2.9, lamp: 1.2 } },
    { t: 0.92, look: { skyTop: 0x02050c, skyMid: 0x06112a, skyBot: 0x16264a, fog: 0x141f36, sun: 0x9db5e0, sunI: 0.42, sunEl: 0.72, hemiSky: 0x34476e, hemiGround: 0x0b111e, hemiI: 0.34, env: 0.3, exposure: 1.05, glow: 3.2, lamp: 1.3 } }
  ];
  const LOOK_COLORS = ['skyTop', 'skyMid', 'skyBot', 'fog', 'sun', 'hemiSky', 'hemiGround'];
  const LOOK_NUMS = ['sunI', 'sunEl', 'hemiI', 'env', 'exposure', 'glow', 'lamp'];
  const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

  // Callouts anchored to the model. Copy from the MECC / EHMECC / command & control pages on weatherhaven.com.
  const HOTSPOTS = [
    { id: 'iso', t: 'ISO & CSC certified', d: 'ISO and CSC certified for air, land and sea transport and stacking. Loads by forklift, crane, helicopter or PLS.', n: [-1, 0, 1], when: () => true,
      pos: (D) => [-D.L / 2 + 0.05, 0.25, D.W / 2 - 0.05] },
    { id: 'door', t: 'Locks for transit', d: 'Latching and locking mechanisms resist theft and cargo damage — the unit can be locked during transit, securing the equipment inside.', n: [-1, 0, 0], when: () => true,
      pos: (D) => [-D.L / 2 - 0.12, 4.4, D.doorZ - 0.55] },
    { id: 'core', t: 'Equipment rides in the core', d: 'Equipment is stored and transported in the centre core, and doesn’t need to be removed at set-up or tear-down.', n: [0, 1, 0], when: () => true,
      pos: (D, r) => [2.5, D.H + r + 0.08, 0] },
    { id: 'floor', t: 'Three times the floor', d: 'Three times the floor space of a conventional wood or steel module, with the same shipping footprint.', n: [0, 0, 1], when: (p) => p > 0.97,
      pos: (D) => [-D.L / 2 + 3.2, 0.32, D.W / 2 + D.WD + 0.35] },
    { id: 'fabric', t: 'Expands without exposure', d: e => 'Insulated fabric walls and roof unfold with the floor, so it expands without exposing personnel or contents to the weather.' + (e > 0.5 ? '' : ' Set up by two people in 10–15 minutes.'), n: [0, 0, 1], when: (p) => p > 0.97,
      pos: (D) => [0.4, 3.4, D.W / 2 + D.WD + 0.3] },
    { id: 'hvac', t: 'Electrical & HVAC', d: 'Can be fully outfitted with electrical, mechanical and HVAC systems.', n: [1, 0, 0], when: () => true,
      pos: (D) => [D.L / 2 + 1.2, 2.2, -1.6] },
    { id: 'roof', t: 'EHMECC: +4.5 ft of headroom', d: 'The roof rises an additional 4.5 feet, to 12\u00276\u0022 of vertical space — extra head room and a higher-hanging operating-room lamp, for uses from operating rooms to simulation and training.', n: [-1, 0, 0], when: (p, e) => e > 0.9,
      pos: (D, r) => [-D.L / 2 - 0.12, D.H + r * 0.5, -2.4] }
  ];

  // Interior fit-outs: copy from weatherhaven.com (MECC, EHMECC, command & control, field hospitals, kitchens, workshops)
  // TRECC fact pins (positions in the CAD's metres; copy from the TRECC product page). xr: needs the section cut
  const TRECC_PINS = [
    { id: 'tr-h', hero: true, t: 'Five to eight feet', d: 'Extends in height from five to eight feet.', m: [0, 2.38, 0.3], n: [0, 1, 0] },
    { id: 'tr-x', hero: true, t: 'Three times the footprint', d: 'Expands to three times its shipping footprint — shipped, it is one-third the footprint of its deployed floor space.', m: [-2.2, 1.3, 0.2], n: [-1, 0, 0] },
    { id: 'tr-core', t: 'Centre core', d: 'Furnishings ship inside the centre core, protected in transit.', m: [0.2, 1.5, -0.45], n: [0, 0, 1], xr: true },
    { id: 'tr-fork', hero: true, t: 'Forklift pockets', d: 'Forklift pockets for loading and unloading. Optional removable, adjustable-height wheel sets.', m: [0.5, 0.14, 1.22], n: [0, 0, 1] },
    { id: 'tr-door', t: 'Personnel doors', d: 'Weather-proof personnel doors on the expandable sides.', m: [-1.65, 1.0, -1.2], n: [0, 0, -1] },
    { id: 'tr-cover', t: 'Insulated fabric cover', d: 'Fully insulated, rugged fabric cover system.', m: [-1.62, 1.9, 1.22], n: [0, 0, 1] },
    { id: 'tr-alu', t: 'Lightweight aluminum', d: 'High-strength, lightweight aluminum construction.', m: [1.08, 0.6, 1.26], n: [0, 0, 1] },
    { id: 'tr-floor', t: 'Interchangeable floor panels', d: 'Interchangeable floor panels for workshops, offices and more.', m: [1.4, 0.12, -0.5], n: [0, 1, 0], xr: true },
    { id: 'tr-link', t: 'Interconnects', d: 'Interconnects with other shelters into a larger facility.', m: [2.2, 1.0, -0.5], n: [1, 0, 0] }
  ].map(h => Object.assign(h, { pos: () => [h.m[0] * TR.F, h.m[1] * TR.F, (h.m[2] - TR.zc) * TR.F], when: p => p > 0.97 }));
  const FITOUTS = {
    command: { label: 'Command post', t: 'Command post', d: 'Expandable containers protect sensitive electronic equipment from the elements, with fibre optics, CAT 5 and video conferencing — plus server racks, desks, map boards and TV screens.', light: 0xdfe8ff, eh: false },
    medical: { label: 'Field hospital', t: 'Operating room · EHMECC', d: 'The EHMECC extends an additional 4.5 feet in height: extra head room, a higher-hanging operating-room lamp and a climate-controlled working environment.', light: 0xf4f8ff, eh: true, exp: 0.8 },
    kitchen: { label: 'Kitchen', t: 'Field kitchen', d: 'Kitchens are one of the MECC’s listed configurations. Weatherhaven kitchens range from small self-serve facilities to full-service kitchens that feed a camp of 500 or more.', light: 0xffe7c4, eh: false },
    workshop: { label: 'Workshop', t: 'Workshop', d: 'MECC workshops are configured for tire changing, aircraft maintenance and electronic repair — and can be set up and operated on the back of a truck or trailer.', light: 0xfff1dc, eh: false }
  };

  /* ---------------- geometry helpers ---------------- */
  function rboxGeo(w, h, d, r = 0.08, s = 2) {
    const b = Math.max(0.001, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
    const sh = new THREE.Shape(); sh.moveTo(-w / 2 + b, -h / 2 + b); sh.lineTo(w / 2 - b, -h / 2 + b); sh.lineTo(w / 2 - b, h / 2 - b); sh.lineTo(-w / 2 + b, h / 2 - b); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: s, curveSegments: 3 });
    g.translate(0, 0, -(d - 2 * b) / 2); return g;
  }
  function mk(geo, mat, x = 0, y = 0, z = 0, parent, cast = true, recv = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; if (parent) parent.add(m); return m;
  }
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, mat, x, y, z, parent, cast = true) { const m = mk(BOX, mat, x, y, z, parent, cast); m.scale.set(w, h, d); return m; }
  function curtainGeo(width, height, posts, sag, segX = 60, segY = 14) {
    const g = new THREE.PlaneGeometry(width, height, segX, segY); g.translate(0, -height / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = -p.getY(i) / height;
      const u = (x / width + 0.5) * posts, f = u - Math.floor(u), s = Math.sin(f * PI);
      let z = -sag * s * s * (0.25 + 0.75 * Math.sin(Math.min(1, yy) * PI));
      z += sag * 0.35 * Math.sin(x * 1.7 + yy * 9) * Math.sin(yy * PI) * s;
      if (yy > 0.93) z += (yy - 0.93) * 1.6;
      p.setZ(i, z);
    }
    g.computeVertexNormals(); return g;
  }

  class ShelterViewer {
    constructor(opts = {}) {
      this.ok = false; this.storyMode = !!opts.story;
      try {
        const test = document.createElement('canvas');
        if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) return;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      } catch (e) { return; }
      this.ok = true;
      const r = this.renderer;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping;
      r.localClippingEnabled = true;
      r.domElement.className = 'viewer-canvas';
      r.domElement.setAttribute('role', 'img');
      r.domElement.setAttribute('aria-label', this.storyMode ? 'Animation of a MECC being delivered by truck and deployed' : 'Interactive 3D model of a MECC expandable container. Drag to rotate.');

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.3, 2600);
      this.az = -0.72; this.el = 0.14; this.dist = 72; this.distT = 72;
      this.target = new THREE.Vector3(0, 4.6, 0);
      this.p = 0; this.pT = 0; this.e = 0; this.eT = 0;
      this.offsetX = 0; this.idle = 0; this.dragging = false;
      this.climate = null; this.listeners = []; this.fitout = null; this.camMode = 'orbit';
      this.clock = new THREE.Clock();
      this.pmrem = new THREE.PMREMGenerator(r);
      this.tex = { steel: steelTextures(), fabric: fabricTextures(), soft: softRectTexture(), glow: glowTexture() };
      this.buildWorld();
      this.buildUnit();
      if (this.storyMode) {
        this.buildTruck(); this.buildJacks();
        this.model = 'trecc';
        this.buildTrecc().then(() => {
          this.buildForklift(); this.storyTrecc = true; this.unit.visible = false; this.jacks.forEach(j => j.visible = false);
          this.tr.group.visible = true; this.renderer.domElement.setAttribute('aria-label', 'Animation of a TRECC being delivered by truck, unloaded by forklift and deployed');
          if (this.storyT != null) this.setStory(this.storyT); else this.render();
        }).catch(() => { this.model = null; });
      }
      this.setClimate(this.storyMode ? 'dusk' : 'arctic');
      if (!this.storyMode) this.bindPointer();
      this.loop = this.loop.bind(this); Q.viewers.push(this); this.ft = []; this.warm = 0; this.lastHeavy = 0; this.applyTier();
      this.io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.start(); }, { threshold: 0.01 });
      this.ro = new ResizeObserver(() => this.resize());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); });
    }

    on(fn) { this.listeners.push(fn); }
    emit() { const s = this.state(); this.listeners.forEach(f => f(s)); }
    state() {
      const s1 = ease(clamp(this.p / 0.4));
      return { p: this.p, e: this.e, area: Math.round(160 + 320 * s1), height: 8 + 4.5 * ease(this.e), climate: this.climate,
        deployed: this.p > 0.995, packed: this.p < 0.005, fitout: this.fitout, inside: this.camMode === 'inside' || (this.camMode === 'fly' && this.fly && this.fly.dir > 0) || !!this.pendingFit, flying: this.camMode === 'fly', pending: !!this.pendingFit, tod: this.tod, storm: (this.stormT || 0) > 0.5, camp: !!this.campMode, model: this.model || 'mecc', tr: this.model === 'trecc' ? (this.trState || { height: 5, mult: 1 }) : null, paint: this.paintKey(), quality: Q.tier, xray: this.xray || 0, loading: this.model === 'trecc' && !!this.tr && !this.tr.loaded };
    }

    mount(el, opts = {}) {
      if (!this.ok) return false;
      if (this.container) { this.io.unobserve(this.container); this.ro.unobserve(this.container); }
      this.container = el;
      el.appendChild(this.renderer.domElement);
      if (!this.storyMode) { if (!this.hsLayer) this.buildHotspots(); el.appendChild(this.hsLayer); this.closeHotspot(); }
      this.offsetX = opts.offsetX || 0; this.hsFew = !!opts.fewPins;
      this.offsetY = opts.offsetY || 0; this.offsetYNarrow = opts.offsetYNarrow || 0; this.offsetYTablet = opts.offsetYTablet;
      this.baseDist = opts.dist || 72;
      if (this.camMode !== 'orbit') this.exitFitout(true);
      this.io.observe(el); this.ro.observe(el);
      this.resize(); this.start();
      return true;
    }

    applyTier() {
      const t = Q.tier, r = this.renderer;
      r.shadowMap.enabled = t > 0; r.shadowMap.type = t === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
      if (this.sun) { this.sun.castShadow = t > 0; this.sun.shadow.mapSize.set(t === 2 ? 2048 : 1024, t === 2 ? 2048 : 1024); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
      this.scene && this.scene.traverse(o => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
      this.lastHeavy = performance.now();
      if (this.container) this.resize(); else this.render && this.render();
    }
    samplePerf(raw) {
      const now = performance.now();
      if (Q.lock != null || Q.tier === 0 || raw > 1 || now - this.lastHeavy < 1500) { this.ft.length = 0; return; }
      if (++this.warm < 24) return;
      this.ft.push(raw);
      if (this.ft.length < 36) return;
      const sorted = this.ft.slice().sort((a, b) => a - b), med = sorted[sorted.length >> 1];
      this.ft.length = 0;
      if (med > 0.034) setTier(Q.tier - 1);
    }
    resize() {
      if (!this.container) return;
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!w || !h) return;
      const pr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.5 : 2, Q.tier === 2 ? 2 : Q.tier === 1 ? 1.25 : 1);
      if (this.renderer.getPixelRatio() !== pr) this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
      this.camera.aspect = w / h;
      this.narrow = w < 980;
      this.applyViewOffset(this.camMode === 'orbit' ? 1 : 0);
      this.distT = (this.baseDist || 72) * (this.model === 'trecc' ? 0.74 : 1) * (this.narrow ? 1.25 : 1) * (w / h < 1 ? 1.25 : 1);
      if (!this.running) this.dist = this.distT;
      this.render();
    }
    applyViewOffset(k = 1) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const tab = this.narrow && w >= 640 && this.offsetYTablet != null;
      const ox = (this.narrow ? 0 : this.offsetX) * k, oy = (tab ? this.offsetYTablet : this.narrow ? (this.offsetYNarrow || 0) : (this.offsetY || 0)) * k;
      if (Math.abs(ox) > 1e-4 || Math.abs(oy) > 1e-4) this.camera.setViewOffset(w, h, -w * ox, -h * oy, w, h); else this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
    }

    /* ---------------- world ---------------- */
    buildWorld() {
      const s = this.scene;
      this.skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } };
      this.skyMat = new THREE.ShaderMaterial({
        uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;
          void main(){ float h = clamp(vP.y,-0.2,1.0);
            vec3 c = h < 0.12 ? mix(bot, mid, smoothstep(-0.02,0.12,h)) : mix(mid, top, smoothstep(0.12,0.75,h));
            float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
            c += sunCol * (pow(s, 6.0) * 0.35 + pow(s, 120.0) * 1.6) * smoothstep(-0.05, 0.1, h + 0.05);
            gl_FragColor = vec4(c, 1.0); }`
      });
      s.add(new THREE.Mesh(new THREE.SphereGeometry(1300, 48, 24), this.skyMat));
      // stars, faded in at night
      { const N = 1500, sp = new Float32Array(N * 3), sg = new THREE.BufferGeometry();
        for (let i = 0; i < N; i++) { const a = Math.random() * TAU, y = 0.05 + Math.pow(Math.random(), 0.8) * 0.95, r = Math.sqrt(1 - y * y); sp[i * 3] = Math.cos(a) * r * 1150; sp[i * 3 + 1] = y * 1150; sp[i * 3 + 2] = Math.sin(a) * r * 1150; }
        sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        this.starMat = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
        this.stars = new THREE.Points(sg, this.starMat); this.stars.frustumCulled = false; this.stars.visible = false; s.add(this.stars); }
      s.fog = new THREE.Fog(0xffffff, 100, 600);

      this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); s.add(this.hemi);
      this.sun = new THREE.DirectionalLight(0xffffff, 2);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera; const ext = this.storyMode ? 46 : 42;
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 400;
      this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 3;
      s.add(this.sun); s.add(this.sun.target);

      const g = new THREE.PlaneGeometry(1200, 1200, 170, 170); g.rotateX(-PI / 2);
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
      this.terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, envMapIntensity: 0.3, normalMap: null, normalScale: new THREE.Vector2(0.5, 0.5) }));
      this.groundN = { ripple: groundNormal(true), soft: groundNormal(false) };
      this.terrain.receiveShadow = true; s.add(this.terrain);
      this.terrainBase = Float32Array.from(g.attributes.position.array);

      this.treeGroup = new THREE.Group(); s.add(this.treeGroup);

      const N = 2400, pg = new THREE.BufferGeometry();
      this.pPos = new Float32Array(N * 3); this.pVel = new Float32Array(N);
      for (let i = 0; i < N; i++) { this.pPos[i * 3] = (Math.random() - 0.5) * 180; this.pPos[i * 3 + 1] = Math.random() * 70; this.pPos[i * 3 + 2] = (Math.random() - 0.5) * 180; this.pVel[i] = 0.6 + Math.random() * 0.8; }
      pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
      this.pMat = new THREE.PointsMaterial({ size: 0.5, map: this.tex.glow, transparent: true, depthWrite: false, opacity: 0.9 });
      this.points = new THREE.Points(pg, this.pMat); this.points.frustumCulled = false; s.add(this.points);
    }

    shapeTerrain(kind, c1, c2) {
      const g = this.terrain.geometry, pos = g.attributes.position, col = g.attributes.color, base = this.terrainBase;
      const A = LIN(c1), B = LIN(c2), tmp = new THREE.Color(), flat = this.flatR || (this.storyMode ? 70 : 40), PH = this.padHalf || [15, 15];
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2], r = Math.hypot(x, z);
        // three bands: a flat pad around the unit, low rolling ground, and a distant ridge line kept low on the horizon
        const near = clamp((r - flat) / 70), far = Math.pow(clamp((r - 360) / 220), 1.4), micro = fbm(x * 0.06, z * 0.06, 2) * clamp(r / 30);
        let y = 0, n = 0;
        if (kind === 'mountains') {
          n = fbm(x * 0.006 + 3, z * 0.006, 5);
          let ridge = 0, a = 0.6, f = 0.005, wgt = 1;
          for (let o = 0; o < 5; o++) { let rr = 1 - Math.abs(vnoise(x * f + 9 * o, z * f - 4 * o) * 2 - 1); rr *= rr; rr *= wgt; wgt = clamp(rr * 1.6); ridge += rr * a; a *= 0.5; f *= 2.1; }
          y = near * fbm(x * 0.012, z * 0.012 + 2, 3) * 8 + far * (n * 10 + ridge * 58) + micro * 0.35;
        } else if (kind === 'dunes') {
          n = Math.sin(x * 0.018 + fbm(x * 0.004, z * 0.004, 3) * 6) * 0.5 + 0.5;
          y = near * (n * 5 + fbm(x * 0.01, z * 0.01, 3) * 4) + far * (n * 16 + fbm(x * 0.008, z * 0.008, 3) * 14) + Math.sin(x * 0.09 + z * 0.03) * 0.22 * clamp(r / 30);
        } else if (kind === 'hills') {
          n = fbm(x * 0.008, z * 0.008 + 4, 4); y = near * n * 9 + far * n * 46 + micro * 0.3;
        } else {
          n = fbm(x * 0.01 + 7, z * 0.01, 4); y = near * n * 7 + far * n * 50 + micro * 0.4;
        }
        pos.setY(i, y);
        const t = clamp(n * 0.9 + hash(x, z) * 0.12 + (fbm(x * 0.045, z * 0.045 + 7, 2) - 0.5) * 0.6);
        tmp.copy(A).lerp(B, kind === 'mountains' ? clamp((y - 6) / 60) * 0.9 + hash(x, z) * 0.06 : t * 0.8);
        if (kind === 'hills' || kind === 'jungle') {
          // compacted gravel pad under the unit
          const pad = 1 - clamp((Math.max(Math.abs(x) - PH[0], Math.abs(z) - PH[1], 0) + (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 6) / 6);
          if (pad > 0) tmp.lerp(GRAVEL.setRGB(0.2, 0.19, 0.16).lerp(GRAVEL2.setRGB(0.3, 0.28, 0.24), hash(x * 3, z * 3)), pad * 0.85);
        } else if (r < flat + 10 && kind !== 'mountains') tmp.lerp(B, 0.18 * (1 - clamp((r - 8) / (flat + 2))));
        col.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      pos.needsUpdate = true; g.computeVertexNormals();
      if (kind === 'mountains') {
        const nrm = g.attributes.normal, rock = LIN(0x3b4a5e), rock2 = LIN(0x55667b);
        for (let i = 0; i < pos.count; i++) {
          const slope = 1 - nrm.getY(i), y = pos.getY(i), x = base[i * 3], z = base[i * 3 + 2];
          if (y > 10 && slope > 0.24 + hash(x * 0.3, z * 0.3) * 0.12) { tmp.copy(rock).lerp(rock2, hash(z, x)); col.setXYZ(i, tmp.r, tmp.g, tmp.b); }
        }
      }
      col.needsUpdate = true;
    }

    buildTrees(kind) {
      while (this.treeGroup.children.length) { const m = this.treeGroup.children.pop(); m.geometry.dispose(); m.material.dispose(); }
      if (!kind) return;
      const geo = treeGeometry(kind);
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.35 });
      const count = kind === 'conifer' ? 900 : 760;
      const mesh = new THREE.InstancedMesh(geo, mat, count); mesh.castShadow = false; mesh.receiveShadow = false;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
      const pos = this.terrain.geometry.attributes.position, segs = 171, size = 1200;
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 14) {
        tries++;
        const r0 = Math.max(95, (this.flatR || 40) + 50), a = Math.random() * TAU, r = r0 + Math.pow(Math.random(), 0.8) * (515 - r0);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        // stands of trees: keep candidates where a low-frequency mask is high, plus a few strays
        const mask = fbm(x * 0.011 + 5, z * 0.011 - 3, 3);
        if (mask < 0.5 && Math.random() > 0.04) continue;
        const ix = Math.round((x + size / 2) / size * 170), iz = Math.round((z + size / 2) / size * 170);
        const y = pos.getY(iz * segs + ix);
        if (kind === 'conifer' && y > 44) continue;
        const s = (kind === 'conifer' ? 0.7 : 0.8) + Math.random() * 0.75 + (mask - 0.5) * 0.8;
        sc.set(s, s * (kind === 'conifer' ? 0.9 + Math.random() * 0.45 : 0.8 + Math.random() * 0.3), s);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * TAU);
        p.set(x, y - 0.3, z);
        m.compose(p, q, sc); mesh.setMatrixAt(placed, m);
        const v = 0.78 + Math.random() * 0.34; col.setRGB(v, v * (0.95 + Math.random() * 0.1), v * (0.9 + Math.random() * 0.1)); mesh.setColorAt(placed, col);
        placed++;
      }
      mesh.count = placed; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; this.treeGroup.add(mesh);
    }

    /* ---------------- the MECC ---------------- */
    buildUnit() {
      const L = 20, W = 8, H = 8, FY = 0.55, FT = 0.12, PH = 7.05, P = 0.42, R = 0.35;
      const pivotZ = W / 2 - 0.22, WD = W / 2 + PH - pivotZ - R;
      this.dims = { L, W, H, FY, FT, PH, WD: PH, roofWD: WD, pivotZ, R, doorZ: 1.6, floorTop: FY + FT };
      const D = this.dims;
      const unit = new THREE.Group(); this.unit = unit; this.scene.add(unit);
      const T = this.tex;
      this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const M = this.mat = {
        steel: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.steel.map, normalMap: T.steel.normal, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.52, metalness: 0.18, envMapIntensity: 0.9 }),
        frame: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.steel.map, roughness: 0.48, metalness: 0.22, envMapIntensity: 0.9 }),
        casting: new THREE.MeshStandardMaterial({ color: LIN(0x2b2f33), roughness: 0.45, metalness: 0.65 }),
        hole: new THREE.MeshBasicMaterial({ color: 0x050607 }),
        dark: new THREE.MeshStandardMaterial({ color: LIN(0x23282d), roughness: 0.6, metalness: 0.4 }),
        alu: new THREE.MeshStandardMaterial({ color: LIN(0xc3c8cd), roughness: 0.32, metalness: 0.85 }),
        plate: new THREE.MeshStandardMaterial({ color: LIN(0xb5bbc1), map: floorTexture('plate'), roughness: 0.4, metalness: 0.8 }),
        floor: new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTexture('vinyl'), roughness: 0.82, metalness: 0.05 }),
        fabric: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.fabric.map, normalMap: T.fabric.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.93, envMapIntensity: 0.55, clippingPlanes: [this.clipPlane], clipShadows: true }),
        liner: new THREE.MeshStandardMaterial({ color: LIN(0xdfe3e2), map: T.fabric.map, roughness: 0.95, side: THREE.BackSide, clippingPlanes: [this.clipPlane], clipShadows: true }),
        roofFab: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.fabric.map, normalMap: T.fabric.normal, roughness: 0.93, envMapIntensity: 0.55 }),
        roofIn: new THREE.MeshStandardMaterial({ color: LIN(0xe4e7e5), roughness: 0.95 }),
        ehFab: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.fabric.map, normalMap: T.fabric.normal, roughness: 0.93, envMapIntensity: 0.55, side: THREE.DoubleSide }),
        glass: new THREE.MeshStandardMaterial({ color: LIN(0x1a242d), roughness: 0.12, metalness: 0.2, envMapIntensity: 1.4, emissive: 0xffffff, emissiveMap: windowTexture(), emissiveIntensity: 0, clippingPlanes: [this.clipPlane] }),
        doorGlass: new THREE.MeshStandardMaterial({ color: LIN(0x1a242d), roughness: 0.1, metalness: 0.2, envMapIntensity: 1.4, emissive: 0xffffff, emissiveMap: windowTexture(), emissiveIntensity: 0 }),
        lamp: new THREE.MeshStandardMaterial({ color: LIN(0xfff4e0), emissive: LIN(0xffd6a0), emissiveIntensity: 0 }),
        ceil: new THREE.MeshStandardMaterial({ color: LIN(0xffffff), emissive: LIN(0xffffff), emissiveIntensity: 0 }),
        inner: new THREE.MeshStandardMaterial({ color: LIN(0xd9dde0), roughness: 0.7, metalness: 0.1 }),
        grille: new THREE.MeshStandardMaterial({ color: LIN(0x1c2024), roughness: 0.55, metalness: 0.5 }),
        csc: new THREE.MeshStandardMaterial({ color: LIN(0xb8bec3), roughness: 0.35, metalness: 0.9 }),
        stencil: new THREE.MeshBasicMaterial({ map: stencilTexture('WARNING: 3-HIGH STACKING ONLY'), transparent: true, depthWrite: false, opacity: 0.85 }),
        trim: new THREE.MeshStandardMaterial({ color: LIN(0x6b665c), roughness: 0.9, clippingPlanes: [this.clipPlane] }),
        ao: new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: T.soft, transparent: true, depthWrite: false, opacity: 0.62 })
      };
      M.ao.polygonOffset = true; M.ao.polygonOffsetFactor = -2;
      // end curtains: same fabric, fewer seams across their narrower width
      M.fabricEnd = M.fabric.clone();
      ['map', 'normalMap'].forEach(k => { const t = M.fabric[k].clone(); t.needsUpdate = true; t.repeat.set(0.5, 1); M.fabricEnd[k] = t; });

      const core = new THREE.Group(); unit.add(core); this.core = core;
      // ---- ISO frame: corner posts, rails, castings ----
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
        box(P, H, P, M.frame, sx * (L / 2 - P / 2), H / 2, sz * (W / 2 - P / 2), core);
        // bottom casting (top castings live on the roof group)
        const c = box(0.6, 0.42, 0.58, M.casting, sx * (L / 2 - 0.3), 0.21, sz * (W / 2 - 0.29), core);
        box(0.02, 0.16, 0.26, M.hole, sx * (L / 2 + 0.005), 0.22, sz * (W / 2 - 0.29), core, false);
        box(0.22, 0.16, 0.02, M.hole, sx * (L / 2 - 0.3), 0.22, sz * (W / 2 + 0.005), core, false);
      }));
      [-1, 1].forEach(sz => {
        const rail = box(L - 1.1, FY, 0.24, M.frame, 0, FY / 2, sz * (W / 2 - 0.12), core);
        [-3.1, 3.1].forEach(fx => box(1.15, 0.3, 0.05, M.hole, fx, 0.24, sz * (W / 2 + 0.005), core, false)); // forklift pockets
      });
      [-1, 1].forEach(sx => box(0.24, FY, W - 1.1, M.frame, sx * (L / 2 - 0.12), FY / 2, 0, core));
      box(L - 0.6, FT, W - 0.5, M.floor, 0, FY + FT / 2, 0, core);
      // ---- end walls ----
      const ewH = H - FY - 0.45, ewY = FY + ewH / 2;
      box(0.1, ewH, W - 2 * P, M.steel, L / 2 - 0.08, ewY, 0, core);
      box(0.06, ewH, W - 2 * P, M.inner, L / 2 - 0.16, ewY, 0, core, false);
      // door end (-x): wall built around the opening so the camera can pass through
      const dz = D.doorZ, dw = 2.7, dh = 6.4, dy = FY + 0.15;
      const zMin = -(W / 2 - P), zMax = W / 2 - P, o0 = dz - dw / 2, o1 = dz + dw / 2, wallTop = H - 0.45;
      [[zMin, o0, FY, wallTop], [o1, zMax, FY, wallTop], [o0, o1, dy + dh, wallTop], [o0, o1, FY, dy]].forEach(([a, b, y0, y1]) => {
        if (b - a < 0.01 || y1 - y0 < 0.01) return;
        box(0.1, y1 - y0, b - a, M.steel, -L / 2 + 0.08, (y0 + y1) / 2, (a + b) / 2, core);
        box(0.06, y1 - y0, b - a, M.inner, -L / 2 + 0.16, (y0 + y1) / 2, (a + b) / 2, core, false);
      });
      [[0.16, dh + 0.2, 0.16, -L / 2 - 0.06, dy + dh / 2, dz - dw / 2 - 0.08], [0.16, dh + 0.2, 0.16, -L / 2 - 0.06, dy + dh / 2, dz + dw / 2 + 0.08], [0.16, 0.16, dw + 0.32, -L / 2 - 0.06, dy + dh + 0.08, dz]]
        .forEach(a => box(a[0], a[1], a[2], M.frame, a[3], a[4], a[5], core));
      this.doorHole = box(0.04, dh, dw, M.hole, -L / 2 + 0.02, dy + dh / 2, dz, core, false);
      this.doorPivot = new THREE.Group(); this.doorPivot.position.set(-L / 2 - 0.1, dy, dz + dw / 2); core.add(this.doorPivot);
      box(0.09, dh, dw, M.steel, 0, dh / 2, -dw / 2, this.doorPivot);
      box(0.1, 1.5, 1.2, M.doorGlass, -0.01, dh - 1.35, -dw / 2 - 0.1, this.doorPivot, false);
      box(0.12, 0.08, 0.55, M.dark, -0.08, 3.1, -dw + 0.45, this.doorPivot);
      box(0.12, 0.3, 0.12, M.dark, -0.08, 3.1, -dw + 0.25, this.doorPivot);
      [0.6, 3.2, 5.8].forEach(hy => mk(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), M.dark, -0.06, hy, -0.03, this.doorPivot));
      // louvres
      const louvre = (cx, cy, w, h, n, parentX) => {
        const g = new THREE.Group(); g.position.set(parentX, cy, cx); core.add(g);
        box(0.12, h, 0.08, M.frame, 0, 0, -w / 2, g); box(0.12, h, 0.08, M.frame, 0, 0, w / 2, g);
        box(0.12, 0.08, w, M.frame, 0, h / 2, 0, g); box(0.12, 0.08, w, M.frame, 0, -h / 2, 0, g);
        box(0.02, h - 0.1, w - 0.1, M.hole, 0.03, 0, 0, g, false);
        for (let i = 0; i < n; i++) { const s = box(0.18, 0.04, w - 0.12, M.frame, -0.02, -h / 2 + (i + 0.7) * h / (n + 0.4), 0, g, false); s.rotation.z = Math.sign(parentX) * 0.6; }
      };
      louvre(-1.9, 5.6, 1.7, 1.25, 7, -L / 2 - 0.1);
      louvre(-1.9, 3.7, 1.7, 1.25, 7, -L / 2 - 0.1);
      box(0.03, 0.42, 0.62, M.csc, -L / 2 - 0.12, 1.25, -2.6, core, false);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.3), M.stencil); st.rotation.y = -PI / 2; st.position.set(-L / 2 - 0.14, 7.18, -0.1); core.add(st);
      // door lamp
      box(0.35, 0.22, 0.5, M.dark, -L / 2 - 0.25, dy + dh + 0.45, dz, core);
      this.lampLens = box(0.06, 0.12, 0.38, M.lamp, -L / 2 - 0.42, dy + dh + 0.4, dz, core, false);
      this.doorLight = new THREE.PointLight(0xffc98a, 0, 26, 1.6); this.doorLight.position.set(-L / 2 - 1.4, dy + dh + 0.1, dz); core.add(this.doorLight);
      this.doorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xffc27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      this.doorGlow.scale.set(3.2, 3.2, 1); this.doorGlow.position.set(-L / 2 - 0.5, dy + dh + 0.4, dz); core.add(this.doorGlow);
      // HVAC / ECU on the far end (+x)
      const ecu = new THREE.Group(); ecu.position.set(L / 2 + 0.6, FY + 1.5, -1.6); core.add(ecu);
      mk(rboxGeo(1.05, 2.9, 3.3, 0.12), M.frame, 0, 0, 0, ecu);
      box(0.04, 2.3, 2.7, M.grille, 0.54, 0, 0, ecu, false);
      for (let i = 0; i < 10; i++) box(0.05, 0.04, 2.6, M.frame, 0.57, -1.05 + i * 0.235, 0, ecu, false);
      mk(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 28), M.grille, 0.58, 0.35, 0, ecu, false).rotation.z = PI / 2;
      box(0.9, 0.12, 0.2, M.dark, -0.1, -1.55, -1.2, ecu); box(0.9, 0.12, 0.2, M.dark, -0.1, -1.55, 1.2, ecu);
      // contact shadow
      this.aoUnit = mk(new THREE.PlaneGeometry(1, 1), M.ao, 0, 0.04, 0, unit, false, false); this.aoUnit.rotation.x = -PI / 2; this.aoUnit.renderOrder = -1;

      // ---- interior lighting (core) ----
      this.ceilStrips = [];
      for (let i = -1; i <= 1; i++) this.ceilStrips.push(box(4.2, 0.08, 0.5, M.ceil, i * 6, H - 0.55, 0, unit, false));
      this.inLights = [new THREE.PointLight(0xfff1dc, 0, 34, 1.3), new THREE.PointLight(0xfff1dc, 0, 34, 1.3), new THREE.PointLight(0xfff1dc, 0, 30, 1.3)];
      this.inLights[0].position.set(-5, H - 1.4, 0); this.inLights[1].position.set(5, H - 1.4, 0); this.inLights[2].position.set(0, H - 1.6, 0);
      this.inLights.forEach(l => unit.add(l));
      // shadow-casting key light for the interior views (enabled only while the camera is inside)
      this.inSpot = new THREE.SpotLight(0xffffff, 0, 34, 1.25, 0.9, 1.2);
      this.inSpot.position.set(0, H - 0.6, 0); this.inSpot.target.position.set(0, 0, 0);
      this.inSpot.shadow.mapSize.set(1024, 1024); this.inSpot.shadow.bias = -0.0006; this.inSpot.shadow.radius = 4; this.inSpot.shadow.camera.near = 0.5; this.inSpot.shadow.camera.far = 30;
      unit.add(this.inSpot); unit.add(this.inSpot.target);

      // ---- roof group (rises for EHMECC) ----
      const roof = new THREE.Group(); unit.add(roof); this.roofGroup = roof;
      box(L - 0.4, 0.12, W - 0.4, M.steel, 0, H - 0.06, 0, roof);
      box(L - 0.6, 0.04, W - 0.8, M.roofIn, 0, H - 0.15, 0, roof, false);
      [-1, 1].forEach(sz => box(L - 1.1, 0.42, 0.24, M.frame, 0, H - 0.21, sz * (W / 2 - 0.12), roof));
      [-1, 1].forEach(sx => box(0.24, 0.42, W - 1.1, M.frame, sx * (L / 2 - 0.12), H - 0.21, 0, roof));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
        box(0.6, 0.42, 0.58, M.casting, sx * (L / 2 - 0.3), H - 0.21, sz * (W / 2 - 0.29), roof);
        box(0.22, 0.02, 0.16, M.hole, sx * (L / 2 - 0.3), H + 0.005, sz * (W / 2 - 0.29), roof, false);
      }));
      // telescoping post extensions (EHMECC)
      this.postExt = [];
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => { const m = box(P * 0.8, 1, P * 0.8, M.dark, sx * (L / 2 - P / 2), 0, sz * (W / 2 - P / 2), unit); m.visible = false; this.postExt.push(m); }));
      this.ehFab = [];
      [-1, 1].forEach(sx => { const m = mk(new THREE.PlaneGeometry(W - 2 * P, 1), M.ehFab, sx * (L / 2 - 0.12), 0, 0, unit); m.rotation.y = PI / 2; m.visible = false; this.ehFab.push(m); });

      // ---- wings ----
      this.sides = []; this.wingRoofs = []; this.legs = []; this.windows = []; this.wingStrips = [];
      const curtain = curtainGeo(L - 0.5, H, 4, 0.1); this.curtainGeo = curtain;
      const endCurt = curtainGeo(PH + 0.2, H, 1, 0.08, 16, 12);
      [1, -1].forEach((sz, idx) => {
        // side wall → floor
        const pv = new THREE.Group(); pv.position.set(0, FY, sz * W / 2); unit.add(pv); pv.userData.sz = sz;
        const panel = mk(BOX, [M.steel, M.steel, M.steel, M.steel, sz > 0 ? M.steel : M.floor, sz > 0 ? M.floor : M.steel], 0, PH / 2, -sz * FT / 2, pv);
        panel.scale.set(L - 1.0, PH, FT);
        box(L - 1.0, 0.18, 0.14, M.frame, 0, PH - 0.09, -sz * 0.07, pv); // edge channel (becomes outer floor edge)
        this.sides.push(pv);
        // roof panel: stowed hanging inside the core, swings out and up
        const rp = new THREE.Group(); rp.position.set(0, H, sz * pivotZ); roof.add(rp); rp.userData.sz = sz;
        const rpanel = box(L - 0.5, 0.14, WD, M.roofFab, 0, -0.07, sz * WD / 2, rp);
        box(L - 0.6, 0.04, WD - 0.1, M.roofIn, 0, -0.16, sz * WD / 2, rp, false);
        const vg = new THREE.CylinderGeometry(R, R, L - 0.5, 14, 1, true, 0, PI / 2); vg.rotateZ(PI / 2); if (sz < 0) vg.rotateY(PI);
        const val = mk(vg, M.roofFab, 0, -R, sz * WD, rp); val.material = M.roofFab;
        const vgi = vg.clone(); const vi = mk(vgi, M.roofIn, 0, -R, sz * WD, rp, false); vi.scale.set(1, 0.97, 0.97); vi.material = new THREE.MeshStandardMaterial({ color: M.roofIn.color, roughness: 0.95, side: THREE.BackSide });
        const strip = box(L - 3, 0.07, 0.45, M.ceil, 0, -0.22, sz * WD * 0.55, rp, false); this.wingStrips.push(strip);
        this.wingRoofs.push(rp);
        // fabric outer wall + liner
        const outerZ = sz * (W / 2 + PH + 0.02);
        const ow = mk(curtain, M.fabric, 0, 0, outerZ, unit); if (sz < 0) ow.rotation.y = PI;
        const ol = mk(curtain, M.liner, 0, 0, outerZ, unit, false); ol.rotation.y = ow.rotation.y;
        ow.userData.wing = ol.userData.wing = true;
        // fabric end walls
        [-1, 1].forEach(sx => {
          const ex = sx * (L / 2 - 0.2), ez = sz * (W / 2 + PH / 2 + 0.05);
          const eg = endCurt.clone(), ep = eg.attributes.position, ew = PH + 0.2;
          for (let i = 0; i < ep.count; i++) {
            const lx = ep.getX(i), dzw = sx > 0 ? -lx : lx, d = clamp((sz * (ez + dzw) - W / 2) / PH, 0, 1);
            const drop = d * (PH * 0.065) + Math.pow(Math.max(0, (d - 0.9) / 0.1), 2) * R * 1.1, yy = -ep.getY(i) / H;
            ep.setY(i, ep.getY(i) - drop * (1 - yy));
          }
          eg.computeVertexNormals();
          const e = mk(eg, M.fabricEnd, ex, 0, ez, unit); e.rotation.y = sx * PI / 2;
          const el = mk(eg, M.liner, ex, 0, ez, unit, false); el.rotation.y = e.rotation.y;
          e.userData.wing = el.userData.wing = true;
          (this.wingEnds = this.wingEnds || []).push(e, el);
        });
        (this.wingWalls = this.wingWalls || []).push(ow, ol);
        // windows with roll-up flaps
        [-5.2, 5.2].forEach(wx => {
          const wy = 4.6, wz = sz * (W / 2 + PH + 0.12);
          const g = mk(new THREE.PlaneGeometry(2.6, 1.7), M.glass, wx, wy, wz, unit, false); if (sz < 0) g.rotation.y = PI;
          const trim = mk(new THREE.PlaneGeometry(2.95, 2.05), M.trim, wx, wy, wz - sz * 0.02, unit, false); trim.rotation.y = g.rotation.y;
          this.windows.push(trim);
          const roll = mk(new THREE.CylinderGeometry(0.16, 0.16, 2.9, 12), M.roofFab, wx, wy + 1.05, wz + sz * 0.08, unit); roll.rotation.z = PI / 2;
          roll.material = M.fabric;
          this.windows.push(g, roll);
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xffb46b, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
          glow.scale.set(4.2, 3.0, 1); glow.position.set(wx, wy, wz + sz * 0.3); unit.add(glow); (this.winGlows = this.winGlows || []).push(glow);
        });
        // levelling legs under the outer edge of the floor
        [-L / 2 + 0.9, -3.3, 3.3, L / 2 - 0.9].forEach(lx => {
          const g = new THREE.Group(); g.position.set(lx, 0, sz * (W / 2 + PH - 0.35)); unit.add(g);
          mk(new THREE.CylinderGeometry(0.11, 0.11, 1, 10), M.alu, 0, 0.5, 0, g); box(0.5, 0.05, 0.5, M.alu, 0, 0.025, 0, g);
          g.visible = false; this.legs.push(g);
        });
      });
      // step at the door
      this.step = new THREE.Group(); this.step.position.set(-L / 2 - 1.05, 0, D.doorZ); unit.add(this.step);
      box(1.7, 0.1, 3.1, M.plate, 0, FY - 0.05, 0, this.step); box(1.6, FY - 0.1, 0.08, M.alu, 0, (FY - 0.1) / 2, -1.5, this.step); box(1.6, FY - 0.1, 0.08, M.alu, 0, (FY - 0.1) / 2, 1.5, this.step);

      this.fitGroup = new THREE.Group(); this.fitGroup.name = 'fitGroup'; this.fitGroup.position.set(0, D.floorTop, 0); unit.add(this.fitGroup);
      this.fitBuilt = {};
      this.applyPose();
    }

    /* ---------------- truck + jack stands (story) ---------------- */
    buildTruck() {
      const tr = new THREE.Group(); this.truck = tr; this.scene.add(tr);
      const olive = new THREE.MeshStandardMaterial({ color: LIN(0x535b3c), roughness: 0.72, metalness: 0.15, envMapIntensity: 0.7 });
      const black = new THREE.MeshStandardMaterial({ color: LIN(0x16181a), roughness: 0.6, metalness: 0.3 });
      const rubber = new THREE.MeshStandardMaterial({ color: LIN(0x1a1b1c), roughness: 0.9, bumpMap: treadTexture(), bumpScale: 0.08 });
      const glass = new THREE.MeshStandardMaterial({ color: LIN(0x223040), roughness: 0.08, metalness: 0.3, envMapIntensity: 1.6 });
      this.headMat = new THREE.MeshStandardMaterial({ color: LIN(0xfff6e0), emissive: LIN(0xfff0d0), emissiveIntensity: 0 });
      // chassis + deck (container sits on the deck at y = 4.3)
      box(27.5, 0.7, 0.5, black, 2.5, 3.0, -1.7, tr); box(27.5, 0.7, 0.5, black, 2.5, 3.0, 1.7, tr);
      box(21, 0.5, 7.8, olive, -0.2, 4.05, 0, tr);
      box(21, 0.18, 0.18, black, -0.2, 3.75, -3.85, tr); box(21, 0.18, 0.18, black, -0.2, 3.75, 3.85, tr);
      // cab-over cab
      const cab = new THREE.Group(); cab.position.set(13.9, 0, 0); tr.add(cab);
      mk(rboxGeo(6.0, 5.6, 7.9, 0.35, 3), olive, 0, 6.6, 0, cab);
      mk(rboxGeo(6.2, 1.1, 8.1, 0.2), olive, 0.1, 3.75, 0, cab);
      const ws = mk(new THREE.PlaneGeometry(3.4, 2.1), glass, 3.03, 7.75, -1.85, cab, false); ws.rotation.y = PI / 2;
      const ws2 = mk(new THREE.PlaneGeometry(3.4, 2.1), glass, 3.03, 7.75, 1.85, cab, false); ws2.rotation.y = PI / 2;
      box(0.1, 2.3, 0.18, olive, 3.02, 7.75, 0, cab);
      [-1, 1].forEach(sz => {
        const sw = mk(new THREE.PlaneGeometry(2.6, 1.8), glass, 0.9, 7.8, sz * 3.97, cab, false); if (sz < 0) sw.rotation.y = PI;
        box(0.12, 0.12, 1.0, black, 2.3, 8.1, sz * 4.4, cab); box(0.5, 1.2, 0.12, black, 2.6, 7.5, sz * 4.9, cab);
        const hl = mk(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 18), this.headMat, 3.12, 4.7, sz * 2.9, cab, false); hl.rotation.z = PI / 2;
        box(0.2, 0.9, 1.4, black, 2.9, 4.7, sz * 2.9, cab);
        box(0.1, 3.2, 0.06, black, 1.2, 6.0, sz * 3.97, cab);
        mk(new THREE.CylinderGeometry(0.75, 0.75, 3.2, 18), olive, -1.4, 3.1, sz * 3.3, cab).rotation.z = PI / 2;
      });
      box(0.2, 1.3, 4.6, black, 3.06, 4.85, 0, cab);
      for (let i = 0; i < 7; i++) box(0.22, 0.06, 4.4, olive, 3.1, 4.3 + i * 0.18, 0, cab, false);
      box(0.6, 0.8, 8.4, black, 3.3, 2.7, 0, cab);
      mk(new THREE.CylinderGeometry(0.22, 0.22, 4.2, 12), black, -3.2, 9.0, 3.2, cab);
      box(1.6, 0.5, 5.2, black, -2.2, 9.65, 0, cab);
      // wheels (6x6)
      this.wheels = [];
      const prof = [[1.0, -0.62], [1.62, -0.66], [1.86, -0.55], [1.94, -0.3], [1.95, 0.3], [1.86, 0.55], [1.62, 0.66], [1.0, 0.62]].map(p => new THREE.Vector2(p[0], p[1]));
      const tireG = new THREE.LatheGeometry(prof, 36); tireG.rotateX(PI / 2);
      const rimG = new THREE.CylinderGeometry(1.05, 1.05, 1.0, 24); rimG.rotateX(PI / 2);
      [13.9, -3.0, -7.4].forEach(ax => [-1, 1].forEach(sz => {
        const w = new THREE.Group(); w.position.set(ax, 1.95, sz * 3.3); tr.add(w);
        mk(tireG, rubber, 0, 0, 0, w); mk(rimG, olive, 0, 0, sz * 0.02, w);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; box(0.16, 0.16, 0.08, black, Math.cos(a) * 0.65, Math.sin(a) * 0.65, sz * 0.54, w, false); }
        mk(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12), black, 0, 0, 0, w).rotation.x = PI / 2;
        this.wheels.push(w);
      }));
      [-1, 1].forEach(sz => { box(5.6, 0.18, 1.6, black, -5.2, 4.0, sz * 3.3, tr); box(2.2, 0.18, 1.7, olive, 13.9, 4.25, sz * 3.3, tr); });
      this.aoTruck = mk(new THREE.PlaneGeometry(31, 10), this.mat.ao, 2.5, 0.05, 0, tr, false, false); this.aoTruck.rotation.x = -PI / 2;
      tr.traverse(o => { if (o.isMesh && o !== this.aoTruck) o.castShadow = true; });
      // dust puffs
      this.dust = [];
      for (let i = 0; i < 26; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color: 0xd7b48b, transparent: true, depthWrite: false, opacity: 0 }));
        s.userData = { age: 9, life: 2.2 }; this.scene.add(s); this.dust.push(s);
      }
      this.truckX = -160; this.lastTruckX = -160;
    }
    buildJacks() {
      const D = this.dims, M = this.mat; this.jacks = [];
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
        const g = new THREE.Group(); g.position.set(sx * (D.L / 2 + 0.42), 0, sz * (D.W / 2 + 0.25)); this.unit.add(g);
        box(0.36, 5.8, 0.36, M.dark, 0, 3.4, 0, g); box(0.6, 0.6, 0.5, M.casting, 0, 6.2, 0, g); box(0.5, 0.3, 0.5, M.dark, 0, 0.62, 0, g);
        const crank = box(0.6, 0.06, 0.06, M.dark, sx * 0.3, 6.6, 0, g);
        const leg = box(0.26, 1, 0.26, M.casting, 0, 0, 0, g); const foot = box(0.9, 0.08, 0.9, M.dark, 0, 0, 0, g);
        g.userData = { leg, foot, crank }; g.visible = false; this.jacks.push(g);
      }));
    }

    /* ---------------- pose ---------------- */
    applyPose() {
      const D = this.dims, { L, W, H, FY, PH, pivotZ, R } = D;
      const s1 = ease(seg(this.p, 0, 0.4)), s2 = ease(seg(this.p, 0.3, 0.62)), s3 = ease(seg(this.p, 0.56, 0.9)), s4 = ease(seg(this.p, 0.86, 1));
      const raise = 4.5 * ease(this.e);
      this.sides.forEach(pv => { pv.rotation.x = pv.userData.sz * (PI / 2) * s1; });
      this.roofGroup.position.y = raise;
      const SL = 0.065;
      this.wingRoofs.forEach(rp => { const sz = rp.userData.sz; rp.rotation.x = sz * lerp(PI / 2, SL, s2); rp.visible = s2 > 0.001 || this.p > 0.05; });
      this.postExt.forEach(m => { m.visible = raise > 0.02; m.scale.y = Math.max(0.001, raise); m.position.y = H + raise / 2 - 0.2; });
      this.ehFab.forEach(f => { f.visible = raise > 0.02; f.scale.y = Math.max(0.001, raise); f.position.y = H + raise / 2 - 0.25; });
      // wing fabric: positioned at full height; revealed by a falling clip plane
      const top = H + raise - D.roofWD * Math.sin(SL) - R + 0.04, bot = FY - 0.12, hgt = top - bot;
      (this.wingWalls || []).forEach(m => { m.position.y = top; m.scale.y = hgt / H; m.visible = s3 > 0.001; });
      (this.wingEnds || []).forEach(m => { m.position.y = H + raise - 0.05; m.scale.y = (H + raise - 0.05 - bot) / H; m.visible = s3 > 0.001; });
      this.clipPlane.constant = -lerp(H + raise + 0.4, bot - 0.2, s3);
      this.windows.forEach(w => { w.visible = s3 > 0.75; });
      this.windows.forEach(w => { w.position.y = (w.userData.y0 == null ? (w.userData.y0 = w.position.y) : w.userData.y0) + raise * 0.35; });
      (this.winGlows || []).forEach(g => { g.position.y = 4.6 + raise * 0.35; });
      this.legs.forEach(l => { l.visible = s1 > 0.9; l.scale.y = clamp((s1 - 0.9) / 0.1); });
      this.step.visible = this.p > 0.6 || !this.storyMode;
      this.step.scale.y = 1;
      // AO footprint grows with the floor
      const halfW = W / 2 + PH * s1;
      this.aoUnit.scale.set(L + 4.5, halfW * 2 + 4, 1);
      // lights
      const cfg = this.look || this.cfg || CLIMATES.arctic, night = Math.max(cfg.glow, 2.4 * (this.storm || 0)), on = s4;
      this.mat.glass.emissiveIntensity = night * on * 0.6;
      this.mat.doorGlass.emissiveIntensity = night * on * 0.5;
      (this.winGlows || []).forEach(g => { g.material.opacity = clamp(night - 0.6) * on * 0.3; g.visible = s3 > 0.9; });
      const lamp = Math.max(cfg.lamp, this.storm || 0);
      this.mat.lamp.emissiveIntensity = lamp * 3 * (this.storyMode ? on : 1);
      this.doorLight.intensity = lamp * 1.6 * (this.storyMode ? on : 1);
      this.doorGlow.material.opacity = Math.min(1, lamp * 0.85) * (this.storyMode ? on : 1);
      const fl = this.fitout && FITOUTS[this.fitout] ? FITOUTS[this.fitout] : null;
      const inCol = fl ? fl.light : 0xfff1dc;
      this.mat.ceil.emissive.copy(LIN(inCol)); this.mat.ceil.emissiveIntensity = on * 1.6;
      const inside = this.camMode !== 'orbit';
      this.inLights.forEach(l => { l.color.copy(LIN(inCol)); l.intensity = on * (inside ? 0.5 : 0.1); l.position.y = H + raise - 1.5; });
      this.inSpot.color.copy(LIN(inCol)); this.inSpot.intensity = inside ? on * 1.15 : 0; this.inSpot.position.y = H + raise - 0.6;
      if (this.inSpot.castShadow !== inside) this.inSpot.castShadow = inside;
      if (this.camMode === 'inside') this.doorLight.intensity = 0;
      this.renderer.toneMappingExposure = (cfg.exposure || 1) * (inside ? 0.92 * ((fl && fl.exp) || 1) : 1);
      this.ceilStrips.forEach(s => { s.position.y = H + raise - 0.55; });
      this.fitGroup.visible = s1 > 0.85 && !!this.fitout;
      if (this.medLamp) this.medLamp.forEach(m => { m.position.y = m.userData.y0 + raise; });
      // door swings open when the camera goes inside
      this.doorPivot.rotation.y = (this.doorOpen || 0) * 1.75;
      this.doorHole.visible = !(this.doorOpen > 0.02) && !(s1 > 0.5 && this.fitout);
      if (this.model === 'series4' && this.s4) this.poseSeries4();
      if (this.model === 'hercon' && this.hc) this.poseHercon();
      if (this.model === 'trecc' && this.tr) this.poseTrecc();
    }

    setClimate(key) {
      const c = CLIMATES[key]; if (!c || this.climate === key) return;
      this.climate = key; this.cfg = c; this.tod = c.tod;
      this.lastHeavy = performance.now();
      const M = this.mat;
      M.steel.color.copy(LIN(c.steel)); M.frame.color.copy(LIN(c.frame || c.steel));
      M.fabric.color.copy(LIN(c.fabric)); M.fabricEnd.color.copy(LIN(c.fabric)); M.roofFab.color.copy(LIN(c.fabric)).multiplyScalar(0.94); M.ehFab.color.copy(LIN(c.fabric));
      if (this.campMats) this.campMats.forEach(f => f(c));
      this.paintTrecc();
      const gm = this.terrain.material, rip = c.terrain === 'dunes';
      gm.normalMap = rip ? this.groundN.ripple : this.groundN.soft; gm.normalScale.setScalar(c.gn || 0.4); gm.needsUpdate = true;
      gm.normalMap.repeat.setScalar(rip ? 170 : 110);
      this.shapeTerrain(c.terrain, c.ground, c.ground2);
      this.buildTrees(c.trees);
      this.pMode = c.particles; this.points.visible = c.particles !== 'none';
      if (c.particles === 'snow') { this.pMat.size = 0.5; this.pMat.color.setHex(0xffffff); this.pMat.opacity = 0.9; }
      if (c.particles === 'dust') { this.pMat.size = 0.4; this.pMat.color.setHex(0xe7cfa6); this.pMat.opacity = this.storyMode ? 0.35 : 0.5; }
      if (c.particles === 'rain') { this.pMat.size = 0.26; this.pMat.color.setHex(0xdfe7ee); this.pMat.opacity = 0.65; }
      if (this.stormSys) this.stormSys.kind = null;
      this.applyLighting(true);
      this.applyPose(); this.render(); this.emit();
    }

    // the climate's tuned look at its native time; universal looks elsewhere, interpolated
    lookAt(t) {
      const c = this.cfg;
      const keys = TOD_KEYS.map(k => ({ t: k.t, look: k.look }));
      let ni = 0; keys.forEach((k, i) => { if (Math.abs(k.t - c.tod) < Math.abs(keys[ni].t - c.tod)) ni = i; });
      const albedo = LIN(c.ground); const bright = (albedo.r + albedo.g + albedo.b) / 3;
      keys.forEach((k, i) => { if (i !== ni && bright > 0.45) { const f = 1 - (bright - 0.45) * 0.55; k.look = Object.assign({}, k.look, { exposure: k.look.exposure * f, sunI: k.look.sunI * f }); } });
      keys[ni] = { t: c.tod, look: c };
      const col = (o, f) => LIN(o[f] != null ? o[f] : f === 'hemiGround' ? c.hemiGround : 0x000000);
      let a = keys[0], b = keys[0], u = 0;
      if (t <= keys[0].t) a = b = keys[0];
      else if (t >= keys[keys.length - 1].t) a = b = keys[keys.length - 1];
      else for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; u = smooth(a.t, b.t, t); }
      const out = { colors: {} };
      LOOK_COLORS.forEach(f => { out.colors[f] = col(a.look, f).lerp(col(b.look, f), u); });
      LOOK_NUMS.forEach(f => { out[f] = lerp(a.look[f], b.look[f], u); });
      return out;
    }

    applyLighting(regenEnv) {
      const c = this.cfg, L = this.lookAt(this.tod), s = this.storm || 0, C = L.colors;
      const dayness = 1 - smooth(0.55, 0.92, this.tod) * 0.85;
      // storm: whiteout / brownout — sky and fog collapse toward the weather colour, sun dims
      const sc = LIN(c.storm || 0x9aa3ab).multiplyScalar(0.3 + 0.7 * dayness);
      const fogC = C.fog.clone().lerp(sc, s * 0.85);
      this.skyU.top.value.copy(C.skyTop).lerp(fogC, s * 0.8); this.skyU.mid.value.copy(C.skyMid).lerp(fogC, s * 0.9); this.skyU.bot.value.copy(C.skyBot).lerp(fogC, s * 0.95);
      const el = L.sunEl, sd = new THREE.Vector3(Math.cos(c.sunAz) * Math.cos(el), Math.sin(el), Math.sin(c.sunAz) * Math.cos(el));
      this.skyU.sunDir.value.copy(sd); this.skyU.sunCol.value.copy(C.sun).multiplyScalar(1 - s);
      this.scene.fog.color.copy(fogC);
      this.scene.fog.near = lerp(c.fogNear, 12, s); this.scene.fog.far = lerp(c.fogFar, 240, s);
      this.hemi.color.copy(C.hemiSky).lerp(fogC, s * 0.5); this.hemi.groundColor.copy(C.hemiGround); this.hemi.intensity = L.hemiI * (1 - 0.1 * s);
      this.sun.color.copy(C.sun); this.sun.intensity = L.sunI * (1 - 0.8 * s);
      this.sun.position.copy(sd).multiplyScalar(160);
      this.look = { glow: L.glow, lamp: L.lamp, exposure: L.exposure * (1 - 0.06 * s) };
      if (!this.camMode || this.camMode === 'orbit') this.renderer.toneMappingExposure = this.look.exposure;
      this.starMat.opacity = smooth(0.62, 0.86, this.tod) * (1 - s); this.stars.visible = this.starMat.opacity > 0.01;
      if (regenEnv || Math.abs((this.envT == null ? -1 : this.envT) - this.tod) > 0.04) {
        this.envT = this.tod;
        const hex = v => v.clone().convertLinearToSRGB().getHex();
        const env = { skyTop: hex(C.skyTop), skyMid: hex(C.skyMid), skyBot: hex(C.skyBot), sun: hex(C.sun.clone().multiplyScalar(Math.min(1, L.sunI / 2))),
          ground: hex(LIN(c.ground).multiplyScalar(0.25 + 0.75 * dayness)), ground2: hex(LIN(c.ground2).multiplyScalar(0.25 + 0.75 * dayness)), sunAz: c.sunAz, sunEl: el };
        if (this.envRT) this.envRT.dispose();
        const eq = this.equirect(env); this.envRT = this.pmrem.fromEquirectangular(eq); eq.dispose();
        this.scene.environment = this.envRT.texture;
      }
      [this.mat.steel, this.mat.frame].forEach(m => m.envMapIntensity = L.env);
    }

    setTimeOfDay(t) {
      if (!this.ok || !this.cfg) return;
      this.tod = clamp(t); this.applyLighting(false); this.applyPose(); this.start(); this.render(); this.emit();
    }
    setStorm(on) { if (!this.ok) return; this.stormT = on ? 1 : 0; if (on) this.ensureStorm(); this.start(); this.emit(); }

    // dense, wind-driven weather for storm mode (blizzard, sandstorm or driving rain)
    ensureStorm() {
      if (this.stormSys) return;
      const N = 7000, P = new Float32Array(N * 3), V = new Float32Array(N);
      for (let i = 0; i < N; i++) { P[i * 3] = (Math.random() - 0.5) * 100; P[i * 3 + 1] = Math.random() * 32; P[i * 3 + 2] = (Math.random() - 0.5) * 100; V[i] = 0.6 + Math.random() * 0.8; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      const mat = new THREE.PointsMaterial({ size: 0.42, map: this.tex.glow, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff });
      const pts = new THREE.Points(g, mat); pts.frustumCulled = false; this.scene.add(pts);
      const R = 2600, RP = new Float32Array(R * 6), RV = new Float32Array(R);
      for (let i = 0; i < R; i++) { const x = (Math.random() - 0.5) * 140, y = Math.random() * 45, z = (Math.random() - 0.5) * 140; RP.set([x, y, z, x, y, z], i * 6); RV[i] = 0.7 + Math.random() * 0.6; }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(RP, 3));
      const rmat = new THREE.LineBasicMaterial({ color: 0xd8e2ec, transparent: true, opacity: 0, depthWrite: false });
      const rain = new THREE.LineSegments(rg, rmat); rain.frustumCulled = false; this.scene.add(rain);
      this.stormSys = { pts, P, V, mat, rain, RP, RV, rmat, kind: null };
      // remember the resting shape of the fabric so it can flutter in the wind
      if (this.curtainGeo && !this.curtainBase) this.curtainBase = Float32Array.from(this.curtainGeo.attributes.position.array);
    }

    tickStorm(dt) {
      const S = this.stormSys; if (!S) return;
      const target = this.stormT || 0;
      if (this.storm !== target) { this.storm = reduce ? target : (target > (this.storm || 0) ? Math.min(target, (this.storm || 0) + dt / 1.6) : Math.max(target, (this.storm || 0) - dt / 1.2)); this.applyLighting(false); this.applyPose(); this.emit(); }
      const s = this.storm || 0, c = this.cfg;
      const kind = c.particles === 'dust' ? 'dust' : c.particles === 'snow' ? 'snow' : 'rain';
      if (S.kind !== kind) { S.kind = kind; S.mat.color.setHex(kind === 'dust' ? 0xd9b98a : 0xffffff); S.mat.size = kind === 'dust' ? 0.7 : 0.62; }
      S.pts.visible = s > 0.01 && kind !== 'rain'; S.rain.visible = s > 0.01 && kind === 'rain';
      S.mat.opacity = s * (kind === 'dust' ? 0.55 : 0.95); S.rmat.opacity = s * 0.55;
      this.points.visible = c.particles !== 'none' && s < 0.5;
      if (s <= 0.01) { if (this.curtainBase && this.fluttered) { this.curtainGeo.attributes.position.array.set(this.curtainBase); this.curtainGeo.attributes.position.needsUpdate = true; this.curtainGeo.computeVertexNormals(); this.fluttered = false; } return; }
      const t = this.clock.elapsedTime, wx = kind === 'dust' ? 34 : kind === 'snow' ? 26 : 14, wz = 7;
      const cx = this.camera.position.x * 0.72, cz = this.camera.position.z * 0.72;
      S.pts.position.set(cx, 0, cz); S.rain.position.set(cx, 0, cz);
      if (S.pts.visible) {
        const P = S.P, n = P.length / 3;
        for (let i = 0; i < n; i++) {
          const k = i * 3, v = S.V[i];
          P[k] += dt * wx * v; P[k + 2] += dt * wz * v + Math.sin(t * 2 + i) * dt * 1.5;
          P[k + 1] += kind === 'dust' ? Math.sin(t * 1.3 + i * 0.7) * dt * 2 - dt * 0.6 : -dt * 6 * v;
          if (P[k] > 50) P[k] -= 100; if (P[k + 2] > 50) P[k + 2] -= 100;
          if (P[k + 1] < 0) P[k + 1] = kind === 'dust' ? Math.random() * 20 : 28 + Math.random() * 4;
          if (kind === 'dust' && P[k + 1] > 26) P[k + 1] = Math.random() * 4;
        }
        S.pts.geometry.attributes.position.needsUpdate = true;
      }
      if (S.rain.visible) {
        const RP = S.RP, n = RP.length / 6;
        for (let i = 0; i < n; i++) {
          const k = i * 6, v = S.RV[i];
          RP[k] += dt * wx * v; RP[k + 1] -= dt * 70 * v; RP[k + 2] += dt * wz * v;
          if (RP[k + 1] < 0) { RP[k + 1] = 40 + Math.random() * 6; RP[k] = (Math.random() - 0.5) * 140; RP[k + 2] = (Math.random() - 0.5) * 140; }
          if (RP[k] > 70) RP[k] -= 140; if (RP[k + 2] > 70) RP[k + 2] -= 140;
          RP[k + 3] = RP[k] - wx * 0.035 * v; RP[k + 4] = RP[k + 1] + 70 * 0.035 * v; RP[k + 5] = RP[k + 2] - wz * 0.035 * v;
        }
        S.rain.geometry.attributes.position.needsUpdate = true;
      }
      // wing walls flutter in the gusts
      if (this.curtainBase && !reduce) {
        const pa = this.curtainGeo.attributes.position, B = this.curtainBase, h = this.dims.H, gust = 0.55 + 0.45 * Math.sin(t * 1.7) * Math.sin(t * 0.63 + 1);
        for (let i = 0; i < pa.count; i++) {
          const x = B[i * 3], yy = -B[i * 3 + 1] / h;
          pa.array[i * 3 + 2] = B[i * 3 + 2] + s * gust * 0.16 * Math.sin(x * 0.85 - t * 6.5) * Math.sin(Math.min(1, yy) * PI) * (0.6 + 0.4 * Math.sin(t * 2.3 + x * 0.3));
        }
        pa.needsUpdate = true; this.curtainGeo.computeVertexNormals(); this.fluttered = true;
      }
    }

    equirect(c) {
      const W = 256, H = 128, cv = cvs(W, H), x = cv.getContext('2d');
      const hex = h => '#' + h.toString(16).padStart(6, '0');
      const g = x.createLinearGradient(0, 0, 0, H / 2);
      g.addColorStop(0, hex(c.skyTop)); g.addColorStop(0.75, hex(c.skyMid)); g.addColorStop(1, hex(c.skyBot));
      x.fillStyle = g; x.fillRect(0, 0, W, H / 2);
      const gg = x.createLinearGradient(0, H / 2, 0, H); gg.addColorStop(0, hex(c.ground2)); gg.addColorStop(1, hex(c.ground));
      x.fillStyle = gg; x.fillRect(0, H / 2, W, H / 2);
      // sun glow: equirect u = atan2(dir.x, -dir.z) mapping is handled loosely; a soft blob is enough for reflections
      const u = ((Math.atan2(Math.cos(c.sunAz), -Math.sin(c.sunAz)) / TAU) + 0.5) * W, v = (0.5 - c.sunEl / PI) * H;
      const sg = x.createRadialGradient(u, v, 0, u, v, 40); sg.addColorStop(0, hex(c.sun)); sg.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'lighter'; x.fillStyle = sg; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
      const t = new THREE.CanvasTexture(cv); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; return t;
    }

    deploy(on) { this.pT = on ? 1 : 0; if (!on) { this.eT = 0; this.pendingFit = null; if (this.camMode !== 'orbit') this.exitFitout(); else if (this.fitout) this.setFitout(null); } this.start(); }
    setExtended(on) { this.eT = on ? 1 : 0; if (on && this.pT < 1) this.pT = 1; this.start(); }
    scrub(v) { this.p = this.pT = clamp(v); if (this.p < 1) this.e = this.eT = 0; if (this.p < 0.9 && this.camMode !== 'orbit') this.exitFitout(true); this.applyPose(); this.render(); this.emit(); }
    toggle() { this.deploy(this.pT < 0.5); }

    /* ---------------- intro sweep ---------------- */
    intro(duration = 3.2) {
      if (reduce || this.storyMode) return;
      this.introT = { t: 0, d: duration, az0: this.az + 1.15, el0: 0.42, dist0: this.distT * 2.3, az1: this.az, el1: this.el, k0: 0 };
      this.idle = 0; this.start();
    }

    /* ---------------- fit-outs ---------------- */
    ensureFitout(kind) {
      if (this.fitBuilt[kind] || !window.WH_FITOUTS) return;
      const g = window.WH_FITOUTS.build(kind, this.dims, this);
      g.visible = false; this.fitGroup.add(g); this.fitBuilt[kind] = g;
    }
    setFitout(kind) {
      Object.keys(this.fitBuilt).forEach(k => this.fitBuilt[k].visible = false);
      this.fitout = kind || null;
      if (kind && kind !== 'trecc') { this.ensureFitout(kind); if (this.fitBuilt[kind]) this.fitBuilt[kind].visible = true; }
      this.applyPose(); this.render(); this.emit();
    }
    // TRECC: fly through the personnel door in the core's end wall (CAD interior, no fit-out)
    TRECC_DOOR() { const F = TR.F; return { door: new THREE.Vector3(0, 3.4, -1.15 * F - TR.zc * F), out: new THREE.Vector3(0, 5.2, -22), near: new THREE.Vector3(0, 4.4, -7.5), inside: new THREE.Vector3(-0.4, 4.7, -1.7), look: new THREE.Vector3(5, 3.3, 1.6) }; }
    enterTrecc() {
      if (this.p < 0.995 && this.camMode === 'orbit') { this.pendingFit = 'trecc'; this.pT = 1; this.fitout = 'trecc'; this.start(); this.emit(); return; }
      this.pendingFit = null; this.fitout = 'trecc'; this.closeHotspot();
      if (this.camMode === 'inside') { this.start(); this.emit(); return; }
      const P = this.TRECC_DOOR(), camNow = this.camera.position.clone(), tgtNow = this.target.clone();
      this.fly = {
        t: 0, d: reduce ? 0.01 : 3.2, dir: 1,
        pos: new THREE.CatmullRomCurve3([camNow, P.out, P.near, P.inside]),
        tgt: new THREE.CatmullRomCurve3([tgtNow, P.door.clone(), new THREE.Vector3(1.5, 4.0, 2), P.look]),
        fov0: this.camera.fov, fov1: this.camera.aspect < 1 ? 68 + (1 - this.camera.aspect) * 40 : 68
      };
      this.lookYaw = 0; this.lookPitch = 0;
      this.camMode = 'fly'; this.idle = 0; this.emit(); this.start();
    }
    enterFitout(kind) {
      if (!this.ok || this.storyMode) return;
      this.introT = null;
      if (this.model === 'trecc') return this.enterTrecc();
      // deploy first if needed; the fly-in starts when the walls are down
      if (this.p < 0.995 && this.camMode === 'orbit') { this.pendingFit = kind; this.pT = 1; this.introT = null; this.setFitout(kind); this.start(); this.emit(); return; }
      this.pendingFit = null;
      this.setFitout(kind);
      const f = FITOUTS[kind]; this.eT = f.eh ? 1 : 0;
      if (this.pT < 1) this.pT = 1;
      this.closeHotspot();
      if (this.camMode === 'inside') { this.applyPose(); this.start(); this.emit(); return; }
      const D = this.dims;
      const camNow = this.camera.position.clone(), tgtNow = this.target.clone();
      const door = new THREE.Vector3(-D.L / 2, 5.0, D.doorZ);
      const inside = new THREE.Vector3(-D.L / 2 + 1.7, D.floorTop + 5.6, D.doorZ - 0.1);
      this.fly = {
        t: 0, d: reduce ? 0.01 : 3.0, dir: 1,
        pos: new THREE.CatmullRomCurve3([camNow, new THREE.Vector3(-D.L / 2 - 16, 6.4, D.doorZ + 4), new THREE.Vector3(-D.L / 2 - 2.4, 5.6, D.doorZ), inside]),
        tgt: new THREE.CatmullRomCurve3([tgtNow, door.clone(), new THREE.Vector3(-D.L / 2 + 6, 4.6, D.doorZ), new THREE.Vector3(4, 2.9, 0.6)]),
        fov0: this.camera.fov, fov1: this.camera.aspect < 1 ? 64 + (1 - this.camera.aspect) * 40 : 64
      };
      this.lookYaw = 0; this.lookPitch = 0;
      this.camMode = 'fly'; this.idle = 0; this.emit(); this.start();
    }
    exitFitout(instant) {
      this.pendingFit = null;
      if (this.camMode === 'orbit') { this.setFitout(null); return; }
      const D = this.dims;
      if (instant || reduce) {
        this.camMode = 'orbit'; this.fly = null; this.doorOpen = 0; this.camera.fov = 30; this.camera.updateProjectionMatrix(); this.applyViewOffset(1);
        this.target.set(0, 4.6, 0); this.setFitout(null); this.emit(); this.start(); return;
      }
      const camNow = this.camera.position.clone(), tgtNow = this.lookTarget ? this.lookTarget.clone() : this.target.clone();
      const ce = Math.cos(this.el), endPos = new THREE.Vector3(Math.sin(this.az) * ce * this.distT, Math.sin(this.el) * this.distT + this.target.y, Math.cos(this.az) * ce * this.distT);
      if (this.model === 'trecc') {
        const P = this.TRECC_DOOR();
        this.fly = { t: 0, d: 2.6, dir: -1, pos: new THREE.CatmullRomCurve3([camNow, P.near, P.out, endPos]), tgt: new THREE.CatmullRomCurve3([tgtNow, new THREE.Vector3(0, 4.4, -12), P.door.clone(), this.target.clone()]), fov0: this.camera.fov, fov1: 30 };
        this.camMode = 'fly'; this.emit(); this.start(); return;
      }
      this.fly = {
        t: 0, d: 2.4, dir: -1,
        pos: new THREE.CatmullRomCurve3([camNow, new THREE.Vector3(-D.L / 2 - 2.4, 5.6, D.doorZ), new THREE.Vector3(-D.L / 2 - 16, 6.4, D.doorZ + 4), endPos]),
        tgt: new THREE.CatmullRomCurve3([tgtNow, new THREE.Vector3(-D.L / 2 - 6, 5, D.doorZ), new THREE.Vector3(-D.L / 2, 5, D.doorZ), new THREE.Vector3(0, 4.6, 0)]),
        fov0: this.camera.fov, fov1: 30
      };
      this.camMode = 'fly'; this.emit(); this.start();
    }

    /* ---------------- other products: Series 4 and HERCon (illustrative proportions) ---------------- */
    setModel(kind) {
      if (!this.ok || this.storyMode) return;
      kind = kind || 'mecc';
      if (this.campMode) this.setCamp(null);
      if (this.camMode !== 'orbit') this.exitFitout(true);
      if (kind !== 'mecc' && this.fitout) this.setFitout(null);
      if (kind === 'trecc' && this.tr && this.tr.failed) kind = 'mecc';
      this.model = kind;
      if (kind === 'series4' && !this.s4) this.buildSeries4();
      this.lastHeavy = performance.now();
      if (kind === 'hercon' && !this.hc) this.buildHercon();
      if (kind === 'trecc' && !this.tr) this.buildTrecc().catch(() => { });
      this.unit.visible = kind === 'mecc';
      if (this.s4) this.s4.group.visible = kind === 'series4';
      if (this.hc) this.hc.group.visible = kind === 'hercon';
      if (this.tr) this.tr.group.visible = kind === 'trecc' && this.tr.loaded;
      if (kind !== 'mecc') { this.e = this.eT = 0; }
      if (kind !== 'trecc') { this.xray = this.xrayT = 0; this.applyXray(); }
      this.target.y = kind === 'series4' ? 5 : kind === 'trecc' ? 3.4 : 4.6;
      if (this.container) this.resize();
      this.renderer.domElement.setAttribute('aria-label', ({ trecc: 'Interactive 3D model of a TRECC expandable container, from Weatherhaven CAD. Drag to rotate.', series4: 'Interactive 3D model of a Series 4 softwall shelter. Drag to rotate.', hercon: 'Interactive 3D model of a HERCon expandable container. Drag to rotate.' })[kind] || 'Interactive 3D model of a MECC expandable container. Drag to rotate.');
      this.closeHotspot(); this.applyPose(); this.emit(); this.render();
    }
    // paint colours that follow the climate
    modelMaterials() {
      if (this.mm) return this.mm;
      const T = this.tex, rep = (t, r) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(r, r); return c; };
      const M = this.mm = {
        roof: new THREE.MeshStandardMaterial({ color: 0xffffff, map: rep(T.fabric.map, 1 / 10), normalMap: rep(T.fabric.normal, 1 / 10), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
        wall: new THREE.MeshStandardMaterial({ color: 0xffffff, map: rep(T.fabric.map, 1 / 6), normalMap: rep(T.fabric.normal, 1 / 6), roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
        tube: new THREE.MeshStandardMaterial({ color: LIN(0xb9bec4), roughness: 0.35, metalness: 0.8 }),
        panel: new THREE.MeshStandardMaterial({ color: 0xffffff, map: rep(T.steel.map, 1 / 8), normalMap: rep(T.steel.normal, 1 / 8), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide, envMapIntensity: 0.8 }),
        trim: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.3 }),
        dark: this.mat.dark, glass: new THREE.MeshStandardMaterial({ color: LIN(0x1a242d), roughness: 0.12, metalness: 0.2, emissive: 0xffffff, emissiveMap: this.mat.glass.emissiveMap, emissiveIntensity: 0 }),
        case: new THREE.MeshStandardMaterial({ color: LIN(0x4d5338), roughness: 0.75 })
      };
      const PANEL = { arctic: 0xeceeea, desert: 0xcbab7c, temperate: 0xb4ac8a, tropical: 0xeceeea, dusk: 0xcbab7c };
      const tint = c => {
        M.roof.color.copy(LIN(c.fabric)); M.wall.color.copy(LIN(c.terrain === 'mountains' ? 0x6c7a5c : c.frame || c.fabric)).multiplyScalar(c.terrain === 'mountains' ? 1 : 0.9);
        M.panel.color.copy(LIN(PANEL[this.climate] || 0xd8d4c8)); M.trim.color.copy(LIN(c.steel));
      };
      (this.campMats = this.campMats || []).push(tint); tint(this.cfg);
      return M;
    }
    lightsFor(o, M) {
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color: 0xffc27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      lamp.scale.set(3, 3, 1); o.add(lamp); return lamp;
    }
    // Series 4: tensioned steel arches (1.9" O.D. tubing, published) under a fabric cover; size illustrative
    buildSeries4() {
      const M = this.modelMaterials(), g = new THREE.Group(); this.scene.add(g);
      const W = 20, Hh = 11.5, Lw = 4, L = 32, nA = 9, R = 0.08;
      // profile across the width: vertical lower walls, then a superelliptic arch
      const prof = [];
      for (let i = 0; i <= 6; i++) prof.push([W / 2, Lw * i / 6, 'w']);
      for (let i = 1; i < 40; i++) { const a = i / 40 * PI, c = Math.cos(a), sn = Math.sin(a); prof.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.4) * W / 2, Lw + Math.pow(sn, 2 / 2.4) * (Hh - Lw), 'r']); }
      for (let i = 6; i >= 0; i--) prof.push([-W / 2, Lw * i / 6, 'w']);
      const curve = new THREE.CatmullRomCurve3(prof.map(p => new THREE.Vector3(0, p[1], p[0])));
      const arcG = new THREE.TubeGeometry(curve, 90, R, 6, false);
      const arches = [];
      for (let i = 0; i < nA; i++) { const x = -L / 2 + i * L / (nA - 1), a = new THREE.Group(); a.position.set(x, 0, 0); g.add(a); mk(arcG, M.tube, 0, 0, 0, a); arches.push(a); }
      // fabric cover: profile swept along the length, sagging slightly between arches
      const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), L / 2);
      [M.roof, M.wall].forEach(m => { m.clippingPlanes = [clip]; m.clipShadows = true; });
      const shell = part => {
        const pts = prof.map((p, j) => ({ p, j })).filter(o => part === 'r' ? o.p[2] === 'r' || (o.p[2] === 'w' && o.p[1] >= Lw - 1e-6) : o.p[2] === 'w');
        const side = part === 'w' ? [pts.filter(o => o.p[0] > 0), pts.filter(o => o.p[0] < 0)] : [pts];
        const geos = side.map(list => {
          const nx = 64, pos = [], uv = [], idx = [];
          let acc = 0; const arc = list.map((o, k) => { if (k) acc += Math.hypot(o.p[0] - list[k - 1].p[0], o.p[1] - list[k - 1].p[1]); return acc; });
          for (let k = 0; k <= nx; k++) {
            const x = -L / 2 + L * k / nx, f = (k / nx * (nA - 1)) % 1, sag = 0.16 * Math.pow(Math.sin(f * PI), 2);
            list.forEach((o, j) => { const [z, y] = o.p, len = Math.hypot(z, y - Lw * 0.6) || 1, kk = o.p[2] === 'r' ? sag : sag * 0.5 * (y / Lw); pos.push(x, y - kk * (y - Lw * 0.6) / len, z - kk * z / len); uv.push(x, arc[j]); });
          }
          const m = list.length;
          for (let k = 0; k < nx; k++) for (let j = 0; j < m - 1; j++) { const a = k * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
          const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
          return geo;
        });
        return geos.map(geo => mk(geo, part === 'r' ? M.roof : M.wall, 0, 0, 0, g));
      };
      const cover = [...shell('r'), ...shell('w')];
      // end walls with a door and a window
      const sh = new THREE.Shape(); prof.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.closePath();
      const endG = new THREE.ShapeGeometry(sh, 20);
      const ends = [];
      const endMat = M.roof.clone(); endMat.clippingPlanes = []; endMat.map = M.roof.map; this.mm.endMat = endMat;
      (this.campMats).push(c => endMat.color.copy(LIN(c.fabric)).multiplyScalar(0.96));
      endMat.color.copy(M.roof.color).multiplyScalar(0.96);
      [-1, 1].forEach(sx => {
        const e = new THREE.Group(); e.position.set(sx * (L / 2 + 0.05), 0, 0); g.add(e);
        const m = mk(endG, endMat, 0, 0, 0, e); m.rotation.y = sx * PI / 2;
        box(0.14, 7, 3.4, M.dark, sx * 0.08, 3.5, 2.6, e); box(0.16, 0.25, 3.8, M.tube, sx * 0.09, 7.1, 2.6, e);
        const win = mk(new THREE.PlaneGeometry(2.4, 1.6), M.glass, sx * 0.1, 6.2, -4.2, e, false); win.rotation.y = sx * PI / 2;
        ends.push(e);
      });
      const lamp = this.lightsFor(ends[1], M); lamp.position.set(0.5, 7.6, 2.6);
      // packed: crated on pallets
      const cases = new THREE.Group(); g.add(cases);
      [[-3, 0], [0.5, 0], [4, 0], [-1.2, 3.4], [2.4, 3.4]].forEach(([x, z], i) => box(3.2, i < 3 ? 2.4 : 2, 2.8, M.case, x, (i < 3 ? 2.4 : 2) / 2 + 0.1, z - 1.6, cases));
      [-1, 1].forEach(s => box(L + 0.4, 0.2, 0.5, M.tube, 0, 0.1, s * W / 2, g));
      const ao = mk(new THREE.PlaneGeometry(L + 4, W + 4), this.mat.ao, 0, 0.05, 0, g, false, false); ao.rotation.x = -PI / 2; ao.renderOrder = -1;
      g.traverse(o => { if (o.isMesh && o.material !== this.mat.ao) { o.castShadow = true; o.receiveShadow = true; } });
      this.s4 = { group: g, arches, cover, ends, cases, clip, lamp, L, win: ends.map(e => e.children.find(c => c.material === M.glass)) };
    }
    poseSeries4() {
      const S = this.s4, p = this.p, L = S.L;
      const c = 1 - ease(seg(p, 0.04, 0.14)); S.cases.visible = c > 0.01; S.cases.scale.set(1, Math.max(0.01, c), 1);
      S.arches.forEach((a, i) => { const k = ease(seg(p, 0.1 + i * 0.035, 0.27 + i * 0.035)); a.visible = p > 0.06; a.rotation.z = -(PI / 2) * (1 - k); });
      const s = ease(seg(p, 0.46, 0.84)); S.clip.constant = lerp(-L / 2 - 0.6, L / 2 + 0.6, s); S.cover.forEach(m => m.visible = s > 0.002);
      const e = ease(seg(p, 0.8, 0.94)); S.ends.forEach(o => { o.visible = e > 0.01; o.scale.set(1, Math.max(0.01, e), 1); });
      const cfg = this.look || this.cfg, night = Math.max(cfg.glow, 2.4 * (this.storm || 0)), on = seg(p, 0.94, 1);
      this.mm.glass.emissiveIntensity = night * on * 0.55; S.lamp.material.opacity = Math.min(1, Math.max(cfg.lamp, this.storm || 0) * 0.85) * on;
    }
    // HERCon: two 4' units ship coupled as one 8' container, then deploy separately (published); fold-out panels illustrative
    buildHercon() {
      const M = this.modelMaterials(), g = new THREE.Group(); this.scene.add(g);
      const L = 20, H = 8, CW = 4, WG = 7.5, units = [];
      [-1, 1].forEach(side => {
        const u = new THREE.Group(); g.add(u); u.userData.side = side;
        // core: one 4'-wide container
        box(L, H, CW, M.trim, 0, H / 2, 0, u);
        [-1, 1].forEach(sx => [-1, 1].forEach(sz => box(0.45, H, 0.45, M.dark, sx * (L / 2 - 0.2), H / 2, sz * (CW / 2 - 0.2), u)));
        const wings = [];
        [-1, 1].forEach(s => {
          // floor panel: hinged at the core's bottom edge
          const fp = new THREE.Group(); fp.position.set(0, 0.45, s * CW / 2); u.add(fp);
          box(L - 0.2, 0.3, WG, M.panel, 0, 0.15, s * WG / 2, fp);
          box(L - 0.2, 0.12, WG - 0.2, this.mat.plate, 0, 0.32, s * WG / 2, fp, false);
          // outer wall: hinged at the floor panel's outer edge
          const wp = new THREE.Group(); wp.position.set(0, 0.3, s * WG); fp.add(wp);
          box(L - 0.2, H - 0.75, 0.25, M.panel, 0, (H - 0.75) / 2, 0, wp);
          [-5, 5].forEach(x => { const w = mk(new THREE.PlaneGeometry(2.6, 1.7), M.glass, x, 4.4, s * 0.14, wp, false); if (s < 0) w.rotation.y = PI; box(2.9, 0.18, 0.3, M.trim, x, 5.35, 0, wp); });
          // roof panel: hinged at the core's top edge
          const rp = new THREE.Group(); rp.position.set(0, H, s * CW / 2); u.add(rp);
          box(L, 0.3, WG + 0.15, M.panel, 0, -0.15, s * (WG + 0.15) / 2, rp);
          // end panels: swing out from the core corners
          const ends = [-1, 1].map(sx => {
            const ep = new THREE.Group(); ep.position.set(sx * (L / 2 - 0.12), 0.75, s * CW / 2); u.add(ep);
            box(0.22, H - 0.75, WG, M.panel, 0, (H - 0.75) / 2, s * WG / 2, ep);
            if (sx < 0 && s * side > 0) { box(0.3, 6.6, 3, M.dark, -0.05, 3.3, s * 4.6, ep); }
            return ep;
          });
          wings.push({ s, fp, wp, rp, ends });
        });
        units.push({ u, side, wings });
      });
      const lamp = this.lightsFor(units[1].wings[1].ends[0], M); lamp.position.set(-0.6, 7.0, 4.6);
      const ao = mk(new THREE.PlaneGeometry(L + 6, 60), this.mat.ao, 0, 0.05, 0, g, false, false); ao.rotation.x = -PI / 2; ao.renderOrder = -1; this.hcAo = ao;
      g.traverse(o => { if (o.isMesh && o.material !== this.mat.ao) { o.castShadow = true; o.receiveShadow = true; } });
      this.hc = { group: g, units, lamp, WG, CW };
    }
    poseHercon() {
      const C = this.hc, p = this.p, sep = ease(seg(p, 0.02, 0.22)), u = seg(p, 0.22, 1);
      C.units.forEach(U => {
        U.u.position.z = U.side * lerp(C.CW / 2, C.CW / 2 + C.WG + 3, sep);
        U.wings.forEach(W => {
          // floor folds down, roof swings up from inside, wall rises to meet it, ends close
          const s = W.s, f = ease(seg(u, 0, 0.3)), r = ease(seg(u, 0.28, 0.55)), w = ease(seg(u, 0.52, 0.78)), e = ease(seg(u, 0.76, 0.96));
          W.fp.rotation.x = -s * (PI / 2) * (1 - f);
          W.wp.rotation.x = -s * (PI / 2) * (1 - w);
          W.rp.rotation.x = s * (PI / 2) * (1 - r);
          W.ends.forEach((ep, i) => { const sx = i ? 1 : -1; ep.rotation.y = -sx * s * (PI / 2) * (1 - e); ep.visible = u > 0.02; });
          W.wp.visible = W.fp.visible = W.rp.visible = true;
        });
      });
      this.hcAo.scale.set(1, lerp(0.15, 1, sep), 1);
      const cfg = this.look || this.cfg, night = Math.max(cfg.glow, 2.4 * (this.storm || 0)), on = seg(p, 0.95, 1);
      this.mm.glass.emissiveIntensity = night * on * 0.55; C.lamp.material.opacity = Math.min(1, Math.max(cfg.lamp, this.storm || 0) * 0.85) * on;
    }

    // TRECC from Weatherhaven's CAD (see loadTrecc). Resolves when the model is on screen.
    buildTrecc() {
      if (this.tr) return this.tr.ready;
      const g = new THREE.Group(); g.visible = false; this.scene.add(g);
      const FT = this.trFab || (this.trFab = trFabricTextures()), an = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      [FT.weave, FT.wrinkle, FT.tone].forEach(t => { t.anisotropy = an; });
      const U = { uRise: { value: 0 }, uSpread: { value: 0 }, uXW: { value: TR.XW }, uYS: { value: TR.YS }, uDH: { value: TR.DH }, uDis: { value: 0 }, uGlow: { value: new THREE.Color(0xcfe9ff) }, uHole: { value: new THREE.Vector4(0, 1.05, -1.15, 0) },
        tWeave: { value: FT.weave }, tWrinkle: { value: FT.wrinkle }, tTone: { value: FT.tone } };
      const T = this.tr = { group: g, U, loaded: false, failed: false, paints: [] };
      T.ready = loadTrecc().then(A => {
        const depthMats = {};
        const depthFor = (deform, sign) => { const k = deform + '' + sign; if (!depthMats[k]) { const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); patchTrecc(d, U, deform, sign, true); depthMats[k] = d; } return depthMats[k]; };
        const prep = (src, deform, sign) => {
          const root = src.clone(true), cache = new Map();
          root.traverse(o => {
            if (!o.isMesh) return;
            let m = cache.get(o.material);
            if (!m) {
              m = o.material.clone(); m.flatShading = !o.geometry.attributes.normal; m.side = THREE.DoubleSide; m.metalness = 0; m.envMapIntensity = 0.55;
              patchTrecc(m, U, deform, sign, false, deform && m.name === 'paint'); cache.set(o.material, m);
              if (/^paint/.test(m.name)) T.paints.push(m);
            }
            o.material = m; o.castShadow = o.receiveShadow = true; o.customDepthMaterial = depthFor(deform, sign);
          });
          root.scale.setScalar(TR.F); root.position.z = -TR.zc * TR.F; g.add(root);
          return root;
        };
        T.open = prep(A.open, true, 1); T.stowed = prep(A.stowed, false, -1);
        const ao = mk(new THREE.PlaneGeometry(1, 1), this.mat.ao, 0, 0.04, 0, g, false, false); ao.rotation.x = -PI / 2; ao.renderOrder = -1; T.ao = ao;
        // site lighting for night scenes (not part of the CAD)
        T.light = new THREE.PointLight(0xffd29a, 0, 40, 2); T.light.position.set(1.5, 9.5, 8); g.add(T.light);
        T.inLight = new THREE.PointLight(0xfff4e4, 0, 30, 2); T.inLight.position.set(0, 7.2, 0); g.add(T.inLight);
        T.loaded = true;
        this.paintTrecc();
        if (this.model === 'trecc' && !this.campMode) g.visible = true;
        this.applyPose(); this.emit(); this.render();
      }).catch(err => {
        T.failed = true;
        if (this.model === 'trecc') this.setModel('mecc');
        throw err;
      });
      return T.ready;
    }
    // section cut through the TRECC: 0 = whole, 1 = cut past the centre (near side removed)
    setXray(v) { this.xrayT = clamp(v); this.start(); this.emit(); }
    applyXray() {
      const T = this.tr; if (!T || !T.loaded) return;
      const xr = this.xray || 0;
      if (!T.clip) { T.clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e4); const mats = new Set(); T.group.traverse(o => { if (o.isMesh && o.material && o.material.name !== undefined) mats.add(o.material); }); mats.forEach(m => { if (m !== this.mat.ao) { m.clippingPlanes = [T.clip]; m.clipShadows = true; } }); }
      T.clip.constant = xr <= 0.001 ? 1e4 : lerp(4.6, -0.6, xr);
    }
    paintKey() { return this.trPaint || TRECC_AUTO[this.climate] || 'green'; }
    setPaint(k) { this.trPaint = TRECC_PAINT[k] ? k : null; this.paintTrecc(); this.start(); this.render(); this.emit(); }
    paintTrecc() {
      const T = this.tr; if (!T || !T.loaded) return;
      const c = TRECC_PAINT[this.paintKey()];
      T.paints.forEach(m => m.color.copy(LIN(m.name === 'paint2' ? c[1] : c[0])));
    }
    whenModel() { return this.tr && this.model === 'trecc' ? this.tr.ready : Promise.resolve(); }
    poseTrecc() {
      const T = this.tr; if (!T || !T.loaded) return;
      const p = this.p, dis = ease(seg(p, 0.05, 0.27)), rise = ease(seg(p, 0.26, 0.58)), spread = ease(seg(p, 0.5, 0.93));
      T.U.uDis.value = dis; T.U.uRise.value = rise; T.U.uSpread.value = spread;
      T.stowed.visible = dis < 0.999; T.open.visible = dis > 0.001;
      const w = lerp(TR.wS, TR.wO, spread) * 2 * TR.F; T.ao.scale.set(w + 3.5, 2.4 * TR.F + 3.5, 1);
      const cfg = this.look || this.cfg, on = seg(p, 0.93, 1), lamp = Math.max(cfg.lamp, this.storm || 0, cfg.glow > 1 ? 0.6 : 0);
      T.light.intensity = lamp * 1.4 * on;
      T.inLight.intensity = this.camMode !== 'orbit' ? 1.3 : 0;
      this.trState = { height: lerp(5, 8, rise), mult: lerp(1, 3, spread) };
    }

    /* ---------------- camp mode: a planned layout of several shelters ---------------- */
    setShadowExt(e) { const sc = this.sun.shadow.camera; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.updateProjectionMatrix(); }
    reshape() { const c = this.cfg; this.shapeTerrain(c.terrain, c.ground, c.ground2); this.buildTrees(c.trees); }
    // a deployed MECC (e = 0) or EHMECC (e = 1), stripped of lights and interiors, to instance around a camp
    makeTemplate(e) {
      const keep = { p: this.p, pT: this.pT, e: this.e, eT: this.eT, door: this.doorOpen || 0 };
      this.p = this.pT = 1; this.e = this.eT = e; this.doorOpen = 0; this.applyPose();
      const c = this.unit.clone(true);
      Object.assign(this, { p: keep.p, pT: keep.pT, e: keep.e, eT: keep.eT, doorOpen: keep.door }); this.applyPose();
      const drop = [];
      c.traverse(o => {
        if (o.isLight || o.name === 'fitGroup' || (o.isObject3D && o.type === 'Object3D' && o.parent && o.parent.isSpotLight)) drop.push(o);
        else if (o.isMesh && o.geometry === BOX && o.scale.x * o.scale.y * o.scale.z < 0.03) drop.push(o);
      });
      drop.forEach(o => o.parent && o.parent.remove(o));
      c.position.set(0, 0, 0); c.visible = true;
      return c;
    }
    campMaterials() {
      if (this.campM) return this.campM;
      const T = this.tex, fab = (rep) => { const m = T.fabric.map.clone(); m.needsUpdate = true; m.repeat.set(rep, rep); const n = T.fabric.normal.clone(); n.needsUpdate = true; n.repeat.set(rep, rep); return [m, n]; };
      const [tm, tn] = fab(1 / 16), [cm, cn] = fab(1 / 8);
      const M = this.campM = {
        tent: new THREE.MeshStandardMaterial({ color: 0xffffff, map: tm, normalMap: tn, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.92, envMapIntensity: 0.5 }),
        rib: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, envMapIntensity: 0.4 }),
        conn: new THREE.MeshStandardMaterial({ color: 0xffffff, map: cm, normalMap: cn, roughness: 0.92, envMapIntensity: 0.5 }),
        pvc: new THREE.MeshStandardMaterial({ color: LIN(0xe6e8e3), map: cm, roughness: 0.9, envMapIntensity: 0.5 }),
        door: new THREE.MeshStandardMaterial({ color: LIN(0x2b3036), roughness: 0.6, metalness: 0.3 })
      };
      const tint = c => { M.tent.color.copy(LIN(c.fabric)); M.rib.color.copy(LIN(c.fabric)).multiplyScalar(0.72); M.conn.color.copy(LIN(c.fabric)).multiplyScalar(0.88); };
      (this.campMats = this.campMats || []).push(tint); tint(this.cfg);
      return M;
    }
    // softwall arch shelter (Series 8, MEX-26): published width, illustrative height and profile
    archModel(len, width, height) {
      const M = this.campMaterials(), g = new THREE.Group(), n = 2.6, sh = new THREE.Shape();
      for (let i = 0; i <= 40; i++) { const a = i / 40 * PI, cx = Math.cos(a), sy = Math.sin(a); const x = Math.sign(cx) * Math.pow(Math.abs(cx), 2 / n) * width / 2, y = Math.pow(Math.abs(sy), 2 / n) * height; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
      sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 40 }); geo.rotateY(PI / 2); geo.translate(-len / 2, 0, 0);
      const m = mk(geo, M.tent, 0, 0, 0, g); m.userData.own = true;
      const ribG = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false, curveSegments: 40 }); ribG.rotateY(PI / 2); ribG.scale(1, 1.012, 1.012);
      for (let x = -len / 2 + 0.4; x <= len / 2 - 0.3; x += Math.max(4, len / Math.round(len / 5))) { const r = mk(ribG, M.rib, x, 0, 0, g); }
      [-1, 1].forEach(sx => { const d = box(0.12, Math.min(7.2, height * 0.62), Math.min(5, width * 0.28), M.door, sx * (len / 2 + 0.04), Math.min(7.2, height * 0.62) / 2, 0, g); });
      const ao = mk(new THREE.PlaneGeometry(len + 3, width + 3), this.mat.ao, 0, 0.05, 0, g, false, false); ao.rotation.x = -PI / 2; ao.renderOrder = -1;
      return g;
    }
    // ATEPS: aluminium core on one 463L pallet, PVC-covered expansions either side (104" × 244" deployed, 91" high)
    atepsModel() {
      const M = this.campMaterials(), g = new THREE.Group(), L = 104 / 12, W = 244 / 12, C = 84 / 12, H = 91 / 12;
      box(L, H, C, this.mat.alu, 0, H / 2, 0, g);
      [-1, 1].forEach(s => { box(L - 0.12, H - 0.45, (W - C) / 2, M.pvc, 0, (H - 0.45) / 2, s * (C / 2 + (W - C) / 4), g); box(0.1, 6.4, 2.8, M.door, -L / 2 - 0.02, 3.4, s * (C / 2 + (W - C) / 4), g); });
      const ao = mk(new THREE.PlaneGeometry(L + 3, W + 3), this.mat.ao, 0, 0.05, 0, g, false, false); ao.rotation.x = -PI / 2; ao.renderOrder = -1;
      return g;
    }
    connModel(a, b) {
      const M = this.campMaterials(), g = new THREE.Group(), h = 7;
      mk(rboxGeo(a, h, b, 0.3, 2), M.conn, 0, h / 2, 0, g);
      return g;
    }
    // items: [{ t, x, y, r, a, b }] in feet, plan centre coordinates; a along x and b along y before rotation
    setCamp(items) {
      if (!this.ok || this.storyMode) return;
      if (this.campGroup) { this.scene.remove(this.campGroup); this.campGroup.traverse(o => { if (o.userData && o.userData.own && o.geometry) o.geometry.dispose(); }); this.campGroup = null; }
      if (!items || !items.length) {
        if (this.campMode) {
          this.campMode = false; this.unit.visible = (this.model || 'mecc') === 'mecc'; if (this.s4) this.s4.group.visible = this.model === 'series4'; if (this.hc) this.hc.group.visible = this.model === 'hercon'; if (this.tr) this.tr.group.visible = this.model === 'trecc' && this.tr.loaded; this.flatR = null; this.padHalf = null; this.setShadowExt(42); this.reshape();
          this.az = -0.72; this.el = 0.14; this.baseDist = this.preCampDist || 72; this.resize();
        }
        this.emit(); this.render(); return;
      }
      if (this.camMode !== 'orbit') this.exitFitout(true);
      this.closeHotspot(); this.introT = null;
      if (!this.campMode) this.preCampDist = this.baseDist;
      this.campMode = true; this.p = this.pT = 1; this.e = this.eT = 0; this.applyPose(); this.unit.visible = false; if (this.s4) this.s4.group.visible = false; if (this.hc) this.hc.group.visible = false; if (this.tr) this.tr.group.visible = false;
      const tpl = this.campTemplates || (this.campTemplates = {});
      if (!tpl.mecc) tpl.mecc = this.makeTemplate(0);
      if (!tpl.ehmecc) tpl.ehmecc = this.makeTemplate(1);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      items.forEach(it => { const rot = (it.r || 0) % 180 !== 0, w = rot ? it.b : it.a, h = rot ? it.a : it.b; x0 = Math.min(x0, it.x - w / 2); x1 = Math.max(x1, it.x + w / 2); y0 = Math.min(y0, it.y - h / 2); y1 = Math.max(y1, it.y + h / 2); });
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, group = new THREE.Group();
      items.forEach(it => {
        let o;
        if (it.t === 'mecc' || it.t === 'ehmecc') o = tpl[it.t].clone(true);
        else if (it.t === 'ateps') o = this.atepsModel();
        else if (it.t === 'series8') o = this.archModel(it.a, it.b, 9.6);
        else if (it.t === 'mex26') o = this.archModel(it.a, it.b, 16);
        else o = this.connModel(it.a, it.b);
        o.position.set(it.x - cx, 0, it.y - cy); o.rotation.y = -(it.r || 0) * PI / 180;
        o.traverse(m => { if (m.isMesh && m.material !== this.mat.ao && m.material !== this.mat.hole) { m.castShadow = true; m.receiveShadow = true; } });
        group.add(o);
      });
      this.campGroup = group; this.scene.add(group);
      const R = Math.hypot((x1 - x0) / 2, (y1 - y0) / 2);
      this.flatR = Math.max(40, R + 16); this.padHalf = [(x1 - x0) / 2 + 7, (y1 - y0) / 2 + 7]; this.reshape();
      this.setShadowExt(Math.max(42, R + 16));
      this.baseDist = clamp(R * 2.55 + 30, 64, 280); this.resize(); this.dist = this.distT;
      this.el = 0.27; this.az = -0.72; this.idle = 0;
      this.emit(); this.start(); this.render();
    }

    /* ---------------- story (scroll-driven) ---------------- */
    // rough-terrain forklift for the TRECC story (illustrative; the TRECC has forklift pockets). Faces +z.
    buildForklift() {
      const g = new THREE.Group(); this.scene.add(g); this.forklift = g; g.visible = false;
      const olive = new THREE.MeshStandardMaterial({ color: LIN(0x5a6142), roughness: 0.7, metalness: 0.15, envMapIntensity: 0.7 });
      const black = new THREE.MeshStandardMaterial({ color: LIN(0x16181a), roughness: 0.6, metalness: 0.3 });
      const steel = new THREE.MeshStandardMaterial({ color: LIN(0x8a8f94), roughness: 0.4, metalness: 0.7 });
      const rubber = new THREE.MeshStandardMaterial({ color: LIN(0x1a1b1c), roughness: 0.9, bumpMap: treadTexture(), bumpScale: 0.08 });
      mk(rboxGeo(4.2, 2.4, 5.4, 0.25, 2), olive, 0, 2.3, -0.9, g);           // body
      mk(rboxGeo(4.4, 2.6, 1.8, 0.3, 2), olive, 0, 2.1, -4.2, g);            // counterweight
      box(1.7, 0.3, 1.4, black, 0, 3.6, -1.6, g); box(1.7, 1.5, 0.25, black, 0, 4.4, -2.35, g); // seat
      box(0.12, 1.4, 0.12, black, 0, 4.2, 0.2, g); mk(new THREE.TorusGeometry(0.55, 0.06, 8, 24), black, 0, 4.95, 0.2, g).rotation.x = PI / 2 - 0.5; // wheel
      [-1, 1].forEach(sx => { box(0.16, 4.6, 0.16, black, sx * 1.9, 5.8, 0.4, g); box(0.16, 4.6, 0.16, black, sx * 1.9, 5.8, -3.2, g); });
      box(4.1, 0.12, 4.0, black, 0, 8.1, -1.4, g);                           // overhead guard
      for (let i = 0; i < 5; i++) box(0.08, 0.08, 4.0, black, -1.6 + i * 0.8, 8.18, -1.4, g, false);
      [-1, 1].forEach(sx => box(0.3, 9.4, 0.5, steel, sx * 1.55, 4.7, 2.1, g)); // mast
      box(3.4, 0.25, 0.3, steel, 0, 9.3, 2.1, g);
      const car = new THREE.Group(); g.add(car); this.forkCar = car;          // carriage + forks
      box(3.5, 1.5, 0.22, steel, 0, 0, 2.4, car);
      [-1, 1].forEach(sx => { box(0.4, 1.6, 0.2, steel, sx * 1.1, -0.1, 2.56, car); box(0.4, 0.18, 6.2, steel, sx * 1.1, -0.61, 2.56 + 3.1, car); });
      const tireG = new THREE.CylinderGeometry(1, 1, 1, 28); tireG.rotateZ(PI / 2);
      this.forkWheels = [];
      [[1.1, 1.35, 0.95], [-3.3, 1.15, 0.8]].forEach(([z, r, w]) => [-1, 1].forEach(sx => {
        const t = mk(tireG, rubber, sx * 2.0, r, z, g); t.scale.set(w, r, r); this.forkWheels.push([t, r]);
        const rim = mk(tireG, olive, sx * 2.0, r, z, g); rim.scale.set(w + 0.04, r * 0.55, r * 0.55);
      }));
      const ao = mk(new THREE.PlaneGeometry(6, 10), this.mat.ao, 0, 0.05, -0.5, g, false, false); ao.rotation.x = -PI / 2;
      g.traverse(o => { if (o.isMesh && o !== ao) o.castShadow = true; });
    }
    // TRECC delivery: truck arrives, the waiting forklift lifts the unit off the deck, sets it on the pad and clears; then it deploys
    setStoryTrecc(T) {
      const arrive = easeOut(seg(T, 0.0, 0.18)), approach = ease(seg(T, 0.17, 0.25)), lift = ease(seg(T, 0.25, 0.28));
      const back = ease(seg(T, 0.28, 0.37)), leave = easeIn(seg(T, 0.30, 0.43)), lower = ease(seg(T, 0.37, 0.44));
      const unfork = ease(seg(T, 0.45, 0.50)), turn = ease(seg(T, 0.50, 0.56)), drive = easeIn(seg(T, 0.56, 0.68));
      const bed = 4.3, TZ = 12, FZ0 = -22, FZ1 = 5.6, FZ2 = FZ1 - TZ;
      this.truckX = lerp(-150, 0, arrive) + leave * 150;
      this.truck.position.set(this.truckX, 0, TZ);
      const fl = this.forklift, carried = T >= 0.25 && T < 0.44;
      // forks out, swing to face -x, drive off
      const fz = T < 0.28 ? lerp(FZ0, FZ1, approach) : T < 0.45 ? lerp(FZ1, FZ2, back) : lerp(FZ2, FZ2 - 8, unfork);
      const forkTop = T < 0.37 ? bed + lift * 0.55 : lerp(bed + 0.55, 0.25, lower);
      fl.position.set(-2 - drive * 110, 0, fz); fl.rotation.y = -PI / 2 * turn; fl.visible = T > 0.02 && T < 0.69;
      this.forkCar.position.y = forkTop + 0.52;
      const dist = fz - drive * 110, dd = dist - (this.lastForkD == null ? dist : this.lastForkD); this.lastForkD = dist;
      this.forkWheels.forEach(([w, r]) => { w.rotation.x += dd / r; });
      const G = this.tr.group;
      if (T < 0.25) G.position.set(this.truckX - 2, bed, TZ);
      else if (carried) G.position.set(-2, forkTop, fz + 6.4);
      else G.position.set(-2, lerp(forkTop, 0, seg(T, 0.44, 0.45)), 0);
      if (this.tr.ao) this.tr.ao.visible = G.position.y < 0.3;
      this.p = this.pT = ease(seg(T, 0.54, 0.95));
      this.headMat.emissiveIntensity = 2.2 * (T < 0.46 ? 1 : 0);
      if (!this.storyCamT) {
        const K = [
          [0.00, [-26, 6, 50], [-130, 4.5, 12]],
          [0.15, [-32, 10, 56], [2, 5, 10]],
          [0.27, [8, 15, 58], [0, 5.5, 6]],
          [0.40, [32, 12, 42], [0, 4.5, 2]],
          [0.52, [16, 13, 38], [-2, 3, -2]],
          [0.66, [-10, 24, 36], [-1, 2.6, 0]],
          [0.84, [-34, 11, 28], [-1, 3.6, 0]],
          [1.00, [-38, 7.5, 24], [-1, 4, 0]]
        ];
        this.storyCamT = { k: K.map(k => k[0]), pos: new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[1])), false, 'centripetal'), tgt: new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[2])), false, 'centripetal') };
      }
      const k = this.storyCamT.k; let u = 0;
      for (let i = 0; i < k.length - 1; i++) if (T >= k[i]) u = (i + (T - k[i]) / (k[i + 1] - k[i])) / (k.length - 1);
      u = clamp(u);
      this.camera.position.copy(this.storyCamT.pos.getPoint(u));
      const a = this.camera.aspect, zk = a < 1 ? 1 + (1 - a) * 1.7 : (this.narrow ? 1.22 : 1);
      if (zk !== 1) this.camera.position.multiplyScalar(zk);
      const tg = this.storyCamT.tgt.getPoint(u), follow = 1 - seg(T, 0.1, 0.18);
      if (follow > 0) tg.lerp(new THREE.Vector3(this.truckX + 4, 4.6, TZ), follow);
      this.camera.lookAt(tg);
      this.applyPose();
      this.start(); this.render();
    }
    setStory(t) {
      if (!this.storyMode) return;
      this.storyT = clamp(t);
      if (this.storyTrecc) return this.setStoryTrecc(this.storyT);
      const T = this.storyT, D = this.dims;
      const arrive = easeOut(seg(T, 0.0, 0.2)), jacksDown = ease(seg(T, 0.2, 0.28)), lift = ease(seg(T, 0.27, 0.31));
      const leave = easeIn(seg(T, 0.31, 0.44)), lower = ease(seg(T, 0.44, 0.52)), stow = seg(T, 0.52, 0.55);
      const bed = 4.3;
      this.truckX = lerp(-150, 0, arrive) + leave * 150;
      this.truck.position.x = this.truckX;
      const onTruck = T < 0.31;
      const uy = onTruck ? bed + lift * 0.45 : lerp(bed + 0.45, 0, lower);
      this.unit.position.set(onTruck ? this.truckX : 0, uy, 0);
      this.jacks.forEach(j => {
        const show = T > 0.19 && T < 0.555; j.visible = show;
        const reach = uy + 0.5; const ext = jacksDown * reach + (1 - jacksDown) * 0.6;
        j.userData.leg.scale.set(1, Math.max(0.01, ext), 1); j.userData.leg.position.y = 0.55 - ext / 2;
        j.userData.foot.position.y = 0.55 - ext; j.userData.crank.rotation.x = T * 60;
        j.scale.setScalar(1 - stow * 0.0);
        if (stow > 0) j.visible = stow < 0.98;
      });
      this.p = this.pT = ease(seg(T, 0.56, 0.95));
      this.headMat.emissiveIntensity = 2.2 * (T < 0.46 ? 1 : 0);
      // camera rig
      if (!this.storyCam) {
        const K = [
          [0.00, [-30, 6.5, 42], [-130, 4.5, 0]],
          [0.16, [-32, 9, 56], [4, 5, 0]],
          [0.28, [10, 9, 60], [4, 5, 0]],
          [0.40, [42, 11, 48], [6, 4.5, 0]],
          [0.52, [32, 17, 52], [0, 3.5, 0]],
          [0.70, [-6, 33, 58], [0, 2.6, 2]],
          [0.86, [-46, 16, 48], [0, 4.2, 2]],
          [1.00, [-56, 10, 38], [0, 4.6, 2]]
        ];
        this.storyCam = { k: K.map(k => k[0]), pos: new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[1])), false, 'centripetal'), tgt: new THREE.CatmullRomCurve3(K.map(k => new THREE.Vector3(...k[2])), false, 'centripetal') };
      }
      const k = this.storyCam.k; let u = 0;
      for (let i = 0; i < k.length - 1; i++) if (T >= k[i]) u = (i + (T - k[i]) / (k[i + 1] - k[i])) / (k.length - 1);
      u = clamp(u);
      this.camera.position.copy(this.storyCam.pos.getPoint(u));
      const a = this.camera.aspect, zk = a < 1 ? 1 + (1 - a) * 1.7 : (this.narrow ? 1.22 : 1);
      if (zk !== 1) this.camera.position.multiplyScalar(zk);
      const tg = this.storyCam.tgt.getPoint(u), follow = 1 - seg(T, 0.12, 0.2);
      if (follow > 0) tg.lerp(new THREE.Vector3(this.truckX + 6, 4.6, 0), follow);
      this.camera.lookAt(tg);
      this.applyPose();
      this.start(); this.render();
    }

    bindPointer() {
      const el = this.renderer.domElement;
      let lx = 0, ly = 0, id = null;
      el.style.touchAction = 'pan-y';
      el.addEventListener('pointerdown', e => { id = e.pointerId; lx = e.clientX; ly = e.clientY; this.dragging = true; this.idle = 0; this.introT = null; el.setPointerCapture(id); el.classList.add('grabbing'); });
      el.addEventListener('pointermove', e => {
        if (!this.dragging || e.pointerId !== id) return;
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        if (this.camMode === 'inside') { this.lookYaw = clamp(this.lookYaw - dx * 0.004, -1.3, 1.3); this.lookPitch = clamp(this.lookPitch - dy * 0.003, -0.5, 0.45); }
        else if (this.camMode === 'orbit') { this.az -= dx * 0.006; this.el = clamp(this.el + dy * 0.004, 0.04, 1.05); }
        this.idle = 0; this.start();
      });
      const up = e => { if (e.pointerId !== id) return; this.dragging = false; el.classList.remove('grabbing'); try { el.releasePointerCapture(id); } catch (_) { } };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('keydown', e => {
        if (this.camMode === 'inside') { if (e.key === 'ArrowLeft') this.lookYaw += 0.12; if (e.key === 'ArrowRight') this.lookYaw -= 0.12; }
        else { if (e.key === 'ArrowLeft') this.az += 0.15; if (e.key === 'ArrowRight') this.az -= 0.15; }
        this.start();
      });
      el.tabIndex = 0;
    }

    start() { if (!this.running && this.visible && !document.hidden) { this.running = true; this.clock.getDelta(); requestAnimationFrame(this.loop); } }

    loop() {
      if (!this.visible || document.hidden) { this.running = false; return; }
      const raw = this.clock.getDelta(), dt = Math.min(raw, 0.05), tdt = Math.min(raw, 0.25);
      this.samplePerf(raw);
      let changed = false;
      if (!this.storyMode) {
        if ((this.xray || 0) !== (this.xrayT || 0)) { const sp = reduce ? 1 : tdt / 1.1, x = this.xray || 0, t = this.xrayT || 0; this.xray = t > x ? Math.min(t, x + sp) : Math.max(t, x - sp); this.applyXray(); changed = true; }
        if (this.p !== this.pT) { const sp = reduce ? 1 : tdt / 4.2; this.p = this.pT > this.p ? Math.min(this.pT, this.p + sp) : Math.max(this.pT, this.p - sp * 1.4); changed = true; }
        if (this.e !== this.eT && (this.p > 0.995 || this.eT === 0)) { const sp = reduce ? 1 : tdt / 1.8; this.e = this.eT > this.e ? Math.min(this.eT, this.e + sp) : Math.max(this.eT, this.e - sp * 1.5); changed = true; }
        // door follows the camera mode
        const dTarget = (this.camMode === 'inside' || (this.camMode === 'fly' && this.fly && (this.fly.dir > 0 ? this.fly.t > 0.35 : this.fly.t < 0.75))) ? 1 : 0;
        if ((this.doorOpen || 0) !== dTarget) { this.doorOpen = dTarget > (this.doorOpen || 0) ? Math.min(1, (this.doorOpen || 0) + tdt * 1.4) : Math.max(0, (this.doorOpen || 0) - tdt * 1.4); changed = true; }
        if (changed) { this.applyPose(); this.emit(); }
        if (this.pendingFit && this.p >= 0.995) { const k = this.pendingFit; this.pendingFit = null; this.enterFitout(k); }
        if (this.tr && this.tr.loaded) { const f = this.fly; this.tr.U.uHole.value.w = this.camMode === 'inside' ? 1 : f ? (f.dir > 0 ? smooth(0.3, 0.6, f.t) : 1 - smooth(0.4, 0.75, f.t)) : 0; }
        this.idle += dt; if (this.hsOpen) this.idle = 0;
        this.updateCameraRig(dt, tdt);
      } else {
        // dust behind the truck while it moves
        const v = (this.truckX - this.lastTruckX) / Math.max(dt, 1e-3); this.lastTruckX = this.truckX;
        if (Math.abs(v) > 2 && !reduce) this.spawnDust();
        this.dust.forEach(s => { const u = s.userData; u.age += dt; const k = u.age / u.life; if (k < 1) { s.position.y += dt * 1.2; s.position.z += dt * u.vz; s.scale.setScalar(2 + k * 9); s.material.opacity = 0.32 * (1 - k); } else s.material.opacity = 0; });
        if (this.wheels) this.wheels.forEach(w => { w.rotation.z = -this.truckX / 1.95; });
      }
      if (this.stormSys) this.tickStorm(dt);
      if (this.points.visible && !reduce) {
        const P = this.pPos, n = P.length / 3, t = this.clock.elapsedTime;
        for (let i = 0; i < n; i++) {
          const k = i * 3, v = this.pVel[i];
          if (this.pMode === 'snow') { P[k + 1] -= dt * 3.2 * v; P[k] += Math.sin(t * 0.8 + i) * dt * 0.9 + dt * 1.6; }
          else if (this.pMode === 'rain') { P[k + 1] -= dt * 46 * v; P[k] += dt * 3; }
          else if (this.pMode === 'dust') { P[k] += dt * 9 * v; P[k + 1] += Math.sin(t + i) * dt * 0.5; if (P[k + 1] > 14) P[k + 1] = Math.random() * 3; }
          if (P[k + 1] < 0) { P[k + 1] = this.pMode === 'dust' ? Math.random() * 6 : 60 + Math.random() * 10; P[k] = (Math.random() - 0.5) * 180; }
          if (P[k] > 90) P[k] -= 180;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
      }
      this.sun.target.position.set(0, 0, 0);
      this.render();
      requestAnimationFrame(this.loop);
    }
    spawnDust() {
      const s = this.dust.find(d => d.userData.age >= d.userData.life); if (!s) return;
      const side = Math.random() < 0.5 ? -1 : 1;
      s.position.set(this.truckX - 9 + Math.random() * 3, 1 + Math.random(), side * (3.3 + Math.random()));
      s.userData.age = 0; s.userData.life = 1.8 + Math.random() * 1.2; s.userData.vz = side * (0.6 + Math.random());
    }

    updateCameraRig(dt, tdt) {
      if (this.camMode === 'fly' && this.fly) {
        const f = this.fly; f.t = Math.min(1, f.t + tdt / f.d); const k = ease(f.t);
        this.camera.position.copy(f.pos.getPoint(k)); const tg = f.tgt.getPoint(k); this.camera.lookAt(tg); this.lookTarget = tg;
        this.camera.fov = lerp(f.fov0, f.fov1, ease(seg(f.t, f.dir > 0 ? 0.45 : 0, f.dir > 0 ? 1 : 0.6)));
        this.applyViewOffset(f.dir > 0 ? 1 - ease(seg(f.t, 0, 0.5)) : ease(seg(f.t, 0.5, 1)));
        if (f.t >= 1) {
          if (f.dir > 0) { this.camMode = 'inside'; this.insidePos = this.camera.position.clone(); this.insideTgt = tg.clone(); }
          else { this.camMode = 'orbit'; this.target.set(0, this.model === 'trecc' ? 3.4 : 4.6, 0); this.dist = this.distT; this.setFitout(null); this.applyViewOffset(1); this.idle = 0; }
          this.fly = null; this.emit();
        }
        return;
      }
      if (this.camMode === 'inside') {
        const base = this.insideTgt.clone().sub(this.insidePos);
        const yaw = this.lookYaw + (this.dragging || reduce ? 0 : Math.sin(this.clock.elapsedTime * 0.25) * 0.05);
        base.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3().crossVectors(base, new THREE.Vector3(0, 1, 0)).normalize();
        base.applyAxisAngle(right, this.lookPitch);
        this.camera.position.copy(this.insidePos); this.camera.lookAt(this.insidePos.clone().add(base));
        return;
      }
      if (this.introT) {
        const it = this.introT; it.t = Math.min(1, it.t + tdt / it.d); const k = ease(it.t);
        this.az = lerp(it.az0, it.az1, k); this.el = lerp(it.el0, it.el1, k); this.dist = lerp(it.dist0, this.distT, easeOut(it.t));
        if (it.t >= 1) this.introT = null;
        this.idle = 0;
      } else {
        if (!this.dragging && this.idle > 3 && !reduce) this.az -= dt * 0.045;
        this.dist += (this.distT - this.dist) * Math.min(1, dt * 4);
      }
      this.updateCamera();
    }
    updateCamera() {
      const ce = Math.cos(this.el);
      this.camera.position.set(Math.sin(this.az) * ce * this.dist, Math.sin(this.el) * this.dist + this.target.y, Math.cos(this.az) * ce * this.dist);
      this.camera.lookAt(this.target);
    }

    /* ---------------- hotspots ---------------- */
    hsSet() { return this.model === 'trecc' ? TRECC_PINS : this.model && this.model !== 'mecc' ? [] : HOTSPOTS; }
    makeHsButtons() {
      const L = this.hsLayer, defs = this.hsSet();
      if (this.hsDefs === defs) return; this.hsDefs = defs;
      (this.hsBtns || []).forEach(b => b.remove());
      this.hsBtns = defs.map(h => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'hs off'; b.dataset.hs = h.id;
        b.setAttribute('aria-label', h.t); b.setAttribute('aria-expanded', 'false');
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';
        b.addEventListener('click', e => { e.stopPropagation(); this.hsOpen === h.id ? this.closeHotspot() : this.openHotspot(h.id); });
        L.insertBefore(b, this.hsCard || null); return b;
      });
    }
    buildHotspots() {
      const L = document.createElement('div'); L.className = 'hs-layer'; this.hsLayer = L;
      this.makeHsButtons();
      const c = document.createElement('div'); c.className = 'hs-card'; c.setAttribute('role', 'dialog'); c.hidden = true;
      c.innerHTML = '<b></b><p></p><button type="button" class="hs-x" aria-label="Close">×</button>';
      c.querySelector('.hs-x').addEventListener('click', () => this.closeHotspot(true));
      L.appendChild(c); this.hsCard = c; this.hsLayer = L;
      this.renderer.domElement.addEventListener('pointerdown', () => this.closeHotspot());
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.hsOpen) this.closeHotspot(true); });
      this._v3 = new THREE.Vector3(); this._n3 = new THREE.Vector3(); this._c3 = new THREE.Vector3();
    }
    openHotspot(id) {
      const h = (this.hsDefs || []).find(x => x.id === id); if (!h) return;
      this.hsOpen = id; this.idle = 0;
      this.hsCard.querySelector('b').textContent = h.t; this.hsCard.querySelector('p').textContent = typeof h.d === 'function' ? h.d(this.e) : h.d;
      this.hsCard.hidden = false; this.hsCard.setAttribute('aria-label', h.t);
      this.hsBtns.forEach(b => { const on = b.dataset.hs === id; b.classList.toggle('on', on); b.setAttribute('aria-expanded', on); });
      this.start(); this.render();
    }
    closeHotspot(refocus) {
      if (!this.hsCard) return;
      const was = this.hsOpen; this.hsOpen = null; this.hsCard.hidden = true;
      this.hsBtns.forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
      if (refocus && was) { const b = this.hsBtns.find(x => x.dataset.hs === was); b && b.focus(); }
    }
    updateHotspots() {
      if (!this.hsLayer || !this.container) return;
      const w = this.container.clientWidth, h = this.container.clientHeight, D = this.dims, r = 4.5 * ease(this.e);
      this.camera.updateMatrixWorld(); this._c3.copy(this.camera.position);
      if (this.hsLayer && this.hsDefs !== this.hsSet()) this.makeHsButtons();
      const hide = this.camMode !== 'orbit' || !!this.introT || !!this.campMode || (this.model === 'trecc' && !(this.tr && this.tr.loaded));
      const xr = this.xray || 0, cutZ = this.model === 'trecc' ? lerp(4.6, -0.6, xr) : 1e9;
      (this.hsDefs || []).forEach((hs, i) => {
        const b = this.hsBtns[i];
        const p = this._v3.set(...hs.pos(D, r));
        const facing = this._n3.set(...hs.n).normalize().dot(this._c3.clone().sub(p)) > 0;
        let show = !hide && hs.when(this.p, this.e) && facing && !(this.p > 0.02 && this.p < 0.97);
        if (hs.xr && xr < 0.35) show = false;
        if (this.hsFew && !hs.hero && !(hs.xr && xr >= 0.35)) show = false;
        if (p.z > cutZ + 0.15) show = false;
        p.project(this.camera);
        const x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
        if (p.z > 1 || x < 16 || x > w - 16 || y < 16 || y > h - 16) show = false;
        if (this.narrow && (hs.id === 'iso' || hs.id === 'door' || hs.id === 'hvac')) show = false;
        b.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        b.classList.toggle('off', !show); b.tabIndex = show ? 0 : -1;
        if (this.hsOpen === hs.id) {
          if (!show) { this.closeHotspot(); return; }
          const cw = Math.min(280, w - 32), left = x + 22 + cw > w - 12 ? x - 22 - cw : x + 22;
          const top = Math.max(12, Math.min(h - this.hsCard.offsetHeight - 12, y - 24));
          this.hsCard.style.width = cw + 'px';
          this.hsCard.style.transform = `translate(${Math.max(12, left).toFixed(1)}px,${top.toFixed(1)}px)`;
        }
      });
    }
    render() {
      if (!this.ok || !this.container) return;
      if (!this.running && this.camMode === 'orbit' && !this.storyMode) this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      if (!this.storyMode) this.updateHotspots();
    }
  }

  window.ShelterViewer = ShelterViewer;
  window.SHELTER_CLIMATES = { arctic: CLIMATES.arctic, desert: CLIMATES.desert, temperate: CLIMATES.temperate, tropical: CLIMATES.tropical };
  window.SHELTER_FITOUTS = FITOUTS;
  window.WH3D = { box, mk, rboxGeo, LIN, cvs, tex, floorTexture, PI, TAU, clamp };
})();
