/**
 * Walking round inside a shelter, the way a Matterport tour works: you stand at eye height, drag to
 * look around, and click (or tap) the floor to glide there, with a ring on the floor showing where
 * you'd land. Walls, furniture and low ceilings decide where you can stand, checked with rays
 * against the models themselves (each mesh gets a BVH, so a ray costs a fraction of a millisecond).
 * Arrow keys step and turn, for keyboard users. Where furniture leaves no floor to step onto (a crowded
 * command post), a key or a click goes on to the nearest stop that way instead.
 *
 * The stage (systemStage.ts, or treccStage.ts for the TRECC) flies the camera in and out and owns the
 * roof; this module only knows the room once you're standing in it.
 */
import * as THREE from "three";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";

/** Eye height above the floor (m). */
export const EYE = 1.6;
/** Clear height needed to stand somewhere. */
const HEAD = 1.85;
/** How far from walls and furniture you have to stay. */
const BODY_R = 0.24;
/** One press of an arrow key. */
const STEP = 0.8;
const TURN = Math.PI / 6;
/** Looking up and down (radians). */
const PITCH_MIN = THREE.MathUtils.degToRad(-70);
const PITCH_MAX = THREE.MathUtils.degToRad(55);

/**
 * A model's own start (spot, facing, looking down) and, for a shelter too low to stand up in, the eye
 * height to walk round it at (crouched; the headroom needed follows it). The spot is kept wherever
 * there's floor underfoot and headroom, close to a desk or not; one on a table or under a bunk moves to
 * the nearest clear floor within 0.6 m, failing which the room's own start is used.
 */
export type WalkOverrides = { start?: [number, number]; yaw?: number; pitch?: number; eye?: number };

