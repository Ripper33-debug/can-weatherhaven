/* Interactive dot-matrix globe of Weatherhaven deployments and offices. */
(function () {
  const DEG = Math.PI / 180;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIN = h => new THREE.Color(h).convertSRGBToLinear();

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
    const t = new THREE.CanvasTexture(c); return t;
  }

  class Globe {
    constructor(el, places, onSelect, onHover) {
      this.el = el; this.places = places; this.onSelect = onSelect; this.onHover = onHover;
      this.ok = false;
      try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
      this.ok = true;
      const r = this.renderer;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.outputEncoding = THREE.sRGBEncoding;
      r.domElement.className = 'globe-canvas';
      r.domElement.setAttribute('role', 'img');
      r.domElement.setAttribute('aria-label', 'Globe showing Weatherhaven deployments and offices. Use the list to explore each location.');
      el.appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      this.camera.position.set(0, 0, 4.4);
      this.group = new THREE.Group(); this.scene.add(this.group);
      this.rx = 0.35; this.ry = -2.2; this.vx = 0; this.vy = 0; this.tween = null; this.idle = 10;

      // core sphere
      this.group.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshBasicMaterial({ color: LIN(0x0b2945) })));
      // atmosphere
      const atm = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 48), new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(0.24,0.52,0.85,1.0)*i*1.6; }'
      }));
      this.scene.add(atm);
      // graticule
      const gm = new THREE.LineBasicMaterial({ color: LIN(0x1d4a73), transparent: true, opacity: 0.35 });
      for (let lat = -60; lat <= 60; lat += 30) { const pts = []; for (let lon = -180; lon <= 180; lon += 4) pts.push(ll(lat, lon, 1.001)); this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }
      for (let lon = -180; lon < 180; lon += 30) { const pts = []; for (let lat = -90; lat <= 90; lat += 4) pts.push(ll(lat, lon, 1.001)); this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gm)); }

      // land dots
      const L = decodeLand(window.LAND_B64), n = L.length / 2, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const v = ll(L[i * 2] / 10, L[i * 2 + 1] / 10, 1.003); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.group.add(new THREE.Points(lg, new THREE.PointsMaterial({ size: 0.021, map: dotTex('#fff'), color: LIN(0x8db3da), transparent: true, alphaTest: 0.4, sizeAttenuation: true })));

      // markers + arcs
      this.markers = []; this.hits = []; this.arcs = {};
      const hq = places.find(p => p.id === 'burnaby');
      const hqv = ll(hq.lat, hq.lon, 1.0);
      places.forEach(p => {
        const office = p.kind === 'office';
        const v = ll(p.lat, p.lon, 1.006);
        const col = office ? 0xffffff : 0xee8400;
        const dot = new THREE.Mesh(new THREE.CircleGeometry(office ? 0.016 : 0.02, 24), new THREE.MeshBasicMaterial({ color: LIN(col), side: THREE.DoubleSide }));
        dot.position.copy(v); dot.lookAt(v.clone().multiplyScalar(2)); this.group.add(dot);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.03, 32), new THREE.MeshBasicMaterial({ color: LIN(col), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
        ring.position.copy(ll(p.lat, p.lon, 1.007)); ring.lookAt(v.clone().multiplyScalar(2)); this.group.add(ring);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.copy(v); hit.userData.place = p; this.group.add(hit); this.hits.push(hit);
        this.markers.push({ p, dot, ring, phase: Math.random() * 6 });
        if (p.id !== 'burnaby') {
          const b = ll(p.lat, p.lon, 1.0), ang = hqv.angleTo(b);
          const mid = hqv.clone().add(b).normalize().multiplyScalar(1 + 0.12 + ang * 0.16);
          const curve = new THREE.QuadraticBezierCurve3(hqv.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
          const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
          const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: LIN(office ? 0xbfd6ee : 0xee8400), transparent: true, opacity: 0.22 }));
          this.group.add(line); this.arcs[p.id] = line;
        }
      });

      this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2();
      this.bind();
      this.loop = this.loop.bind(this); this.clock = new THREE.Clock();
      this.io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.start(); }, { threshold: 0.01 });
      this.io.observe(el);
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
      this.resize();
    }

    resize() {
      const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
      this.renderer.setSize(w, h, false); this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
      this.camera.aspect = w / h; this.camera.position.z = (w / h < 1 ? 5.2 / (w / h) : 5.2); this.camera.updateProjectionMatrix(); this.render();
    }

    bind() {
      const el = this.renderer.domElement; el.style.touchAction = 'pan-y';
      let down = false, lx = 0, ly = 0, moved = 0, id = null;
      el.addEventListener('pointerdown', e => { down = true; id = e.pointerId; lx = e.clientX; ly = e.clientY; moved = 0; this.tween = null; el.setPointerCapture(id); el.classList.add('grabbing'); });
      el.addEventListener('pointermove', e => {
        if (down && e.pointerId === id) {
          const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
          this.vy = dx * 0.005; this.vx = dy * 0.004; this.ry += this.vy; this.rx = Math.max(-1.1, Math.min(1.1, this.rx + this.vx)); this.idle = 0; this.start();
        } else { this.hover(e); }
      });
      const up = e => {
        if (!down || e.pointerId !== id) return; down = false; el.classList.remove('grabbing');
        try { el.releasePointerCapture(id); } catch (_) { }
        if (moved < 6) { const p = this.pick(e); if (p) this.onSelect && this.onSelect(p.id, true); }
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', () => { this.onHover && this.onHover(null); el.style.cursor = ''; });
    }
    pick(e) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.mouse, this.camera);
      const hit = this.ray.intersectObjects(this.hits, false)[0];
      if (!hit) return null;
      // ignore markers on the far side
      const wp = hit.object.getWorldPosition(new THREE.Vector3());
      if (wp.z < 0.15) return null;
      return hit.object.userData.place;
    }
    hover(e) {
      const p = this.pick(e);
      this.renderer.domElement.style.cursor = p ? 'pointer' : '';
      if (this.onHover) {
        if (!p) return this.onHover(null);
        const r = this.renderer.domElement.getBoundingClientRect();
        this.onHover(p, e.clientX - r.left, e.clientY - r.top);
      }
    }

    focus(id) {
      const p = this.places.find(x => x.id === id); if (!p) return;
      this.selected = id;
      let ty = -Math.PI / 2 - p.lon * DEG;
      while (ty - this.ry > Math.PI) ty -= Math.PI * 2;
      while (ty - this.ry < -Math.PI) ty += Math.PI * 2;
      const tx = Math.max(-1.1, Math.min(1.1, p.lat * DEG * 0.85));
      this.tween = { fx: this.rx, fy: this.ry, tx, ty, t: 0 };
      this.vx = this.vy = 0; this.idle = 0;
      Object.entries(this.arcs).forEach(([k, a]) => { a.material.opacity = k === id ? 0.95 : 0.14; a.geometry.setDrawRange(0, k === id ? 0 : Infinity); });
      this.drawT = 0;
      this.markers.forEach(m => m.dot.scale.setScalar(m.p.id === id ? 1.7 : 1));
      if (reduce && this.arcs[id]) this.arcs[id].geometry.setDrawRange(0, Infinity);
      this.start();
    }

    start() { if (!this.running && this.visible && !document.hidden) { this.running = true; this.clock.getDelta(); requestAnimationFrame(this.loop); } }
    loop() {
      if (!this.visible || document.hidden) { this.running = false; return; }
      const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
      this.idle += dt;
      if (this.tween) {
        const k = this.tween; k.t = Math.min(1, k.t + dt / (reduce ? 0.01 : 1.1));
        const e = k.t < 0.5 ? 4 * k.t ** 3 : 1 - Math.pow(-2 * k.t + 2, 3) / 2;
        this.rx = k.fx + (k.tx - k.fx) * e; this.ry = k.fy + (k.ty - k.fy) * e;
        if (k.t >= 1) this.tween = null;
      } else if (Math.abs(this.vy) > 0.0001 || Math.abs(this.vx) > 0.0001) {
        this.ry += this.vy; this.rx = Math.max(-1.1, Math.min(1.1, this.rx + this.vx)); this.vy *= 0.92; this.vx *= 0.9;
      } else if (this.idle > 6 && !reduce) { this.ry += dt * 0.06; }
      this.group.rotation.set(this.rx, this.ry, 0);
      if (this.selected && this.arcs[this.selected]) { this.drawT = Math.min(81, (this.drawT || 0) + dt * 90); this.arcs[this.selected].geometry.setDrawRange(0, Math.floor(this.drawT)); }
      if (!reduce) this.markers.forEach(m => { const s = 1 + ((t * 0.7 + m.phase) % 1) * 1.6; m.ring.scale.setScalar(s); m.ring.material.opacity = 0.65 * (1 - (s - 1) / 1.6); });
      this.render();
      requestAnimationFrame(this.loop);
    }
    render() { this.renderer.render(this.scene, this.camera); }
    destroy() { this.io.disconnect(); this.ro.disconnect(); this.running = false; this.visible = false; this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); }
  }
  window.Globe = Globe;
})();
