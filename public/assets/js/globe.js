/* Weatherhaven deployment globe.
   - 162 sites from Weatherhaven's public deployment map, as colour-coded spikes
   - featured locations (with stories and photos) as pulsing markers, with arcs from head office
   - three views: satellite (NASA Blue Marble), night (NASA Black Marble), field (dot matrix)
   Textures load lazily the first time the globe is on screen. */
(function () {
  const DEG = Math.PI / 180;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIN = h => new THREE.Color(h).convertSRGBToLinear();
  const TYPE_COL = { def: 0xEE8400, med: 0xFF5A5F, com: 0x3FC1C9, office: 0xffffff };
  const SECTOR_TYPE = { military: 'def', medical: 'med', commercial: 'com', office: 'office' };

  function ll(lat, lon, r) {
    const phi = (90 - lat) * DEG, th = (lon + 180) * DEG;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }
  function decodeLand(b64) {
    const bin = atob(b64), n = bin.length / 2, out = new Int16Array(n);
    for (let i = 0; i < n; i++) { let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8); if (v > 32767) v -= 65536; out[i] = v; }
    return out;
  }
  function dotTex(fill) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = fill; x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  }

  class Globe {
    constructor(el, places, onSelect, onHover, opts) {
      opts = opts || {};
      this.el = el; this.places = places; this.onSelect = onSelect; this.onHover = onHover;
      this.sites = opts.sites || []; this.onSite = opts.onSite; this.texBase = opts.texBase || '/assets/globe/';
      this.onUser = opts.onUser; this.onView = opts.onView;
      this.ok = false;
      try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
      if (!this.renderer.getContext()) return;
      this.ok = true;
      const r = this.renderer;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.outputEncoding = THREE.sRGBEncoding;
      r.domElement.className = 'globe-canvas';
      r.domElement.setAttribute('role', 'img');
      r.domElement.setAttribute('aria-label', 'Globe showing Weatherhaven deployment sites, offices and project stories. Use the filters and the list to explore each location.');
      el.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      this.camera.position.set(0, 0, 5.2); this.scene.add(this.camera);
      this.zoom = 1; this.zoomT = 1;
      this.group = new THREE.Group(); this.scene.add(this.group);
      this.rx = 0.35; this.ry = -2.2; this.vx = 0; this.vy = 0; this.tween = null; this.idle = 10;
      this.filter = 'all';

      // lights (for the satellite view); the key light rides with the camera
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.62));
      const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(-2.2, 1.6, 3); this.camera.add(key);

      // earth: one sphere, material swapped per view
      this.matField = new THREE.MeshBasicMaterial({ color: LIN(0x0b2945) });
      this.earth = new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), this.matField);
      this.group.add(this.earth);

      // atmosphere
      this.atmU = { uCol: { value: new THREE.Vector3(0.24, 0.52, 0.85) }, uK: { value: 1.6 } };
      const atm = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 48), new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: this.atmU,
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform vec3 uCol; uniform float uK; varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(uCol,1.0)*i*uK; }'
      }));
      this.scene.add(atm);

      // field view layers: graticule + land dots
      this.field = new THREE.Group(); this.group.add(this.field);
      const gm = new THREE.LineBasicMaterial({ color: LIN(0x1d4a73), transparent: true, opacity: 0.35 });
      for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let lon = -180; lon <= 180; lon += 4) pts.push(ll(lat, lon, 1.001)); this.field.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
      for (let lon = -180; lon < 180; lon += 30) { const pts = []; for (let lat = -90; lat <= 90; lat += 4) pts.push(ll(lat, lon, 1.001)); this.field.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
      if (window.LAND_B64) {
        const L = decodeLand(window.LAND_B64), n = L.length / 2, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const v = ll(L[i * 2] / 10, L[i * 2 + 1] / 10, 1.003); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.field.add(new THREE.Points(lg, new THREE.PointsMaterial({ size: 0.021, map: dotTex('#fff'), color: LIN(0x8db3da), transparent: true, alphaTest: 0.4, sizeAttenuation: true })));
      }

      // deployment sites: spike + base dot, coloured by type
      const S = this.sites, ns = S.length;
      if (ns) {
        const sg = new THREE.CylinderGeometry(0.0042, 0.0042, 1, 6, 1, true); sg.translate(0, 0.5, 0); sg.rotateX(Math.PI / 2);
        this.spikes = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false }), ns);
        const bp = new Float32Array(ns * 3), bc = new Float32Array(ns * 3), o = new THREE.Object3D(), col = new THREE.Color();
        this.sitePos = [];
        S.forEach((s, i) => {
          const v = ll(s.lat, s.lon, 1.0); this.sitePos.push(v);
          s._h = 0.05 + ((i * 37) % 11) / 11 * 0.035;
          o.position.copy(v); o.lookAt(v.clone().multiplyScalar(2)); o.scale.set(1, 1, s._h); o.updateMatrix();
          this.spikes.setMatrixAt(i, o.matrix);
          col.copy(LIN(TYPE_COL[s.t] || 0xffffff)); this.spikes.setColorAt(i, col);
          const b = ll(s.lat, s.lon, 1.004); bp[i * 3] = b.x; bp[i * 3 + 1] = b.y; bp[i * 3 + 2] = b.z;
          bc[i * 3] = col.r; bc[i * 3 + 1] = col.g; bc[i * 3 + 2] = col.b;
        });
        this.spikes.instanceMatrix.needsUpdate = true; if (this.spikes.instanceColor) this.spikes.instanceColor.needsUpdate = true;
        this.group.add(this.spikes);
        const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
        this.siteDots = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.026, map: dotTex('#fff'), vertexColors: true, transparent: true, alphaTest: 0.4, sizeAttenuation: true }));
        this.group.add(this.siteDots);
        // highlight for a picked site
        this.pickRing = new THREE.Mesh(new THREE.RingGeometry(0.022, 0.03, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        this.group.add(this.pickRing);
      }

      // featured places: dot + pulsing ring + arc from head office
      this.markers = []; this.arcs = {};
      const hq = places.find(p => p.id === 'burnaby') || places[0];
      const hqv = ll(hq.lat, hq.lon, 1.0);
      places.forEach(p => {
        const office = p.kind === 'office';
        const t = SECTOR_TYPE[p.sector] || 'def', colr = TYPE_COL[t];
        const v = ll(p.lat, p.lon, 1.008);
        const dot = new THREE.Mesh(new THREE.CircleGeometry(office ? 0.016 : 0.021, 24), new THREE.MeshBasicMaterial({ color: LIN(colr), side: THREE.DoubleSide }));
        dot.position.copy(v); dot.lookAt(v.clone().multiplyScalar(2)); this.group.add(dot);
        const rim = new THREE.Mesh(new THREE.RingGeometry(office ? 0.016 : 0.021, office ? 0.021 : 0.027, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        rim.position.copy(ll(p.lat, p.lon, 1.0085)); rim.lookAt(v.clone().multiplyScalar(2)); this.group.add(rim);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.026, 0.032, 32), new THREE.MeshBasicMaterial({ color: LIN(colr), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
        ring.position.copy(ll(p.lat, p.lon, 1.009)); ring.lookAt(v.clone().multiplyScalar(2)); this.group.add(ring);
        this.markers.push({ p, t, v, dot, rim, ring, phase: Math.random() * 6 });
        if (p.id !== hq.id) {
          const b = ll(p.lat, p.lon, 1.0), ang = hqv.angleTo(b);
          const mid = hqv.clone().add(b).normalize().multiplyScalar(1 + 0.12 + ang * 0.16);
          const curve = new THREE.QuadraticBezierCurve3(hqv.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), new THREE.LineBasicMaterial({ color: LIN(office ? 0xbfd6ee : 0xee8400), transparent: true, opacity: 0.2 }));
          this.group.add(line); this.arcs[p.id] = line;
        }
      });

      this.view = 'field'; this.tex = {};
      this.wantView = opts.view || 'satellite';
      this.bind();
      this.loop = this.loop.bind(this); this.clock = new THREE.Clock();
      this.io = new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible) { if (!this.texStarted) { this.texStarted = true; this.setView(this.wantView); } this.start(); }
      }, { threshold: 0.01, rootMargin: '200px' });
      this.io.observe(el);
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
      this.resize();
    }

    /* ---------- views ---------- */
    big() { return (this.el.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) > 1100 && !matchMedia('(max-width: 759px)').matches; }
    loadTex(name) {
      if (this.tex[name]) return this.tex[name];
      const file = name === 'bump' ? 'earth-bump-2048.webp' : `earth-${name}-${this.big() ? 4096 : 2048}.webp`;
      this.tex[name] = new Promise(res => {
        new THREE.TextureLoader().load(this.texBase + file, t => {
          if (name !== 'bump') t.encoding = THREE.sRGBEncoding;
          t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
          res(t);
        }, undefined, () => res(null));
      });
      return this.tex[name];
    }
    setView(v) {
      this.wantView = v; this.texStarted = true;
      const apply = (mat, field, atm) => {
        if (this.wantView !== v) return;
        this.view = v; this.earth.material = mat; this.field.visible = field;
        this.atmU.uCol.value.set(...atm[0]); this.atmU.uK.value = atm[1];
        if (this.siteDots) this.siteDots.material.size = v === 'field' ? 0.026 : 0.022;
        this.onView && this.onView(v);
        this.render(); this.start();
      };
      if (v === 'field') return apply(this.matField, true, [[0.24, 0.52, 0.85], 1.25]);
      if (v === 'night') {
        if (this.matNight) return apply(this.matNight, false, [[0.16, 0.3, 0.58], 0.95]);
        return this.loadTex('night').then(t => { if (!t) return; this.matNight = new THREE.MeshBasicMaterial({ map: t, color: LIN(0xdfe7ff) }); apply(this.matNight, false, [[0.16, 0.3, 0.58], 0.95]); });
      }
      if (this.matSat) return apply(this.matSat, false, [[0.3, 0.55, 0.95], 1.15]);
      return Promise.all([this.loadTex('day'), this.loadTex('bump')]).then(([d, b]) => {
        if (!d) return;
        this.matSat = new THREE.MeshPhongMaterial({ map: d, bumpMap: b || null, bumpScale: 0.012, specular: LIN(0x1c2a3a), shininess: 9 });
        apply(this.matSat, false, [[0.3, 0.55, 0.95], 1.15]);
      });
    }

    /* ---------- filter ---------- */
    setFilter(f) {
      this.filter = f;
      const on = t => f === 'all' || f === t;
      if (this.spikes) {
        const o = new THREE.Object3D(), cols = this.siteDots.geometry.attributes.color;
        this.sites.forEach((s, i) => {
          const v = this.sitePos[i], vis = on(s.t);
          o.position.copy(v); o.lookAt(v.clone().multiplyScalar(2)); o.scale.set(vis ? 1 : 0.0001, vis ? 1 : 0.0001, vis ? s._h : 0.0001); o.updateMatrix();
          this.spikes.setMatrixAt(i, o.matrix);
        });
        this.spikes.instanceMatrix.needsUpdate = true;
        // hide dots by pushing them inside the globe
        const p = this.siteDots.geometry.attributes.position;
        this.sites.forEach((s, i) => { const v = ll(s.lat, s.lon, on(s.t) ? 1.004 : 0.5); p.setXYZ(i, v.x, v.y, v.z); });
        p.needsUpdate = true; cols.needsUpdate = true;
      }
      this.markers.forEach(m => { const vis = on(m.t); m.dot.visible = m.rim.visible = m.ring.visible = vis; if (this.arcs[m.p.id]) this.arcs[m.p.id].visible = vis; });
      this.render(); this.start();
    }

    /* ---------- zoom ---------- */
    zoomBy(k) { this.zoomT = Math.max(1, Math.min(2.6, this.zoomT * k)); this.idle = 0; this.start(); }

    resize() {
      const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
      this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
      this.camera.aspect = w / h; this.baseZ = (w / h < 1 ? 5.2 / (w / h) : 5.2); this.camera.position.z = this.baseZ / this.zoom; this.camera.updateProjectionMatrix(); this.render();
    }

    bind() {
      const el = this.renderer.domElement; el.style.touchAction = 'pan-y';
      let down = false, lx = 0, ly = 0, moved = 0, id = null;
      el.addEventListener('pointerdown', e => { down = true; id = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0; this.tween = null; el.setPointerCapture(id); el.classList.add('grabbing'); });
      el.addEventListener('pointermove', e => {
        if (down && e.pointerId === id) {
          const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
          const k = 1 / this.zoom;
          this.vy = dx * 0.005 * k; this.vx = dy * 0.004 * k; this.ry += this.vy; this.rx = Math.max(-1.25, Math.min(1.25, this.rx + this.vx)); this.idle = 0; this.start();
          if (moved > 6 && this.onUser) this.onUser();
        } else { this.hover(e); }
      });
      const up = e => {
        if (!down || e.pointerId !== id) return; down = false; el.classList.remove('grabbing');
        try { el.releasePointerCapture(id); } catch (_) { }
        if (moved < 6) {
          const hit = this.pick(e);
          if (hit) { this.onUser && this.onUser(); if (hit.kind === 'place') this.onSelect && this.onSelect(hit.p.id, true); else this.onSite && this.onSite(hit.i); }
        }
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', () => { this.onHover && this.onHover(null); el.style.cursor = ''; });
    }
    // screen-space pick: nearest visible, front-facing marker within a few pixels
    pick(e) {
      const r = this.renderer.domElement.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      this.group.updateMatrixWorld();
      const m = this.group.matrixWorld, w = new THREE.Vector3(), on = t => this.filter === 'all' || this.filter === t;
      let best = null, bd = 13 * 13;
      const test = (v, item, bonus) => {
        w.copy(v).applyMatrix4(m); if (w.z < 0.2) return;
        w.project(this.camera); const sx = (w.x + 1) / 2 * r.width, sy = (1 - w.y) / 2 * r.height;
        const d = (sx - mx) ** 2 + (sy - my) ** 2 - bonus; if (d < bd) { bd = d; best = item; }
      };
      this.markers.forEach(mk => { if (on(mk.t)) test(mk.v, { kind: 'place', p: mk.p }, 40); });
      this.sites.forEach((s, i) => { if (on(s.t)) test(this.sitePos[i], { kind: 'site', s, i }, 0); });
      return best;
    }
    hover(e) {
      const hit = this.pick(e);
      this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
      if (!this.onHover) return;
      if (!hit) return this.onHover(null);
      const r = this.renderer.domElement.getBoundingClientRect();
      this.onHover(hit, e.clientX - r.left, e.clientY - r.top);
    }

    turnTo(lat, lon) {
      let ty = -Math.PI / 2 - lon * DEG;
      while (ty - this.ry > Math.PI) ty -= Math.PI * 2;
      while (ty - this.ry < -Math.PI) ty += Math.PI * 2;
      const tx = Math.max(-1.25, Math.min(1.25, lat * DEG * 0.85));
      this.tween = { fx: this.rx, fy: this.ry, tx, ty, t: 0 };
      this.vx = this.vy = 0; this.idle = 0;
    }
    focus(id) {
      const p = this.places.find(x => x.id === id); if (!p) return;
      this.selected = id; this.siteSel = null; if (this.pickRing) this.pickRing.material.opacity = 0;
      this.turnTo(p.lat, p.lon);
      Object.entries(this.arcs).forEach(([k, a]) => { a.material.opacity = k === id ? 0.95 : 0.12; a.geometry.setDrawRange(0, k === id ? 0 : Infinity); });
      this.drawT = 0;
      this.markers.forEach(m => { const s = m.p.id === id ? 1.7 : 1; m.dot.scale.setScalar(s); m.rim.scale.setScalar(s); });
      if (reduce && this.arcs[id]) this.arcs[id].geometry.setDrawRange(0, Infinity);
      this.start();
    }
    focusSite(i) {
      const s = this.sites[i]; if (!s) return;
      this.selected = null; this.siteSel = i;
      this.turnTo(s.lat, s.lon);
      Object.values(this.arcs).forEach(a => { a.material.opacity = 0.12; a.geometry.setDrawRange(0, Infinity); });
      this.markers.forEach(m => { m.dot.scale.setScalar(1); m.rim.scale.setScalar(1); });
      const v = ll(s.lat, s.lon, 1.006); this.pickRing.position.copy(v); this.pickRing.lookAt(v.clone().multiplyScalar(2)); this.pickRing.material.opacity = 1;
      this.start();
    }

    start() { if (!this.running && this.visible && !document.hidden) { this.running = true; this.clock.getDelta(); requestAnimationFrame(this.loop); } }
    loop() {
      if (!this.visible || document.hidden) { this.running = false; return; }
      const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
      this.idle += dt;
      if (Math.abs(this.zoomT - this.zoom) > 0.001) { this.zoom += (this.zoomT - this.zoom) * Math.min(1, dt * 8); this.camera.position.z = this.baseZ / this.zoom; }
      if (this.tween) {
        const k = this.tween; k.t = Math.min(1, k.t + dt / (reduce ? 0.01 : 1.3));
        const e = k.t < 0.5 ? 4 * k.t ** 3 : 1 - Math.pow(-2 * k.t + 2, 3) / 2;
        this.rx = k.fx + (k.tx - k.fx) * e; this.ry = k.fy + (k.ty - k.fy) * e;
        if (k.t >= 1) this.tween = null;
      } else if (Math.abs(this.vy) > 0.0001 || Math.abs(this.vx) > 0.0001) {
        this.ry += this.vy; this.rx = Math.max(-1.25, Math.min(1.25, this.rx + this.vx)); this.vy *= 0.92; this.vx *= 0.9;
      } else if (this.idle > 6 && !reduce && !this.hold) { this.ry += dt * 0.05; }
      this.group.rotation.set(this.rx, this.ry, 0);
      if (this.selected && this.arcs[this.selected]) { this.drawT = Math.min(81, (this.drawT || 0) + dt * 90); this.arcs[this.selected].geometry.setDrawRange(0, Math.floor(this.drawT)); }
      if (!reduce) {
        this.markers.forEach(m => { const s = 1 + ((t * 0.7 + m.phase) % 1) * 1.6; m.ring.scale.setScalar(s); m.ring.material.opacity = 0.65 * (1 - (s - 1) / 1.6); });
        if (this.siteSel != null) { const s = 1 + 0.25 * Math.sin(t * 5); this.pickRing.scale.setScalar(s); }
      }
      this.render();
      requestAnimationFrame(this.loop);
    }
    render() { this.renderer.render(this.scene, this.camera); }
    destroy() { this.io.disconnect(); this.ro.disconnect(); this.running = false; this.visible = false; this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); }
  }
  window.Globe = Globe;
})();