/** What the room looks like to someone standing in it: worked out once, the first time you step in. */
export type WalkRoom = {
  floor: number;
  /** Where you stand on stepping in; null when nowhere in the room has standing height. */
  start: THREE.Vector3 | null;
  /** Facing down the room from the start (radians about +Y, three.js camera convention). */
  yaw: number;
  /** How far the view tips down at the start (radians; negative looks down). */
  pitch: number;
  /** Eye height above the floor while walking (m). */
  eye: number;
  /** Spots to walk to, along the room, shown as discs on the floor. */
  stops: THREE.Vector3[];
  /** The plan area you can walk in. */
  box: THREE.Box3;
  canStand: (x: number, z: number) => boolean;
  /**
   * Where a click along this ray would take you, or null when there's nowhere to go. `quick` (for the
   * ring that follows the pointer) only answers for floor under the pointer (or just beside it); a
   * click on a wall or a piece of furniture also goes to the floor short of it.
   */
  target: (ray: THREE.Ray, from: THREE.Vector3, quick?: boolean) => { point: THREE.Vector3; onFloor: boolean } | null;
  dispose: () => void;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Measures the room: the floor, where you can stand, a starting spot at one end looking down the
 * room, and stops along it. `meshes` is everything you can stand on or bump into; `room` is the part
 * of the plan you can walk in (the fit-out's extent, so a vestibule, a fly sheet's overhang or the
 * ground outside the door never count as the room).
 */
export function measureRoom(
  meshes: THREE.Mesh[],
  room: THREE.Box3,
  floorHint: number,
  startEnd: 1 | -1,
  overrides: WalkOverrides = {},
): WalkRoom {
  const box = room;
  // Crouched in a low shelter: the eye where it's asked for, and a little headroom above it.
  const eye = overrides.eye ?? EYE;
  const head = overrides.eye ? overrides.eye + 0.25 : HEAD;
  // A BVH per geometry (shared geometries once), and the fast raycast on these meshes only.
  const built: THREE.BufferGeometry[] = [];
  for (const m of meshes) {
    const g = m.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
    if (!g.boundsTree) {
      g.boundsTree = new MeshBVH(g);
      built.push(g);
    }
    m.raycast = acceleratedRaycast;
  }
  const rc = new THREE.Raycaster();
  (rc as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const o = new THREE.Vector3();
  const cast = (x: number, y: number, z: number, dir: THREE.Vector3, far: number) => {
    rc.set(o.set(x, y, z), dir);
    rc.near = 0;
    rc.far = far;
    return rc.intersectObjects(meshes, false)[0] ?? null;
  };

  // The floor: the most common level under a grid of points across the middle of the room, near the
  // fit-out's lowest point (tables and beds are higher, so they don't win).
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const levels = new Map<number, number>();
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 4; j++) {
      const x = c.x + (i / 8 - 0.5) * size.x * 0.7;
      const z = c.z + (j / 4 - 0.5) * size.z * 0.7;
      const hit = cast(x, floorHint + 1.0, z, down, 1.4);
      if (!hit || Math.abs(hit.point.y - floorHint) > 0.3) continue;
      const k = Math.round(hit.point.y * 100);
      levels.set(k, (levels.get(k) ?? 0) + 1);
    }
  }
  let floor = floorHint;
  let best = 0;
  for (const [k, n] of levels) if (n > best || (n === best && k / 100 > floor)) [floor, best] = [k / 100, n];

  const n3 = new THREE.Vector3();
  /** Whether a hit is on an upward-facing surface (a floor or a tabletop, not the underside of a wall). */
  const facesUp = (hit: THREE.Intersection) => !!hit.face && n3.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).y > 0.5;
  /** Open floor right here: nothing between the floor and head height. */
  const floorBelow = (x: number, z: number) => {
    const hit = cast(x, floor + head, z, down, head + 0.3);
    return !!hit && Math.abs(hit.point.y - floor) < 0.08 && facesUp(hit);
  };
  const RING = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * BODY_R, Math.sin((i * Math.PI) / 4) * BODY_R]);
  const inRoom = (x: number, z: number) => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z;
  /**
   * Floor right underfoot and headroom over it (an arch or a sloping wall overhead counts even where the
   * floor below is clear): enough for a model's own start, which may tuck you in beside a desk.
   */
  const roomFor = (x: number, z: number) => inRoom(x, z) && floorBelow(x, z) && !cast(x, floor + 0.3, z, up, head - 0.3);
  /** Somewhere to walk to: room for you, and clear of walls and furniture all round. */
  const canStand = (x: number, z: number) => {
    if (!roomFor(x, z)) return false;
    for (const [dx, dz] of RING) if (!floorBelow(x + dx, z + dz)) return false;
    return true;
  };

  // Long axis of the room; the start is at one end of it, looking down the room.
  const alongX = size.x >= size.z;
  const half = (alongX ? size.x : size.z) / 2;
  const across = alongX ? size.z : size.x;
  const at = (along: number, side: number) =>
    alongX ? new THREE.Vector3(c.x + along, floor, c.z + side) : new THREE.Vector3(c.x + side, floor, c.z + along);
  /** Spots you can stand on across the room at this point along it, nearest the centre line first. */
  const across_ = (along: number) => {
    const out: THREE.Vector3[] = [];
    for (let s = 0; s <= across * 0.48; s += 0.15) {
      for (const side of s === 0 ? [0] : [s, -s]) {
        const p = at(along, side);
        if (canStand(p.x, p.z)) out.push(p);
      }
    }
    return out;
  };
  const nearAcross = (along: number) => across_(along)[0] ?? null;
  /** How far you could walk straight on from p down the room from that end (0.4 m steps, up to 2.4 m). */
  const openAhead = (p: THREE.Vector3, from: 1 | -1) => {
    const ax = alongX ? -from : 0;
    const az = alongX ? 0 : -from;
    let d = 0;
    while (d < 2.4 && canStand(p.x + ax * (d + 0.4), p.z + az * (d + 0.4))) d += 0.4;
    return d;
  };
  /**
   * The best place to start at one end. The view matters most: near the middle of the end wall, close
   * to it, and with room to walk on ahead (not boxed in by a counter or a bed). A side aisle only wins
   * when the middle is blocked.
   */
  const startAt = (from: 1 | -1) => {
    let best = null as { p: THREE.Vector3; score: number } | null;
    for (let d = 0.6; d < Math.min(half, 2.7); d += 0.3) {
      const along = from * (half - d);
      for (let s = 0; s <= across * 0.48; s += 0.3) {
        for (const side of s === 0 ? [0] : [s, -s]) {
          const p = at(along, side);
          if (!canStand(p.x, p.z)) continue;
          const score = Math.min(openAhead(p, from), 1.6) - Math.abs(side) - 0.3 * (d - 0.6);
          if (!best || score > best.score) best = { p, score };
        }
      }
      // Middle of the end, clear ahead: nothing further in can beat it.
      if (best && best.score >= 1.6 - 0.3 * (d - 0.6) - 0.01) break;
    }
    return best;
  };
  /** The nearest spot you can stand on within `reach` of p (p itself first), or null. */
  const nearest = (p: THREE.Vector3, reach: number) => {
    if (canStand(p.x, p.z)) return p.clone();
    for (let r = 0.15; r <= reach + 1e-6; r += 0.15) {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const x = p.x + Math.cos(a) * r;
        const z = p.z + Math.sin(a) * r;
        if (canStand(x, z)) return new THREE.Vector3(x, floor, z);
      }
    }
    return null;
  };
  // The model's own spot when it has one (or the nearest clear floor beside it, should it land on a
  // table or under a bunk); otherwise the end nearer the camera, unless that end is boxed in (a kitchen
  // behind its serving counter, bunks) and the far end looks down an open room.
  let end = startEnd;
  let start: THREE.Vector3 | null = null;
  if (overrides.start) {
    const own = new THREE.Vector3(overrides.start[0], floor, overrides.start[1]);
    start = roomFor(own.x, own.z) ? own : nearest(own, 0.6);
    // The stops run from there to the far end, whichever side the camera came from.
    if (start) end = (alongX ? start.x - c.x : start.z - c.z) >= 0 ? 1 : -1;
  }
  // A spot of its own that's nowhere near clear floor takes its view with it.
  const ownView = !overrides.start || !!start;
  if (!start) {
    const near = startAt(startEnd);
    const far = !near || near.score < 1 ? startAt(-startEnd as 1 | -1) : null;
    if (far && (!near || far.score > near.score + 0.3)) {
      end = -startEnd as 1 | -1;
      start = far.p;
    } else start = near?.p ?? null;
  }
  const yaw =
    (ownView ? overrides.yaw : undefined) ??
    // Looking toward the other end (the camera looks down its own -Z).
    (alongX ? (end > 0 ? Math.PI / 2 : -Math.PI / 2) : end > 0 ? 0 : Math.PI);

  // Stops every couple of metres down the room, each nudged to a spot you can stand on.
  const stops: THREE.Vector3[] = start ? [start.clone()] : [];
  const startAlong = start ? (alongX ? start.x - c.x : start.z - c.z) : 0;
  const span = Math.abs(startAlong) + half;
  const n = start ? Math.max(1, Math.min(6, Math.round(span / 2.2))) : 0;
  for (let i = 1; i <= n; i++) {
    const along = startAlong - end * (span - 0.8) * (i / n);
    // Where furniture fills the room across, a little further on or back.
    let p: THREE.Vector3 | null = null;
    for (const shift of [0, -0.3, 0.3, -0.6, 0.6]) {
      p = nearAcross(along + shift);
      if (p) break;
    }
    if (p && stops.every((s) => s.distanceTo(p) > 1.2)) stops.push(p);
  }

  const target = (ray: THREE.Ray, from: THREE.Vector3, quick = false) => {
    rc.set(ray.origin, ray.direction);
    rc.near = 0.05;
    rc.far = 60;
    const hit = rc.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : up;
    const onFloor = normal.y > 0.8 && Math.abs(hit.point.y - floor) < 0.1;
    // On the floor: there, or the nearest spot you can stand on close by. On a wall or a piece of
    // furniture: the floor just in front of it, back toward you.
    const flat = new THREE.Vector3(hit.point.x - from.x, 0, hit.point.z - from.z);
    const dist = flat.length();
    if (dist < 0.3) return null;
    flat.normalize();
    const tryAt = (d: number) => {
      const x = from.x + flat.x * d;
      const z = from.z + flat.z * d;
      return canStand(x, z) ? new THREE.Vector3(x, floor, z) : null;
    };
    if (onFloor) {
      const here = tryAt(dist);
      if (here) return { point: here, onFloor };
      // Close to a chair or a desk: the nearest spot clear of it (the ring shows where that is).
      for (const r of [0.15, 0.3]) {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const x = hit.point.x + Math.cos(a) * r;
          const z = hit.point.z + Math.sin(a) * r;
          if (canStand(x, z)) return { point: new THREE.Vector3(x, floor, z), onFloor };
        }
      }
    }
    if (quick) return null;
    for (let d = dist - (onFloor ? 0.2 : 0.45); d > 0.35; d -= 0.15) {
      const p = tryAt(d);
      if (p) return { point: p, onFloor: false };
    }
    // Furniture all round the spot (a crowded command post): the stop nearest it, if one is close.
    let best: THREE.Vector3 | null = null;
    let bestD = 1.2;
    for (const s of stops) {
      const d = Math.hypot(s.x - hit.point.x, s.z - hit.point.z);
      if (d < bestD && Math.hypot(s.x - from.x, s.z - from.z) > 0.45) [best, bestD] = [s, d];
    }
    return best ? { point: best.clone(), onFloor: false } : null;
  };

  return {
    floor,
    start,
    yaw,
    pitch: (ownView ? overrides.pitch : undefined) ?? -0.06,
    eye,
    stops,
    box: box.clone(),
    canStand,
    target,
    dispose: () => {
      for (const g of built) (g as THREE.BufferGeometry & { boundsTree?: MeshBVH }).boundsTree = undefined;
    },
  };
}

