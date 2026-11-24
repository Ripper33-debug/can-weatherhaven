/**
 * A site for the product-page 3D: sky, ground and horizon in one of four climates, so a shelter stands
 * somewhere instead of on a grid. Illustrative: built from noise, not from any real place.
 *
 * Units are metres, sized from the model's footprint radius. Everything sits inside the camera's far
 * plane and fades into fog the colour of the sky's horizon, so there is no edge to the world.
 */
import * as THREE from "three";

export type SiteKind = "desert" | "arctic" | "temperate" | "tropical";

type Palette = {
  skyTop: number; skyMid: number; skyBot: number; sun: number; clouds: number;
  ground: number; ground2: number; far: number; pad: number; padOn: number;
  relief: number; ridge: number; detail: "sand" | "snow" | "grass" | "jungle";
  key: number; keyI: number; hemiSky: number; hemiGround: number; hemiI: number; trees: "conifer" | "broadleaf" | null;
};
const SITES: Record<SiteKind, Palette> = {
  desert: { skyTop: 0x4580c4, skyMid: 0x9dbedd, skyBot: 0xe1ddd5, sun: 0xfff6e8, clouds: 0.16, ground: 0xc2ab8c, ground2: 0xa48e70, far: 0xcdc6ba, pad: 0x938674, padOn: 0.5,
    relief: 0.45, ridge: 0.2, detail: "sand", key: 0xfff6ea, keyI: 1.8, hemiSky: 0xbfd3ea, hemiGround: 0x9c7a50, hemiI: 0.45, trees: null },
  arctic: { skyTop: 0x2c5390, skyMid: 0x86a3cb, skyBot: 0xf1dcc8, sun: 0xffe7cf, clouds: 0.4, ground: 0xe9eef4, ground2: 0x9aa9bf, far: 0xc9d4e4, pad: 0xb3bcc8, padOn: 0.4,
    relief: 0.9, ridge: 1, detail: "snow", key: 0xfff3e6, keyI: 1.7, hemiSky: 0xa9bbd6, hemiGround: 0x5b6a80, hemiI: 0.5, trees: null },
  temperate: { skyTop: 0x5384bd, skyMid: 0xa0bbd6, skyBot: 0xe4e9e4, sun: 0xffeccc, clouds: 0.5, ground: 0x66744b, ground2: 0x4b5832, far: 0xa9b7b4, pad: 0x6f6b62, padOn: 1,
    relief: 0.6, ridge: 0.15, detail: "grass", key: 0xffeed6, keyI: 1.6, hemiSky: 0xcbd9e8, hemiGround: 0x4c5638, hemiI: 0.5, trees: "conifer" },
  tropical: { skyTop: 0x7f939d, skyMid: 0xaab8b8, skyBot: 0xd6ddd3, sun: 0xf2f4ee, clouds: 0.74, ground: 0x587340, ground2: 0x3d5530, far: 0x9fb0a6, pad: 0x67635a, padOn: 1,
    relief: 0.7, ridge: 0.1, detail: "jungle", key: 0xf3f4ee, keyI: 1.15, hemiSky: 0xdbe3dd, hemiGround: 0x3c4d31, hemiI: 0.65, trees: "broadleaf" },
};

const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(hash(xi, yi), hash(xi + 1, yi), u), l(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
};
const fbm = (x: number, y: number, o: number) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };

