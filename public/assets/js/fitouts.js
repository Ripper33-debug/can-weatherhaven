/* Illustrative interior fit-outs for the MECC / EHMECC model.
   Local frame: origin at the unit centre on the finished floor; x along the length, z across. Core spans |z| < 3.8,
   wings run out to |z| ≈ 11, inner end walls at |x| ≈ 9.8. The door is on the -x end near z = 1.6, so keep that corner clear. */
(function () {
  'use strict';
  const PI = Math.PI, TAU = Math.PI * 2;
  let C = null; // material cache

  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tx(c, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
  function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  /* ---------- screen artwork (illustrative UI) ---------- */
  function opsMap(seed, w = 512, h = 300) {
    const c = cvs(w, h), x = c.getContext('2d'), R = rnd(seed);
    x.fillStyle = '#061322'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(70,140,210,0.16)'; x.lineWidth = 1;
    for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
    for (let j = 0; j < h; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
    for (let k = 0; k < 9; k++) {
      x.strokeStyle = `rgba(110,190,255,${0.12 + k * 0.03})`; x.lineWidth = 1.2; x.beginPath();
      const cx = w * (0.3 + R() * 0.5), cy = h * (0.3 + R() * 0.4), r0 = 20 + k * 14;
      for (let a = 0; a <= TAU + 0.01; a += 0.12) { const rr = r0 * (1 + 0.25 * Math.sin(a * 3 + k) + 0.12 * Math.sin(a * 7 + seed)); const px = cx + Math.cos(a) * rr * 1.5, py = cy + Math.sin(a) * rr; a === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
      x.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const px = 40 + R() * (w - 80), py = 30 + R() * (h - 60);
      x.fillStyle = k % 3 ? '#ee8400' : '#e8f1fb'; x.beginPath(); x.moveTo(px, py - 6); x.lineTo(px + 6, py + 5); x.lineTo(px - 6, py + 5); x.closePath(); x.fill();
      x.fillStyle = 'rgba(232,241,251,0.55)'; x.fillRect(px + 9, py - 3, 26 + R() * 30, 4);
    }
    x.strokeStyle = 'rgba(238,132,0,0.8)'; x.setLineDash([6, 5]); x.lineWidth = 2; x.beginPath(); x.moveTo(w * 0.15, h * 0.8);
    x.bezierCurveTo(w * 0.35, h * 0.3, w * 0.6, h * 0.9, w * 0.85, h * 0.25); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(10,30,52,0.92)'; x.fillRect(w - 110, 0, 110, h);
    for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(150,200,240,${0.25 + R() * 0.4})`; x.fillRect(w - 98, 16 + i * 30, 40 + R() * 46, 6); x.fillStyle = 'rgba(150,200,240,0.18)'; x.fillRect(w - 98, 26 + i * 30, 80, 3); }
    return tx(c);
  }
  function dash(seed, w = 512, h = 300) {
    const c = cvs(w, h), x = c.getContext('2d'), R = rnd(seed);
    x.fillStyle = '#081525'; x.fillRect(0, 0, w, h);
    for (let p = 0; p < 4; p++) {
      const px = 14 + (p % 2) * 250, py = 14 + Math.floor(p / 2) * 145; x.fillStyle = '#0d2238'; x.fillRect(px, py, 236, 130);
      x.fillStyle = 'rgba(180,215,245,0.5)'; x.fillRect(px + 10, py + 10, 70, 5);
      if (p % 2) { for (let b = 0; b < 9; b++) { const bh = 20 + R() * 80; x.fillStyle = b === 6 ? '#ee8400' : '#3d8fd6'; x.fillRect(px + 14 + b * 24, py + 120 - bh, 16, bh); } }
      else { x.strokeStyle = '#5fb4ff'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 20; i++) { const yy = py + 90 - Math.sin(i * 0.5 + seed) * 20 - R() * 18; i ? x.lineTo(px + 10 + i * 11, yy) : x.moveTo(px + 10, yy); } x.stroke(); }
    }
    return tx(c);
  }
  function vitals(w = 512, h = 320) {
    const c = cvs(w, h), x = c.getContext('2d');
    x.fillStyle = '#020604'; x.fillRect(0, 0, w, h);
    const wave = (y0, col, f) => { x.strokeStyle = col; x.lineWidth = 2.4; x.beginPath(); for (let i = 0; i < 360; i++) { const t = i / 360 * 6; let v = Math.sin(t * TAU * f) * 6; if (col === '#39ff6a') { const ph = (t * 1.2) % 1; v = ph < 0.05 ? -46 * Math.sin(ph / 0.05 * PI) : ph < 0.1 ? 14 * Math.sin((ph - 0.05) / 0.05 * PI) : 2 * Math.sin(t * 8); } i ? x.lineTo(12 + i, y0 + v) : x.moveTo(12, y0 + v); } x.stroke(); };
    wave(70, '#39ff6a', 1); wave(160, '#ffd23f', 1.1); wave(240, '#4fd2ff', 0.4);
    x.font = '600 46px Arial'; x.fillStyle = '#39ff6a'; x.fillText('72', 400, 86); x.fillStyle = '#ffd23f'; x.fillText('98', 400, 176); x.fillStyle = '#4fd2ff'; x.font = '600 32px Arial'; x.fillText('120/78', 380, 256);
    return tx(c);
  }
  function rackFront() {
    const c = cvs(128, 384), x = c.getContext('2d'); x.fillStyle = '#111417'; x.fillRect(0, 0, 128, 384);
    for (let u = 0; u < 22; u++) { const y = 8 + u * 17; x.fillStyle = u % 4 === 0 ? '#1d2227' : '#181c20'; x.fillRect(8, y, 112, 14); x.fillStyle = '#2a3036'; for (let i = 0; i < 12; i++) x.fillRect(14 + i * 6, y + 4, 3, 6); x.fillStyle = Math.random() < 0.7 ? '#3cff7a' : '#ffb020'; x.fillRect(100, y + 5, 3, 3); x.fillStyle = Math.random() < 0.5 ? '#3cff7a' : '#2a3036'; x.fillRect(108, y + 5, 3, 3); }
    return tx(c);
  }
  function pegboard() {
    const c = cvs(512, 160), x = c.getContext('2d'); x.fillStyle = '#b89a72'; x.fillRect(0, 0, 512, 160);
    x.fillStyle = 'rgba(60,40,20,0.45)'; for (let j = 8; j < 160; j += 12) for (let i = 8; i < 512; i += 12) { x.beginPath(); x.arc(i, j, 1.6, 0, TAU); x.fill(); }
    x.fillStyle = '#2b2f33';
    for (let k = 0; k < 14; k++) { const px = 20 + k * 35; x.save(); x.translate(px, 40 + (k % 3) * 10); x.rotate((k % 2 ? 0.15 : -0.1)); x.fillRect(-3, 0, 6, 60 + (k % 4) * 10); x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill(); x.restore(); }
    x.fillStyle = '#b3261e'; for (let k = 0; k < 6; k++) x.fillRect(30 + k * 80, 120, 40, 14);
    return tx(c);
  }
  function drawers(color) {
    const c = cvs(128, 256), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 9; i++) { const y = 10 + i * 27; x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(4, y + 22, 120, 2); x.fillStyle = '#c9cdd1'; x.fillRect(30, y + 8, 68, 4); }
    return tx(c);
  }
  function fridgeFront() {
    const c = cvs(128, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, '#b9bec3'); g.addColorStop(0.5, '#e2e5e8'); g.addColorStop(1, '#aeb3b8');
    x.fillStyle = g; x.fillRect(0, 0, 128, 256); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(63, 0, 2, 256); x.fillRect(0, 120, 128, 2);
    x.fillStyle = '#7b8086'; x.fillRect(52, 40, 4, 60); x.fillRect(72, 40, 4, 60); x.fillRect(52, 150, 4, 60); x.fillRect(72, 150, 4, 60);
    return tx(c);
  }

  function mats() {
    if (C) return C;
    const S = (o) => new THREE.MeshStandardMaterial(o), L = h => new THREE.Color(h).convertSRGBToLinear();
    C = {
      steel: S({ color: L(0xc9cdd1), metalness: 0.85, roughness: 0.3 }),
      brushed: S({ color: L(0xb4b9be), metalness: 0.8, roughness: 0.42 }),
      white: S({ color: L(0xf0f1ee), roughness: 0.5 }),
      cab: S({ color: L(0xe7e9e5), roughness: 0.55 }),
      black: S({ color: L(0x1b1e21), roughness: 0.45, metalness: 0.2 }),
      grey: S({ color: L(0x3c4247), roughness: 0.6, metalness: 0.3 }),
      midgrey: S({ color: L(0x7a8086), roughness: 0.55, metalness: 0.3 }),
      wood: S({ color: L(0x8a6a45), roughness: 0.7 }),
      red: S({ color: L(0xb3261e), roughness: 0.42, metalness: 0.25 }),
      teal: S({ color: L(0x2f6f73), roughness: 0.5 }),
      navy: S({ color: L(0x0d4275), roughness: 0.55 }),
      orange: S({ color: L(0xee8400), roughness: 0.5 }),
      blue: S({ color: L(0x2a5fa8), roughness: 0.4, metalness: 0.3 }),
      green: S({ color: L(0x2f7d4f), roughness: 0.4, metalness: 0.3 }),
      rubber: S({ color: L(0x1a1b1c), roughness: 0.92 }),
      sheet: S({ color: L(0xf6f7f5), roughness: 0.85 }),
      board: S({ color: L(0xf3f4f1), roughness: 0.4 }),
      cutting: S({ color: L(0xdcd2bf), roughness: 0.6 }),
      lampEm: new THREE.MeshStandardMaterial({ color: L(0xffffff), emissive: L(0xfff6e8), emissiveIntensity: 2.2 }),
      highbay: new THREE.MeshStandardMaterial({ color: L(0xffffff), emissive: L(0xfff1dc), emissiveIntensity: 1.8 }),
      floorTile: S({ color: 0xffffff, map: WH3D.floorTexture('tile'), roughness: 0.35, metalness: 0.05 }),
      floorQuarry: S({ color: 0xffffff, map: WH3D.floorTexture('quarry'), roughness: 0.55 }),
      floorPlate: S({ color: 0xffffff, map: WH3D.floorTexture('plate'), roughness: 0.38, metalness: 0.75 }),
      floorVinyl: S({ color: L(0x8a9097), map: WH3D.floorTexture('vinyl'), roughness: 0.7 }),
      ops: [1, 2, 3, 4, 5, 6].map(s => new THREE.MeshBasicMaterial({ map: opsMap(s), toneMapped: false })),
      dash: [7, 8, 9].map(s => new THREE.MeshBasicMaterial({ map: dash(s), toneMapped: false })),
      table: new THREE.MeshBasicMaterial({ map: opsMap(11, 1024, 380), toneMapped: false }),
      vitals: new THREE.MeshBasicMaterial({ map: vitals(), toneMapped: false }),
      rack: S({ map: rackFront(), roughness: 0.5, emissive: L(0xffffff), emissiveMap: rackFront(), emissiveIntensity: 0.6 }),
      peg: S({ map: pegboard(), roughness: 0.8 }),
      drawersRed: S({ map: drawers('#b3261e'), roughness: 0.45, metalness: 0.2 }),
      fridge: S({ map: fridgeFront(), roughness: 0.32, metalness: 0.7 })
    };
    C.glow = new THREE.SpriteMaterial({ map: (() => { const c = cvs(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tx(c); })(), color: 0xfff3dc, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 });
    return C;
  }

  const BOX = new THREE.BoxGeometry(1, 1, 1);
  function B(g, w, h, d, m, x, y, z, ry = 0) { const o = new THREE.Mesh(BOX, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; }
  function R(g, w, h, d, m, x, y, z, r = 0.08) { const o = new THREE.Mesh(WH3D.rboxGeo(w, h, d, r), m); o.position.set(x, y, z); g.add(o); return o; }
  function CY(g, r, h, m, x, y, z, axis = 'y', seg = 18) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); o.position.set(x, y, z); if (axis === 'x') o.rotation.z = PI / 2; if (axis === 'z') o.rotation.x = PI / 2; g.add(o); return o; }
  function screen(g, w, h, m, x, y, z, ry, bezel = 0.06) {
    const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry; g.add(s);
    B(s, w + bezel * 2, h + bezel * 2, 0.08, C.black, 0, 0, -0.045);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.z = 0.002; s.add(p); return s;
  }
  function chair(g, x, z, ry) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    R(c, 1.5, 0.28, 1.5, C.black, 0, 1.55, 0, 0.1); R(c, 1.45, 1.7, 0.22, C.black, 0, 2.55, -0.68, 0.1);
    CY(c, 0.08, 1.3, C.midgrey, 0, 0.8, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const leg = B(c, 0.9, 0.08, 0.12, C.midgrey, Math.cos(a) * 0.42, 0.18, Math.sin(a) * 0.42); leg.rotation.y = -a; }
    return c;
  }
  function floorOverlay(g, m) { const f = new THREE.Mesh(new THREE.PlaneGeometry(19.4, 22), m); f.rotation.x = -PI / 2; f.position.y = 0.012; m.map && m.map.repeat.set(5, 6); g.add(f); }
  function tireGeo(r = 1.25, w = 0.75) {
    const p = [[r * 0.55, -w / 2], [r * 0.86, -w / 2 - 0.02], [r * 0.98, -w * 0.38], [r, 0], [r * 0.98, w * 0.38], [r * 0.86, w / 2 + 0.02], [r * 0.55, w / 2]].map(a => new THREE.Vector2(a[0], a[1]));
    return new THREE.LatheGeometry(p, 28);
  }

  /* ---------- the four layouts ---------- */
  function command(g) {
    floorOverlay(g, C.floorVinyl);
    // video wall on the far end (screens above head height)
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) screen(g, 2.15, 1.22, c === 1 && r === 0 ? C.ops[0] : (r ? C.dash[c] : C.ops[c + 1]), 9.55, 4.25 + r * 1.36, (c - 1) * 2.32, -PI / 2);
    B(g, 0.12, 2.9, 7.1, C.black, 9.7, 4.9, 0);
    // operations table with a live map top
    B(g, 7.4, 0.12, 2.3, C.grey, 0.8, 2.85, 0); const top = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.95), C.table); top.rotation.x = -PI / 2; top.position.set(0.8, 2.92, 0); g.add(top);
    B(g, 7.1, 2.5, 1.6, C.grey, 0.8, 1.45, 0);
    [-2, 0.8, 3.6].forEach(x => { chair(g, x, 1.9, PI); chair(g, x, -1.9, 0); });
    // workstations along both wings
    [1, -1].forEach(sz => {
      B(g, 17.2, 0.12, 2.1, C.grey, -0.2, 2.5, sz * 9.6); B(g, 17.2, 2.4, 0.1, C.midgrey, -0.2, 1.3, sz * 10.6);
      [-6.4, -2.2, 2.0, 6.2].forEach((x, i) => {
        [-0.95, 0.95].forEach((o, j) => screen(g, 1.65, 1.0, j ? C.dash[(i + j) % 3] : C.ops[(i + 2) % 6], x + o, 3.55, sz * 9.95, sz > 0 ? PI + (j ? 0.12 : -0.12) * sz : (j ? -0.12 : 0.12) * -sz));
        B(g, 1.6, 0.05, 0.55, C.black, x, 2.59, sz * 9.2);
        chair(g, x, sz * 8.0, sz > 0 ? 0 : PI);
      });
      // map board on the door end of each wing
      const mb = screen(g, 3.6, 2.3, C.ops[4 + (sz > 0 ? 0 : 1)], -9.55, 4.4, sz * 7.4, PI / 2, 0.08);
      // server racks
      const rk = B(g, 2.2, 6.3, 2.0, C.black, 8.6, 3.15, sz * 5.6); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 6.0), C.rack); face.position.set(7.49, 3.15, sz * 5.6); face.rotation.y = -PI / 2; g.add(face);
    });
  }

  function medical(g, viewer) {
    floorOverlay(g, C.floorTile);
    // operating table
    CY(g, 0.45, 2.2, C.white, 2.6, 1.1, 0); B(g, 2.4, 0.18, 1.6, C.white, 2.6, 0.09, 0);
    R(g, 6.6, 0.32, 2.0, C.steel, 2.6, 2.35, 0, 0.06); R(g, 6.3, 0.28, 1.8, C.teal, 2.6, 2.63, 0, 0.1); R(g, 1.2, 0.3, 1.2, C.teal, 6.3, 2.62, 0, 0.12);
    R(g, 4.0, 0.12, 1.9, C.sheet, 1.7, 2.82, 0, 0.05);
    // surgical lights hang from the raised roof
    const lamp = new THREE.Group(); lamp.userData.y0 = -4.5; g.add(lamp);
    CY(lamp, 0.16, 3.2, C.white, 2.6, 10.3, 0); CY(lamp, 0.42, 0.25, C.white, 2.6, 11.7, 0);
    [[1.5, 1.4], [4.0, -1.2]].forEach(([lx, lz]) => {
      const arm = B(lamp, Math.hypot(lx - 2.6, lz), 0.14, 0.14, C.white, (2.6 + lx) / 2, 8.75, lz / 2); arm.rotation.y = -Math.atan2(lz, lx - 2.6);
      CY(lamp, 0.08, 0.7, C.white, lx, 8.45, lz);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 0.42, 28), C.white); head.position.set(lx, 7.95, lz); lamp.add(head);
      const em = new THREE.Mesh(new THREE.CircleGeometry(0.78, 28), C.lampEm); em.rotation.x = PI / 2; em.position.set(lx, 7.73, lz); lamp.add(em);
      const gl = new THREE.Sprite(C.glow); gl.scale.set(3.6, 3.6, 1); gl.position.set(lx, 7.55, lz); lamp.add(gl);
    });
    const spot = new THREE.SpotLight(0xfff6ea, 1.4, 22, 0.5, 0.6, 1); spot.position.set(2.6, 7.6, 0); spot.target.position.set(2.6, 2.6, 0); lamp.add(spot); lamp.add(spot.target);
    (viewer.medLamp = viewer.medLamp || []).push(lamp);
    // anaesthesia machine and monitors
    R(g, 1.6, 3.6, 1.4, C.cab, 6.6, 1.8, -2.2, 0.1); B(g, 1.7, 0.1, 1.5, C.steel, 6.6, 3.62, -2.2);
    screen(g, 1.4, 0.9, C.vitals, 6.6, 4.45, -2.2, -PI / 2 + 0.35);
    CY(g, 0.18, 1.5, C.blue, 7.25, 1.0, -1.6); CY(g, 0.18, 1.5, C.green, 7.25, 1.0, -2.8);
    CY(g, 0.05, 5.6, C.steel, 0.2, 2.8, 2.0); screen(g, 1.3, 0.85, C.vitals, 0.2, 5.2, 2.0, -PI / 2 + 0.3);
    // instrument trolleys
    [[-0.9, -1.8], [5.0, 1.9]].forEach(([x, z]) => {
      B(g, 2.4, 0.08, 1.4, C.steel, x, 2.75, z); B(g, 2.4, 0.08, 1.4, C.steel, x, 0.9, z);
      [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].forEach(([a, b]) => CY(g, 0.04, 2.7, C.steel, x + a, 1.4, z + b, 'y', 8));
      for (let i = 0; i < 6; i++) B(g, 0.5, 0.05, 0.08, C.brushed, x - 0.9 + i * 0.36, 2.82, z);
    });
    // cabinets along the -z wing; recovery beds in the +z wing
    B(g, 16.4, 2.9, 1.7, C.cab, -0.4, 1.45, -10.0); B(g, 16.6, 0.12, 1.8, C.steel, -0.4, 2.95, -10.0);
    B(g, 16.4, 2.0, 1.2, C.cab, -0.4, 5.6, -10.25);
    for (let i = 0; i < 10; i++) B(g, 0.03, 2.6, 0.02, C.midgrey, -8.2 + i * 1.64, 1.45, -9.14);
    [-5.6, 1.0].forEach(x => {
      R(g, 6.4, 0.5, 3.0, C.white, x, 1.9, 8.2, 0.1); R(g, 6.0, 0.35, 2.7, C.sheet, x, 2.3, 8.2, 0.12); R(g, 1.2, 0.3, 2.1, C.sheet, x - 2.4, 2.6, 8.2, 0.14);
      B(g, 0.12, 1.4, 3.0, C.white, x - 3.2, 2.4, 8.2); B(g, 0.12, 1.0, 3.0, C.white, x + 3.2, 2.2, 8.2);
      [[-2.8, 7.0], [2.8, 7.0], [-2.8, 9.4], [2.8, 9.4]].forEach(([a, z]) => CY(g, 0.06, 1.7, C.midgrey, x + a, 0.85, z, 'y', 8));
      CY(g, 0.04, 5.8, C.steel, x + 3.6, 2.9, 6.6, 'y', 8); R(g, 0.4, 0.7, 0.15, C.sheet, x + 3.6, 5.4, 6.6, 0.05);
    });
  }

  function kitchen(g) {
    floorOverlay(g, C.floorQuarry);
    // prep island
    B(g, 8.4, 0.14, 2.4, C.steel, 1.6, 2.95, 0); B(g, 8.2, 0.08, 2.2, C.steel, 1.6, 0.7, 0);
    [[-2.4, -1.0], [5.6, -1.0], [-2.4, 1.0], [5.6, 1.0]].forEach(([x, z]) => B(g, 0.12, 2.9, 0.12, C.steel, x, 1.45, z));
    B(g, 2.2, 0.1, 1.4, C.cutting, 0.4, 3.07, 0.2);
    [[2.8, 0.3, 0.55], [4.2, -0.4, 0.45], [-1.4, 0.5, 0.4]].forEach(([x, z, r]) => { CY(g, r, r * 1.3, C.steel, x, 3.02 + r * 0.65, z, 'y', 22); });
    for (let i = 0; i < 4; i++) CY(g, 0.3, 0.12, C.steel, -1.6 + i * 0.7, 1.5, 0.4, 'y', 16);
    // cooking line on the +z wing
    const wz = 9.9;
    B(g, 17.6, 3.2, 0.06, C.brushed, -0.2, 4.1, 10.75);
    [-6.6, -3.6, 2.6, 5.6].forEach((x, i) => {
      R(g, 2.9, 2.85, 2.6, C.steel, x, 1.43, wz, 0.05); B(g, 2.3, 1.4, 0.04, C.black, x, 1.35, wz - 1.31); B(g, 2.2, 0.08, 0.1, C.brushed, x, 2.3, wz - 1.36);
      if (i < 2) { B(g, 2.9, 0.1, 2.6, C.black, x, 2.91, wz); [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach(([a, b]) => { CY(g, 0.38, 0.06, C.grey, x + a, 3.0, wz + b, 'y', 16); for (let k = 0; k < 2; k++) B(g, k ? 0.06 : 0.9, 0.04, k ? 0.9 : 0.06, C.black, x + a, 3.05, wz + b); }); }
      else B(g, 2.9, 0.12, 2.6, i === 2 ? C.grey : C.steel, x, 2.92, wz);
    });
    B(g, 2.9, 2.85, 2.6, C.steel, -0.5, 1.43, wz); B(g, 2.2, 0.5, 1.8, C.black, -0.5, 2.7, wz); B(g, 1.0, 0.4, 0.8, C.brushed, -0.9, 3.15, wz - 0.3);
    // extraction hood
    R(g, 17.6, 1.1, 3.1, C.steel, -0.2, 6.15, 9.75, 0.12); B(g, 17.2, 0.06, 2.6, C.black, -0.2, 5.58, 9.75);
    // sinks, fridges and shelving on the -z wing
    B(g, 6.6, 2.9, 2.4, C.steel, -4.6, 1.45, -9.8); B(g, 6.7, 0.12, 2.5, C.steel, -4.6, 2.95, -9.8);
    [-6.4, -4.6, -2.8].forEach(x => { B(g, 1.5, 0.5, 1.6, C.grey, x, 2.75, -9.7); const f = CY(g, 0.05, 0.9, C.steel, x, 3.4, -10.65, 'y', 8); const sp = B(g, 0.08, 0.08, 0.6, C.steel, x, 3.85, -10.4); });
    [2.0, 4.8].forEach(x => { B(g, 2.7, 6.6, 2.6, C.fridge, x, 3.3, -9.8); });
    B(g, 2.4, 0.08, 1.8, C.brushed, 8.1, 1.2, -9.6); B(g, 2.4, 0.08, 1.8, C.brushed, 8.1, 3.0, -9.6); B(g, 2.4, 0.08, 1.8, C.brushed, 8.1, 4.8, -9.6);
    [[1.2, '#d9d2c3'], [3.0, '#2a5fa8'], [4.8, '#b3261e']].forEach(([y], j) => { for (let i = 0; i < 4; i++) B(g, 0.45, 0.6, 0.9, j === 1 ? C.blue : j === 2 ? C.red : C.cutting, 7.3 + i * 0.55, y + 0.35, -9.6); });
  }

  function workshop(g) {
    floorOverlay(g, C.floorPlate);
    [1, -1].forEach(sz => {
      const z = sz * 9.9;
      B(g, 15.6, 0.22, 2.3, C.wood, -0.6, 3.05, z); B(g, 15.4, 0.1, 2.1, C.grey, -0.6, 0.9, z);
      [-8.2, -3.2, 2.0, 7.0].forEach(x => { B(g, 0.15, 3.0, 0.15, C.grey, x, 1.5, z - sz * 0.95); B(g, 0.15, 3.0, 0.15, C.grey, x, 1.5, z + sz * 0.95); });
      const peg = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 3.0), C.peg); peg.position.set(-0.6, 4.7, sz * 10.7); if (sz > 0) peg.rotation.y = PI; g.add(peg);
      R(g, 0.9, 0.55, 0.6, C.grey, -6.5, 3.45, z - sz * 0.7, 0.05); B(g, 0.12, 0.12, 1.0, C.midgrey, -6.5, 3.45, z - sz * 1.15);
      [[-3, 0.18, 0.5], [-1.5, 0.12, 0.9], [1.4, 0.3, 0.3], [4.5, 0.2, 0.7]].forEach(([x, h, w]) => B(g, w, h, 0.5, x === 1.4 ? C.red : C.midgrey, x, 3.2 + h / 2, z - sz * 0.4));
      // rolling tool chests
      B(g, 2.6, 3.4, 1.7, C.drawersRed, -8.0, 1.85, sz * 7.6); B(g, 2.7, 0.1, 1.8, C.black, -8.0, 3.58, sz * 7.6);
      [[-9.0, 6.9], [-7.0, 6.9], [-9.0, 8.3], [-7.0, 8.3]].forEach(([x, zz]) => CY(g, 0.14, 0.12, C.black, x, 0.08, sz * zz, 'x', 10));
    });
    // wheel balancer with a mounted tire
    R(g, 2.2, 3.0, 1.8, C.midgrey, 1.6, 1.5, 0.6, 0.1); B(g, 2.3, 0.1, 1.9, C.black, 1.6, 3.05, 0.6);
    CY(g, 0.12, 1.8, C.steel, 1.6, 3.4, -0.6, 'z', 12);
    const t = new THREE.Mesh(tireGeo(1.25, 0.75), C.rubber); t.rotation.x = PI / 2; t.position.set(1.6, 3.4, -1.1); g.add(t);
    CY(g, 0.72, 0.55, C.brushed, 1.6, 3.4, -1.1, 'z', 22);
    R(g, 2.6, 0.2, 1.4, C.midgrey, 1.6, 4.9, -1.1, 0.08);
    // stacked tires and a compressor
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(tireGeo(1.25, 0.75), C.rubber); s.position.set(7.6, 0.4 + i * 0.78, -2.2); g.add(s); }
    const lean = new THREE.Mesh(tireGeo(1.25, 0.75), C.rubber); lean.rotation.x = PI / 2; lean.rotation.z = 0.25; lean.position.set(7.9, 1.3, 1.2); g.add(lean);
    CY(g, 0.75, 3.0, C.red, -1.4, 0.9, -6.4, 'x', 22); B(g, 1.2, 0.9, 1.0, C.grey, -1.4, 2.1, -6.4); CY(g, 0.35, 0.4, C.black, -0.8, 2.1, -5.9, 'z', 16);
    // high-bay lights
    [[-5, 0], [1, 0], [6, 0], [-3, 7.5], [4, 7.5], [-3, -7.5], [4, -7.5]].forEach(([x, z]) => { CY(g, 0.6, 0.35, C.grey, x, 6.7, z, 'y', 20); const e = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), C.highbay); e.rotation.x = PI / 2; e.position.set(x, 6.51, z); g.add(e); });
  }

  window.WH_FITOUTS = {
    build(kind, dims, viewer) {
      mats();
      const g = new THREE.Group(); g.name = 'fitout-' + kind;
      ({ command, medical, kitchen, workshop })[kind](g, viewer);
      g.traverse(o => { if (o.isMesh) { const big = o.geometry === BOX ? o.scale.x * o.scale.y * o.scale.z > 0.02 : true; o.castShadow = big && !(o.material && o.material.isMeshBasicMaterial); o.receiveShadow = true; } });
      return g;
    }
  };
})();