export type WalkController = {
  /** Starts listening to the pointer and keys (the camera is already standing at the start). */
  attach: () => void;
  detach: () => void;
  /** Moves the camera along any glide or turn; true while something is still moving. */
  update: (now: number) => boolean;
  key: (k: "forward" | "back" | "left" | "right") => void;
  turn: (radians: number) => void;
  /** Where the camera is standing and which way it faces. */
  pose: () => { position: THREE.Vector3; yaw: number; pitch: number };
  dispose: () => void;
};

/** Pointer, touch and key handling for walking round a measured room. */
export function createWalkController(o: {
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  room: WalkRoom;
  reduced: boolean;
  onChange: () => void;
}): WalkController {
  const { camera, canvas, scene, room, reduced, onChange } = o;
  let yaw = room.yaw;
  let pitch = room.pitch;
  const pos = (room.start ?? new THREE.Vector3()).clone().setY(room.floor + room.eye);
  camera.rotation.order = "YXZ";
  let nudge = 0;
  let nudgeDir = new THREE.Vector3();
  const apply = () => {
    camera.position.copy(pos).addScaledVector(nudgeDir, nudge);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    camera.updateMatrixWorld();
  };
  apply();

  // The ring under the pointer, and a disc on each stop.
  const marks = new THREE.Group();
  marks.renderOrder = 10;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x0a0f17, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Group();
  ring.add(new THREE.Mesh(new THREE.RingGeometry(0.17, 0.215, 48), ringMat));
  ring.add(new THREE.Mesh(new THREE.RingGeometry(0.215, 0.245, 48), haloMat));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  marks.add(ring);
  const stopMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
  const stopGeo = new THREE.CircleGeometry(0.13, 32);
  const stopDiscs = room.stops.map((p) => {
    const d = new THREE.Mesh(stopGeo, stopMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(p.x, room.floor + 0.012, p.z);
    marks.add(d);
    return d;
  });
  for (const m of [ring, ...stopDiscs]) m.traverse((x) => (x.raycast = () => undefined));
  scene.add(marks);
  const showStops = () => stopDiscs.forEach((d) => (d.visible = Math.hypot(d.position.x - pos.x, d.position.z - pos.z) > 0.45));
  showStops();

  // Moves under way.
  let glide: { from: THREE.Vector3; to: THREE.Vector3; start: number; ms: number } | null = null;
  let spin: { from: number; to: number; start: number; ms: number } | null = null;
  let bump: { dir: THREE.Vector3; start: number } | null = null;
  const go = (to: THREE.Vector3) => {
    const dest = to.clone().setY(room.floor + room.eye);
    // Arriving on a stop lands exactly on it.
    const stop = room.stops.find((s) => Math.hypot(s.x - dest.x, s.z - dest.z) < 0.35);
    if (stop) dest.set(stop.x, room.floor + room.eye, stop.z);
    const d = dest.distanceTo(pos);
    if (d < 0.05) return;
    if (process.env.NODE_ENV !== "production") console.info(`[walk] ${pos.x.toFixed(2)},${pos.z.toFixed(2)} → ${dest.x.toFixed(2)},${dest.z.toFixed(2)}${stop ? " (stop)" : ""}`);
    if (reduced) {
      pos.copy(dest);
      apply();
      showStops();
      ring.visible = false;
    } else {
      glide = { from: pos.clone(), to: dest, start: performance.now(), ms: Math.min(1100, 320 + d * 170) };
      // The ring waits on the spot you're heading for.
      ring.position.set(dest.x, room.floor + 0.015, dest.z);
      ring.visible = true;
    }
    onChange();
  };
  const turnBy = (r: number) => {
    const to = (spin?.to ?? yaw) + r;
    if (reduced) {
      yaw = to;
      apply();
    } else spin = { from: yaw, to, start: performance.now(), ms: 260 };
    onChange();
  };

  // Pointer: drag to look (the view follows the pointer, as if you were pulling it round), click or
  // tap without dragging to walk.
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let down: { x: number; y: number; t: number; yaw: number; pitch: number; id: number } | null = null;
  let dragged = false;
  let hover: { x: number; y: number } | null = null;
  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const pick = (e: PointerEvent, quick = false) => {
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    return room.target(ray.ray, pos, quick);
  };
  const perPx = () => THREE.MathUtils.degToRad(camera.fov) / Math.max(1, canvas.clientHeight);
  const onDown = (e: PointerEvent) => {
    if (down || (e.pointerType === "mouse" && e.button !== 0)) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), yaw, pitch, id: e.pointerId };
    dragged = false;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!dragged && Math.hypot(dx, dy) > 5) {
        dragged = true;
        ring.visible = false;
        canvas.style.cursor = "grabbing";
      }
      if (dragged) {
        const k = perPx();
        spin = null;
        yaw = down.yaw + dx * k;
        pitch = THREE.MathUtils.clamp(down.pitch + dy * k, PITCH_MIN, PITCH_MAX);
        apply();
        onChange();
      }
      return;
    }
    if (e.pointerType === "mouse") {
      hover = { x: e.clientX, y: e.clientY };
      onChange();
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const click = !dragged && performance.now() - down.t < 700;
    down = null;
    canvas.style.cursor = "";
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (!click) return;
    const t = pick(e);
    if (t) go(t.point);
  };
  const onCancel = () => {
    down = null;
    canvas.style.cursor = "";
  };
  const onLeave = () => {
    hover = null;
    if (ring.visible) {
      ring.visible = false;
      onChange();
    }
  };
  const updateHover = () => {
    if (!hover || down || glide) return;
    const fake = { clientX: hover.x, clientY: hover.y } as PointerEvent;
    hover = null;
    const t = pick(fake, true);
    ring.visible = !!t;
    if (t) ring.position.set(t.point.x, room.floor + 0.015, t.point.z);
    canvas.style.cursor = t ? "pointer" : "grab";
  };

  let attached = false;
  let prevTouch = "";
  const attach = () => {
    if (attached) return;
    attached = true;
    prevTouch = canvas.style.touchAction;
    // Every drag looks around while walking (the page doesn't scroll under it).
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave);
  };
  const detach = () => {
    if (!attached) return;
    attached = false;
    canvas.style.touchAction = prevTouch;
    canvas.style.cursor = "";
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onCancel);
    canvas.removeEventListener("pointerleave", onLeave);
    down = null;
    ring.visible = false;
  };

  const update = (now: number) => {
    updateHover();
    let moving = false;
    if (glide) {
      const t = Math.min(1, (now - glide.start) / glide.ms);
      pos.lerpVectors(glide.from, glide.to, easeInOut(t));
      if (t >= 1) {
        glide = null;
        ring.visible = false;
        showStops();
      } else moving = true;
    }
    if (spin) {
      const t = Math.min(1, (now - spin.start) / spin.ms);
      yaw = THREE.MathUtils.lerp(spin.from, spin.to, easeInOut(t));
      if (t >= 1) spin = null;
      else moving = true;
    }
    if (bump) {
      const t = Math.min(1, (now - bump.start) / 260);
      nudgeDir = bump.dir;
      nudge = 0.06 * Math.sin(Math.PI * t);
      if (t >= 1) {
        bump = null;
        nudge = 0;
      } else moving = true;
    }
    apply();
    return moving;
  };

  /** The nearest stop within 45° of a direction from p, other than the one you're on. */
  const nextStop = (p: THREE.Vector3, dir: THREE.Vector3) => {
    let best: THREE.Vector3 | null = null;
    let bestD = Infinity;
    for (const s of room.stops) {
      const dx = s.x - p.x;
      const dz = s.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.45 || (dx * dir.x + dz * dir.z) / d < Math.SQRT1_2) continue;
      if (d < bestD) [best, bestD] = [s, d];
    }
    return best;
  };
  const key = (k: "forward" | "back" | "left" | "right") => {
    if (k === "left") return turnBy(TURN);
    if (k === "right") return turnBy(-TURN);
    // A step the way you're facing (or back), shortened if something's in the way.
    const dir = new THREE.Vector3(-Math.sin(spin?.to ?? yaw), 0, -Math.cos(spin?.to ?? yaw)).multiplyScalar(k === "forward" ? 1 : -1);
    const from = glide?.to ?? pos;
    for (const d of [STEP, STEP * 0.6, STEP * 0.3]) {
      const x = from.x + dir.x * d;
      const z = from.z + dir.z * d;
      if (room.canStand(x, z)) return go(new THREE.Vector3(x, room.floor, z));
    }
    // Blocked right in front (a desk, a chair): on to the nearest stop that way, as a tour's arrows go.
    const next = nextStop(from, dir);
    if (next) return go(next);
    // Something's in the way: lean toward it and back.
    if (!reduced && !glide) {
      bump = { dir, start: performance.now() };
      onChange();
    }
  };

  return {
    attach,
    detach,
    update,
    key,
    turn: turnBy,
    pose: () => ({ position: pos.clone(), yaw, pitch }),
    dispose: () => {
      detach();
      scene.remove(marks);
      for (const g of [stopGeo]) g.dispose();
      ring.traverse((x) => (x as THREE.Mesh).geometry?.dispose());
      for (const m of [ringMat, haloMat, stopMat]) m.dispose();
    },
  };
}