/** Tileable detail, stored around mid-grey so it can lighten and darken the ground colour. */
function detailTexture(kind: Palette["detail"] | "gravel"): THREE.CanvasTexture {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d")!, id = x.createImageData(S, S), d = id.data;
  const tn = (i: number, j: number, fx: number, fy: number, o: number) => {
    const pn = (X: number, Y: number, Px: number, Py: number) => {
      const xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const h = (a: number, b: number) => hash(((a % Px) + Px) % Px, ((b % Py) + Py) % Py);
      const l = (a: number, b: number, t: number) => a + (b - a) * t;
      return l(l(h(xi, yi), h(xi + 1, yi), u), l(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
    };
    let s = 0, a = 0.5, n = 0, Fx = fx, Fy = fy;
    for (let k = 0; k < o; k++) { s += a * pn((i / S) * Fx, (j / S) * Fy, Fx, Fy); n += a; Fx *= 2; Fy *= 2; a *= 0.5; }
    return s / n;
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const k = (j * S + i) * 4, g = hash(i * 1.7, j * 2.3) - 0.5;
    let r = 1, gg = 1, b = 1;
    if (kind === "snow") { const st = tn(i, j, 2, 14, 4), v = 1 + (st - 0.5) * 0.26 + g * 0.03, hol = Math.max(0, 0.52 - st) * 0.2; r = v - hol; gg = v - hol * 0.4; b = v + hol * 0.3; }
    else if (kind === "sand") { const n = tn(i, j, 6, 6, 4), rip = Math.sin((i / S) * Math.PI * 18 + tn(i, j, 3, 3, 2) * 7) * 0.5 + 0.5, v = 0.96 + (n - 0.5) * 0.16 + g * 0.09 + rip * 0.06; r = v * 1.02; gg = v; b = v * 0.95; }
    else if (kind === "grass") { const n = tn(i, j, 8, 8, 4), dry = Math.max(0, tn(i, j, 3, 3, 3) - 0.56) * 2.4, v = 0.86 + (n - 0.5) * 0.3 + (hash(i * 0.9, j * 3.7) - 0.5) * 0.3; r = v * (1 + dry * 0.55); gg = v * (1 + dry * 0.18); b = v * (1 - dry * 0.35); }
    else if (kind === "jungle") { const n = tn(i, j, 10, 10, 4), mud = Math.max(0, tn(i, j, 4, 4, 3) - 0.6) * 2, v = 0.82 + (n - 0.5) * 0.36 + g * 0.2; r = v * (1 + mud * 0.5); gg = v * (1 - mud * 0.12); b = v * (1 - mud * 0.3); }
    else { const st = tn(i, j, 24, 24, 2), stone = st > 0.55, tone = hash(Math.floor(i / 6), Math.floor(j / 6)), v = stone ? 0.85 + tone * 0.55 : 0.7 + tn(i, j, 48, 48, 2) * 0.25 + g * 0.1; r = v; gg = v * 0.98; b = v * 0.94; }
    d[k] = Math.min(255, Math.max(0, r * 128)); d[k + 1] = Math.min(255, Math.max(0, gg * 128)); d[k + 2] = Math.min(255, Math.max(0, b * 128)); d[k + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** One instanced kind of tree, merged from simple parts with vertex colours. */
function treeGeometry(kind: "conifer" | "broadleaf"): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, hex: number, jit = 0) => {
    g = g.index ? g.toNonIndexed() : g;
    const p = g.attributes.position as THREE.BufferAttribute, c = new THREE.Color(hex), col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      if (jit) { const k = hash(Math.round(p.getX(i) * 40), Math.round(p.getZ(i) * 40 + p.getY(i) * 40)) - 0.5; p.setXYZ(i, p.getX(i) * (1 + k * jit), p.getY(i), p.getZ(i) * (1 + k * jit)); }
      const sh = 0.8 + 0.3 * Math.min(1, Math.max(0, p.getY(i) / 12));
      col[i * 3] = c.r * sh; col[i * 3 + 1] = c.g * sh; col[i * 3 + 2] = c.b * sh;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.deleteAttribute("uv"); g.computeVertexNormals(); parts.push(g);
  };
  if (kind === "conifer") {
    add(new THREE.CylinderGeometry(0.15, 0.3, 3, 6).translate(0, 1.5, 0), 0x3e2f22);
    for (let i = 0; i < 6; i++) { const t = i / 5; add(new THREE.ConeGeometry(2.4 * (1 - t * 0.85) + 0.25, 2.4 - t * 0.8, 9).translate(0, 2.2 + i * 1.3, 0), [0x203520, 0x27412a, 0x2c4b2e][i % 3], 0.28); }
  } else {
    add(new THREE.CylinderGeometry(0.25, 0.45, 6, 6).translate(0, 3, 0), 0x4b3a2a);
    [[0, 7, 0, 2.8], [2, 6.3, 0.7, 2.1], [-1.8, 6.6, -0.6, 2.2], [0.5, 8.2, -1.3, 1.9]].forEach(([x, y, z, r], i) =>
      add(new THREE.IcosahedronGeometry(r, 1).scale(1, 0.72, 1).translate(x, y, z), [0x2b4a21, 0x355a26, 0x3f652b][i % 3], 0.3));
  }
  let n = 0; parts.forEach((g) => (n += g.attributes.position.count));
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  parts.forEach((g) => { pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3); col.set(g.attributes.color.array as Float32Array, o * 3); o += g.attributes.position.count; g.dispose(); });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}

export type SiteBackdrop = {
  group: THREE.Group;
  fog: THREE.Fog;
  light: { key: THREE.Color; keyI: number; hemiSky: THREE.Color; hemiGround: THREE.Color; hemiI: number };
  dispose: () => void;
};

/**
 * @param center the model's footprint centre (ground level is y = 0)
 * @param radius half the larger side of the deployed footprint, in metres
 * @param pad half extents of the prepared pad under the shelter
 */
export function createSiteBackdrop(kind: SiteKind, center: THREE.Vector3, radius: number, pad: [number, number]): SiteBackdrop {
  const P = SITES[kind], group = new THREE.Group(), disposables: { dispose: () => void }[] = [];
  const R = Math.max(4, radius), world = R * 16 + 40;

  // ---- sky: gradient, sun glow, still clouds; rendered through the scene's tone mapping ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(P.skyTop) }, mid: { value: new THREE.Color(P.skyMid) }, bot: { value: new THREE.Color(P.skyBot) },
      sunCol: { value: new THREE.Color(P.sun) }, sunDir: { value: new THREE.Vector3(0.45, 0.42, 0.55).normalize() }, cov: { value: P.clouds } },
    vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top, mid, bot, sunCol, sunDir; uniform float cov; varying vec3 vP;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = h < 0.1 ? mix(bot, mid, smoothstep(-0.02, 0.1, h)) : mix(mid, top, smoothstep(0.1, 0.7, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 8.0) * 0.25 + pow(s, 200.0) * 1.2);
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.1) * 0.6; float n = fbm(uv), sh = fbm(uv * 1.9 + 4.1);
          float dens = smoothstep(1.0 - cov, 1.3 - cov, n) * smoothstep(0.0, 0.15, d.y);
          vec3 cc = mix(mid * 0.82, vec3(1.0) * mix(vec3(1.0), sunCol, 0.3), clamp(0.5 + (n - sh) * 1.6, 0.0, 1.0));
          c = mix(c, cc, dens * 0.9);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(world, 48, 24), skyMat);
  sky.position.copy(center); sky.renderOrder = -1;
  group.add(sky); disposables.push(sky.geometry, skyMat);

  // ---- ground: flat under the shelter, rising to hills, dunes or mountains at the horizon ----
  const size = world * 1.7, segs = 150;
  const g = new THREE.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(pos.count * 3);
  const A = new THREE.Color(P.ground), B = new THREE.Color(P.ground2), F = new THREE.Color(P.far), tmp = new THREE.Color();
  const flat = R * 2.4, rise = R * 9;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), u = x / R, v = z / R;
    const near = Math.min(1, Math.max(0, (r - flat) / (R * 3))), far = Math.min(1, Math.max(0, (r - rise * 0.6) / rise)) ** 1.3;
    const n = fbm(u * 0.09 + 3, v * 0.09, 5);
    let ridge = 0;
    if (P.ridge > 0.5) { let a = 0.6, f = 0.05, w = 1; for (let o = 0; o < 5; o++) { let rr = 1 - Math.abs(vnoise(u * f + 9 * o, v * f - 4 * o) * 2 - 1); rr *= rr * w; w = Math.min(1, rr * 1.6); ridge += rr * a; a *= 0.5; f *= 2.1; } }
    const dunes = P.detail === "sand" ? Math.sin(u * 0.35 + fbm(u * 0.05, v * 0.05, 3) * 6) * 0.5 + 0.5 : n;
    const y = near * fbm(u * 0.2, v * 0.2 + 2, 3) * R * 0.25 * P.relief + far * R * (dunes * 1.4 * P.relief + ridge * 5 * P.ridge);
    pos.setY(i, y);
    tmp.copy(A).lerp(B, Math.min(1, n * 0.9 + (hash(x, z) - 0.5) * 0.1)).lerp(F, far * 0.5);
    if (P.ridge > 0.5 && y > R * 1.5) tmp.lerp(new THREE.Color(0x52637a), Math.min(1, (y - R * 1.5) / (R * 6)) * 0.35);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const det = detailTexture(P.detail), grav = detailTexture("gravel"); disposables.push(det, grav, g);
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, envMapIntensity: 0.35 });
  const U = { sDet: { value: det }, sGrav: { value: grav }, uPad: { value: new THREE.Vector2(pad[0], pad[1]) }, uPadOn: { value: P.padOn }, uPadCol: { value: new THREE.Color(P.pad) },
    uCenter: { value: new THREE.Vector2(center.x, center.z) }, uScale: { value: new THREE.Vector2(0.55, 2.1) } };
  gm.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "varying vec3 vSW;\n" + sh.vertexShader.replace("#include <fog_vertex>", "#include <fog_vertex>\n vSW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = "varying vec3 vSW; uniform sampler2D sDet, sGrav; uniform vec2 uPad, uCenter, uScale; uniform float uPadOn; uniform vec3 uPadCol;\n" + sh.fragmentShader.replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
      vec2 wp = vSW.xz; float dd = length(vViewPosition);
      vec3 dt = (texture2D(sDet, wp * uScale.x).rgb * 0.6 + texture2D(sDet, wp * uScale.y * 0.13 + 0.3).rgb * 0.4) * 2.0;
      diffuseColor.rgb *= mix(vec3(1.0), dt, 1.0 - smoothstep(30.0, 140.0, dd));
      vec2 q = abs(wp - uCenter) - uPad; float pe = max(q.x, q.y) + (texture2D(sDet, wp * 0.05).r - 0.5) * 2.0;
      float padM = (1.0 - smoothstep(-0.4, 0.6, pe)) * uPadOn;
      diffuseColor.rgb = mix(diffuseColor.rgb, uPadCol * mix(vec3(1.0), texture2D(sGrav, wp * 1.1).rgb * 2.0, 0.55), padM);`);
  };
  gm.customProgramCacheKey = () => "wh-site-ground";
  const ground = new THREE.Mesh(g, gm);
  ground.position.set(center.x, -0.005, center.z); ground.receiveShadow = true;
  group.add(ground); disposables.push(gm);

  // ---- trees on the rising ground, kept out of the near field ----
  if (P.trees) {
    const tg = treeGeometry(P.trees), tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.3 });
    const count = 380, mesh = new THREE.InstancedMesh(tg, tm, count), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    // tree height ~ a third of the shelter's footprint at the nearest, larger behind
    const scale = R / 4.2;
    let placed = 0;
    for (let t = 0; t < count * 12 && placed < count; t++) {
      const a = Math.random() * Math.PI * 2, r = R * 11 + Math.random() ** 0.8 * R * 6, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (fbm(x / R * 0.12 + 5, z / R * 0.12 - 3, 3) < 0.48) continue;
      const k = scale * (0.8 + Math.random() * 0.7);
      // height from the same field the ground used
      const gi = Math.round(((x + size / 2) / size) * segs), gj = Math.round(((z + size / 2) / size) * segs), y = pos.getY(gj * (segs + 1) + gi);
      s.set(k, k * (0.85 + Math.random() * 0.4), k); q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
      p.set(center.x + x, y - 0.2 * k, center.z + z); m.compose(p, q, s); mesh.setMatrixAt(placed++, m);
    }
    mesh.count = placed; group.add(mesh); disposables.push(tg, tm);
  }

  {
    const M = (o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.35, ...o });
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number, r0: number, r1: number, s0: number, s1: number, hue: number, sq = [0.8, 1.2], sink = 0.3) => {
      const mesh = new THREE.InstancedMesh(geo, mat, count), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
      let n = 0;
      for (let t = 0; t < count * 10 && n < count; t++) {
        const a = Math.random() * Math.PI * 2, r = r0 + Math.random() ** 1.4 * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.abs(x) < pad[0] + 0.6 && Math.abs(z) < pad[1] + 0.6) continue;
        if (fbm(x * 0.15 + 2, z * 0.15, 3) < 0.45 && Math.random() > 0.15) continue;
        const k = s0 + Math.random() * (s1 - s0), gi = Math.round(((x + size / 2) / size) * segs), gj = Math.round(((z + size / 2) / size) * segs), y = pos.getY(gj * (segs + 1) + gi);
        sc.set(k, k * (sq[0] + Math.random() * (sq[1] - sq[0])), k); q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
        p.set(center.x + x, y - sink * k, center.z + z); m.compose(p, q, sc); mesh.setMatrixAt(n, m);
        c.set(hue).multiplyScalar(0.8 + Math.random() * 0.35); mesh.setColorAt(n++, c);
      }
      mesh.count = n; group.add(mesh); disposables.push(geo, mat);
    };
    const rock = () => { const g0 = new THREE.IcosahedronGeometry(1, 1), g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position as THREE.BufferAttribute, off: Record<string, number> = {};
      for (let k = 0; k < p.count; k++) { const key = [p.getX(k), p.getY(k), p.getZ(k)].map((v) => Math.round(v * 100)).join(); off[key] ??= 0.72 + Math.random() * 0.5; const f = off[key]; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.75, p.getZ(k) * f); }
      g.computeVertexNormals(); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3)); return g; };
    const rockHue = { desert: 0x8a6a4c, arctic: 0x4a525e, temperate: 0x6c6e66, tropical: 0x55584a }[kind];
    put(rock(), M({ flatShading: true }), 70, pad[0] + 2, R * 7, 0.15, 0.7, rockHue, [0.6, 1.1], 0.35);
    if (kind === "desert") { const g = new THREE.IcosahedronGeometry(0.5, 1).scale(1, 0.85, 1).translate(0, 0.35, 0); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); put(g, M(), 110, pad[0] + 1.5, R * 7, 0.22, 0.55, 0x5f5d46, [0.8, 1.4], 0.1); }
    if (kind === "temperate" || kind === "tropical") {
      const pts: number[] = [], cols: number[] = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + hash(i, 1) * 0.6, lean = 0.12 + hash(i, 2) * 0.3, h = 0.6 + hash(i, 4) * 0.5, w = 0.05, o = hash(i, 6) * 0.25, cx = Math.cos(a), cz = Math.sin(a);
        pts.push(cx * o - cz * w, 0, cz * o + cx * w, cx * o + cz * w, 0, cz * o - cx * w, cx * (o + lean * h), h, cz * (o + lean * h)); cols.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1, 1, 0.92); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pts.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      put(g, M({ side: THREE.DoubleSide }), 3500, pad[0] + 0.3, R * 6, 0.28, 0.5, new THREE.Color(P.ground).multiplyScalar(1.25).getHex(), [0.8, 1.3], 0.02);
    }
  }

  const fog = new THREE.Fog(new THREE.Color(P.skyBot).lerp(new THREE.Color(P.far), 0.4), R * 5, R * 14 + 16);
  return {
    group, fog,
    light: { key: new THREE.Color(P.key), keyI: P.keyI, hemiSky: new THREE.Color(P.hemiSky), hemiGround: new THREE.Color(P.hemiGround), hemiI: P.hemiI },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/** Which climate each system's page shows it in (where Weatherhaven describes it working). */
export const SITE_FOR: Record<string, SiteKind> = {
  mecc: "temperate", ehmecc: "desert", ateps: "desert", hercon: "temperate", series4: "temperate", series8: "tropical",
  rdmss: "desert", mts: "temperate", mex26: "desert", polarhaven: "arctic", polarchief: "arctic", endurance: "arctic",
};
