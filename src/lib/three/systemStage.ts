/**
 * Framework-free three.js stage for any system with a model in the registry (src/lib/system-models.ts):
 * the product page's 3D viewer for everything except the TRECC (which keeps treccStage).
 *
 * Packed ↔ deployed plays the model's own deploy animation (the glTF clip in Barry's files): a
 * container's clip starts from the closed container, so scrubbing it is the whole story; a soft
 * shelter's clip builds it up from bare ground, so the packed view is its own file (crates, bags),
 * which gives way to the clip. Models without a clip fall back to the registry's `articulation`
 * (hinge nodes rotate, unfold nodes open out from a hinge line) or a plain swap to the stowed file.
 *
 * Lit by the sky file the models were colour-checked under (desert-sky-1k.hdr from Barry's web kit) at
 * 0.9 with neutral tone mapping, plus a sun for the contact shadow, on the site's dark ground and grid.
 *
 * "Show inside" cuts the shell open; "Step inside" walks round the fit-out at eye height. From round 7
 * the furnished file has the interior light baked in, and it takes the deployed model's place for both.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SystemModel } from "../system-models";
import type { TreccFinish } from "./treccFinishes";
import { withImageTextures } from "./gltfImageTextures";
import { createSiteBackdrop, type SiteBackdrop, type SiteKind } from "./siteBackdrop";
import type { WalkController, WalkRoom } from "./walkThrough";

/** Same Draco decoder the AR page uses (the newer one; model-viewer and three both read it). */
const DRACO_PATH = "/assets/draco-ar/";
/** Outdoor sky the models were colour-checked under, cut down to 256 × 128 for lighting only. */
const SKY_HDR = "/models/desert-sky-1k.hdr";
/** Share of the deploy toggle spent on the packed file before a soft shelter's clip takes over. */
const PACKED_SHARE = 0.16;

/** Finish colours (linear RGB). Green keeps the model's own colours. */
const FINISH_COLORS: Record<Exclude<TreccFinish, "green">, { paint: [number, number, number]; fabric: [number, number, number] }> = {
  tan: { paint: [0.34, 0.27, 0.135], fabric: [0.431, 0.323, 0.157] },
  arctic: { paint: [0.72, 0.74, 0.74], fabric: [0.693, 0.672, 0.604] },
};

export type SystemStage = {
  /** 0 = packed, 1 = deployed. */
  setDeploy: (t: number) => void;
  setFinish: (finish: TreccFinish, animate?: boolean) => void;
  /** Turns on drag-to-rotate; onChange fires whenever the view moves. */
  enableControls: (onChange?: () => void) => void;
  turn: (degrees: number) => void;
  render: () => void;
  resize: () => void;
  dispose: () => void;
  /** True while a finish change still needs frames. */
  isAnimating: () => boolean;
  /** Whether the model can show a packed state at all. */
  canStow: boolean;
  /** How long a full packed ↔ deployed run should take (the clip's own pace when there is one). */
  deployMs: number;
  /** Whether the registry lists an example fit-out for "Show inside". */
  hasInside: boolean;
  /**
   * Cuts the shell away above a horizontal line and shows the fit-out, with the camera eased to look
   * down in. The fit-out file loads on the first call. Assumes the model is deployed.
   */
  setInside: (on: boolean, animate?: boolean) => Promise<void>;
  /** Starts (or reuses) the fit-out download without showing it. */
  preloadInside: () => Promise<void>;
  /** 0 = roof on, 1 = fully cut away (eases between). */
  insideProgress: () => number;
  /** Whether "Step inside" is on for this model (see `walk` in the registry). */
  canWalk: boolean;
  /**
   * Walks in to stand at eye height in the fit-out, roof on (drag to look round, click the floor to
   * move), or back out to the look-in view. Loads the fit-out first if it hasn't come yet.
   */
  setWalk: (on: boolean, animate?: boolean) => Promise<boolean>;
  /** Arrow keys while walking: a step forward or back, or a turn. */
  walkKey: (k: "forward" | "back" | "left" | "right") => void;
  /** True while standing inside (not while walking in or out). */
  walking: () => boolean;
  /** Puts the shelter on a site (sky, ground, horizon) or back on the studio grid (null). */
  setSite: (kind: SiteKind | null) => void;
};

/** Ease in-out cubic, as the deploy toggle uses. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** How long the cut and the camera move take. */
const INSIDE_MS = 1300;
/** Camera height while looking in (degrees above the horizon); within the orbit limits. */
const INSIDE_ELEVATION = 47;
const OUTSIDE_ELEVATION = 17;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export async function createSystemStage(
  canvas: HTMLCanvasElement,
  model: SystemModel,
  { maxDpr = 1.75, shadows = true, site = null }: { maxDpr?: number; shadows?: boolean; site?: SiteKind | null } = {},
): Promise<SystemStage> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  // Neutral, as the models were colour-checked: ACES would shift the CARC greens toward olive.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The light is fixed; the shadow only changes while the model folds, so redraw it on demand.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  // "Show inside" clips the shell's materials only (the fit-out's have no planes).
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTex: THREE.Texture | null = null;
  // Fetched alongside the model; applied once both are in (see below).
  const hdrLoad = new HDRLoader().loadAsync(SKY_HDR).catch(() => null);

  // The sun for the contact shadow (the sky already carries most of the light), a cool fill from the
  // sky side and a little orange rim from behind, as on the TRECC stage.
  const key = new THREE.DirectionalLight(0xfff4e6, 1.4);
  key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);
  const hemi = new THREE.HemisphereLight(0x9fb7d1, 0x0a0f17, 0.2);
  scene.add(hemi);
  const rim = new THREE.DirectionalLight(0xffb070, 0.6);
  scene.add(rim);

  // Load the model(s).
  const loader = withImageTextures(new GLTFLoader());
  let draco: DRACOLoader | null = null;
  if (model.compression === "draco") {
    draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    loader.setDRACOLoader(draco);
  } else {
    loader.setMeshoptDecoder(MeshoptDecoder);
  }

  let controls: OrbitControls | null = null;
  /** Set once the stage is torn down, so late downloads drop their results. */
  let disposed = false;
  /** The baked interior's reflections (see "inside"). */
  let roomEnv: THREE.Texture | null = null;
  // Walking inside (see "walk through" below); declared up here because resize() reads them.
  let walkCtrl: WalkController | null = null;
  let walkRoom: WalkRoom | null = null;
  type CamPose = { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number; lift: number };
  let walkMove: { dir: 1 | -1; from: CamPose; to: CamPose; via: THREE.Vector3; start: number; ms: number; k0: number; reduced: boolean } | null = null;
  const disposeAll = () => {
    disposed = true;
    walkCtrl?.dispose();
    walkCtrl = null;
    walkRoom?.dispose();
    walkRoom = null;
    controls?.dispose();
    controls = null;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      mats.forEach((m) => m.dispose());
    });
    draco?.dispose();
    key.dispose();
    rim.dispose();
    hemi.dispose();
    envTex?.dispose();
    roomEnv?.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  // Soft shelters (and models without articulation) show their packed file; containers fold themselves.
  const swapStowed = !model.articulation && !model.packedInClip && !!model.stowed;
  let gltf: GLTF;
  let stowedGltf: GLTF | null = null;
  try {
    [gltf, stowedGltf] = await Promise.all([
      loader.loadAsync(model.deployed),
      swapStowed && model.stowed ? loader.loadAsync(model.stowed) : Promise.resolve(null),
    ]);
  } catch (err) {
    disposeAll();
    throw err;
  }
  // The decoder's workers aren't needed once the files are in.
  draco?.dispose();
  draco = null;

  // The sky file lights the model; if it couldn't load, the studio room the TRECC stage uses stands
  // in, with the stronger lights that stage uses.
  const hdr = await hdrLoad;
  if (hdr) {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    envTex = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    scene.environmentIntensity = 0.9;
  } else {
    const room = new RoomEnvironment();
    envTex = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    scene.environmentIntensity = 0.42;
    key.intensity = 2.3;
    hemi.intensity = 0.4;
    rim.intensity = 1.1;
  }
  scene.environment = envTex;
  // Inside a baked interior (see "inside" below) the light is already in the textures, and the sun
  // and rim would light every surface in there again (nothing inside receives shadows), so they
  // fade down while it shows. The sky stays: the interior's occlusion keeps it to a little sheen.
  const sunlight = { key: key.intensity, rim: rim.intensity };
  /** 0 = outside, 1 = looking at (or standing in) a baked interior. */
  const setInsideLight = (f: number) => {
    key.intensity = sunlight.key * (1 - 0.8 * f);
    rim.intensity = sunlight.rim * (1 - f);
  };

  const root = gltf.scene;
  scene.add(root);
  if (stowedGltf) scene.add(stowedGltf.scene);

  // Materials: clone per stage, remember the originals for the green finish.
  // The colour switcher recolours the whole outside: every paint and fabric material the registry
  // lists (end walls, roof shades, seam tape, hems, straps and frames with the main paint and fabric,
  // so a tan shelter has no green left on it), matched by exact name. The interior's baked copies
  // (`paint_in`, `fabric_in`...) are never touched: they keep their own colour and light.
  const paintNames = new Set(model.finishMaterials?.paint ?? []);
  const fabricNames = new Set(model.finishMaterials?.fabric ?? []);
  const reference = { paint: model.finishMaterials?.paint[0], fabric: model.finishMaterials?.fabric[0] };
  type Tint = { mat: THREE.MeshStandardMaterial; group: "paint" | "fabric"; base: THREE.Color; rel: number };
  const tinted: Tint[] = [];
  const groupRef: Partial<Record<"paint" | "fabric", number>> = {};
  const lum = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  /** Signs a paint or fabric material up for the finish picker (its `rel` is set once the reference is known). */
  const addTint = (mat: THREE.MeshStandardMaterial): Tint | null => {
    if (/_in$/.test(mat.name)) return null;
    const group = paintNames.has(mat.name) ? "paint" : fabricNames.has(mat.name) ? "fabric" : null;
    if (!group) return null;
    const base = mat.color.clone();
    // The first material named in each group sets the reference brightness; the others
    // (darker trim, straps) keep their brightness relative to it in every finish.
    const first = mat.name === reference[group];
    if (first && groupRef[group] === undefined) groupRef[group] = Math.max(lum(base), 1e-4);
    const t: Tint = { mat, group, base, rel: lum(base) };
    tinted.push(t);
    return t;
  };
  const relTo = (t: Tint) => {
    t.rel = lum(t.base) / (groupRef[t.group] ?? Math.max(lum(t.base), 1e-4));
  };
  const prep = (obj: THREE.Object3D) => {
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = mats.map((m) => {
        const mat = (m as THREE.MeshStandardMaterial).clone();
        addTint(mat);
        return mat;
      });
      mesh.material = (next.length === 1 ? next[0] : next) as never;
    });
  };
  prep(root);
  if (stowedGltf) prep(stowedGltf.scene);
  tinted.forEach(relTo);

  // ---- deploy animation -------------------------------------------------------------
  const clip = gltf.animations[0] ?? null;
  const mixer = clip ? new THREE.AnimationMixer(root) : null;
  const action = mixer && clip ? mixer.clipAction(clip) : null;
  if (action) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
  }
  /** Poses the model at a point in its clip (a finished LoopOnce action pauses itself, so un-pause). */
  const scrub = (seconds: number) => {
    if (!mixer || !action || !clip) return;
    action.enabled = true;
    action.paused = false;
    action.time = Math.min(Math.max(seconds, 0), clip.duration);
    mixer.update(0);
  };

  // ---- articulation (files without a clip) ---------------------------------------------
  const byName = (name: string) => root.getObjectByName(name) ?? null;
  const hinges = (model.articulation?.hinges ?? []).flatMap(({ node, stowed }) => {
    const obj = byName(node);
    if (!obj) return [];
    return [{ obj, open: obj.quaternion.clone(), closed: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), stowed) }];
  });
  const unfolds = (model.articulation?.unfold ?? []).flatMap(({ node, pivotX }) => {
    const obj = byName(node);
    if (!obj || !obj.parent) return [];
    // Wrap in a pivot on the hinge line so a scale along X opens it out from the container edge.
    const pivot = new THREE.Group();
    pivot.name = `${node}_pivot`;
    pivot.position.set(pivotX, 0, 0);
    obj.parent.add(pivot);
    obj.position.x -= pivotX;
    pivot.add(obj);
    return [pivot];
  });
  const hidden = (model.articulation?.hideStowed ?? []).flatMap((name) => {
    const obj = byName(name);
    return obj ? [obj] : [];
  });
  // Parts the clip grows in last (interior, site kit): left out of the framing, as `hidden` is.
  const grown = clip ? root.children.filter((n) => /_(interior|site_kit)$/i.test(n.name)) : [];
  const canStow = !!clip || hinges.length > 0 || unfolds.length > 0 || !!stowedGltf;

  // ---- framing ------------------------------------------------------------------------
  // The deployed footprint without the nodes hidden while packed: interiors sit inside it anyway,
  // and site kits (cables, earth rods) spread out on the ground and would shrink the model in frame.
  const box = new THREE.Box3();
  const leaveOut = new Set<THREE.Object3D>();
  for (const h of [...hidden, ...grown]) h.traverse((o) => leaveOut.add(o));
  root.updateMatrixWorld(true);
  // Guy ropes and other thin lines reach far past the shelter; frame on the shelter itself.
  const thin = (mesh: THREE.Mesh) =>
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every((m) => /rope|guy|cable/i.test(m.name));
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !leaveOut.has(mesh) && !thin(mesh)) box.expandByObject(mesh);
  });
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.z) / 2;
  const groundR = radius * 2.6 + 2;

  // High and slightly to one side, so the contact shadow sits under the shelter rather than beside it.
  key.position.set(center.x + radius * 0.9, radius * 3.4 + 4, center.z + radius * 1.1);
  key.target.position.set(center.x, 0, center.z);
  const sc = radius * 1.6 + 1;
  Object.assign(key.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, near: 0.5, far: radius * 8 + 20 });
  key.shadow.camera.updateProjectionMatrix();
  rim.position.set(center.x - radius * 2.4, radius * 1.2 + 2, center.z - radius * 2.2);
  scene.fog = new THREE.Fog(0x0a0f17, radius * 3.2 + 4, radius * 7 + 12);

  // Ground: soft contact shadow + a blueprint grid (1 m and 0.5 m) fading out radially.
  const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(groundR, 64), new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.set(center.x, 0, center.z);
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0x94aac4) }, uFade: { value: new THREE.Vector2(radius * 0.9, radius * 2.4 + 2) } },
    vertexShader: /* glsl */ `
      varying vec2 vXZ;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vXZ = w.xz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec2 uFade;
      varying vec2 vXZ;
      float line(float x, float w) {
        float d = abs(fract(x - 0.5) - 0.5) / fwidth(x);
        return 1.0 - min(d / w, 1.0);
      }
      void main() {
        float minor = max(line(vXZ.x * 2.0, 1.0), line(vXZ.y * 2.0, 1.0)) * 0.35;
        float major = max(line(vXZ.x * 0.5, 1.2), line(vXZ.y * 0.5, 1.2));
        float fade = 1.0 - smoothstep(uFade.x, uFade.y, length(vXZ));
        float a = max(minor, major) * fade * 0.16;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(groundR * 2.2, groundR * 2.2), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.001;
  scene.add(grid);

  // ---- site: the shelter on the ground in a climate, or on the studio grid ----
  let backdrop: SiteBackdrop | null = null;
  const studio = { fog: scene.fog, key: key.color.clone(), keyI: key.intensity, hemiSky: hemi.color.clone(), hemiGround: hemi.groundColor.clone(), hemiI: hemi.intensity };
  const padHalf: [number, number] = [size.x / 2 + 0.8, size.z / 2 + 0.8];
  const setSite = (kind: SiteKind | null) => {
    if (backdrop) { scene.remove(backdrop.group); backdrop.dispose(); backdrop = null; }
    const L = kind ? (backdrop = createSiteBackdrop(kind, center, radius, padHalf)).light : null;
    if (backdrop) scene.add(backdrop.group);
    scene.fog = backdrop ? backdrop.fog : studio.fog;
    key.color.copy(L ? L.key : studio.key); key.intensity = sunlight.key = L ? L.keyI : studio.keyI;
    hemi.color.copy(L ? L.hemiSky : studio.hemiSky); hemi.groundColor.copy(L ? L.hemiGround : studio.hemiGround); hemi.intensity = L ? L.hemiI : studio.hemiI;
    grid.visible = shadowFloor.visible = !kind;
    renderer.shadowMap.needsUpdate = true;
  };

  // Camera: three-quarter view of the end with the door (the side the site kit lies on, when there
  // is one; otherwise +Z), framed on the deployed footprint.
  const siteKit = [...hidden, ...grown].find((h) => /site|kit/i.test(h.name));
  let doorSign = 1;
  if (siteKit) {
    const kb = new THREE.Box3().setFromObject(siteKit);
    doorSign = kb.getCenter(new THREE.Vector3()).z < center.z ? -1 : 1;
  }
  // far enough for the site's sky (see siteBackdrop: radius × 16 + 40, at least 4 m)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, Math.max(4, radius) * 20 + 80);
  if (site) setSite(site);
  const target = new THREE.Vector3(center.x, size.y * 0.38, center.z);
  const az = THREE.MathUtils.degToRad(doorSign > 0 ? 36 : 180 + 36);
  // A little lower on a site, so the horizon and sky are in frame; the studio view looks down a bit more.
  const el = THREE.MathUtils.degToRad(site ? 11 : 17);
  let dist = 10;
  /** The camera backs off a little while looking in: seen from above, the footprint is taller in frame. */
  let viewZoom = 1;
  // Sit the model a little above centre so the ground-level site kit clears the controls along the
  // bottom (the camera still turns about the model's centre); centred while looking in from above.
  let viewLift = 0.06;
  const applyViewOffset = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.setViewOffset(w, h, 0, h * viewLift, w, h);
  };
  const place = () => {
    camera.position.set(
      target.x + dist * Math.cos(el) * Math.sin(az),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
  };

  const orbitFov = () => Math.max(30, Math.min(48, 30 / Math.min(1, camera.aspect / 1.5)));
  /** Standing inside: about 90° across, whatever the box's shape (a tall phone box looks up and down more). */
  const walkFov = () => THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(1 / camera.aspect)), 56, 72);
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const walkingNow = !!walkCtrl || !!walkMove;
    camera.fov = orbitFov();
    // Fit the footprint's bounding sphere across the narrower of the two fields of view.
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const fitR = Math.hypot(size.x, size.z, size.y) / 2;
    // A little wider on the phones' 4:3 box, where the controls cover more of the picture.
    // (the TRECC stands tall on a small footprint, so it gets a little more room)
    dist = (fitR / Math.sin(Math.min(vfov, hfov) / 2)) * (camera.aspect < 1.5 ? 0.92 : 0.82) * (model.reveal ? 1.14 : 1);
    // There's no zoom, so the near plane can sit well in front of the model; a tight near plane keeps
    // the depth precision that stops close layers (fabric over liner) flickering mid-unfold.
    camera.near = Math.max(0.1, dist * 0.2);
    if (walkingNow) {
      // Standing (or walking in or out): only the shape of the view changes.
      if (walkCtrl) camera.fov = walkFov();
      camera.near = 0.05;
    } else if (!controls) place();
    else {
      // Keep the visitor's angle; only change how far away the camera sits.
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, dist * viewZoom);
    }
    applyViewOffset();
    camera.updateProjectionMatrix();
  };
  resize();

  // ---- deploy state -----------------------------------------------------------------
  // ---- reveal: two CAD exports that share an origin (the TRECC) ----------------------
  // Deploying is a scan, as on the US site: an orange plane sweeps along the length, the packed file
  // clipped away on one side and the deployed file on the other, with a glow where it crosses surfaces.
  const reveal = model.reveal && stowedGltf ? model.reveal : null;
  const clipStowed = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const clipOpen = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const scanU = { uScanX: { value: 0 }, uScanOn: { value: 0 } };
  let scanGroup: THREE.Group | null = null;
  if (reveal && stowedGltf) {
    const patch = (obj: THREE.Object3D, plane: THREE.Plane) =>
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          mat.clippingPlanes = [plane];
          mat.clipShadows = true;
          mat.onBeforeCompile = (sh) => {
            sh.uniforms.uScanX = scanU.uScanX;
            sh.uniforms.uScanOn = scanU.uScanOn;
            sh.vertexShader = sh.vertexShader
              .replace("#include <common>", "#include <common>\nvarying float vScanWX;")
              .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvScanWX = (modelMatrix * vec4(transformed, 1.0)).x;");
            sh.fragmentShader = sh.fragmentShader
              .replace("#include <common>", "#include <common>\nvarying float vScanWX;\nuniform float uScanX;\nuniform float uScanOn;")
              .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.95, 0.42, 0.08) * 2.2 * uScanOn * (1.0 - smoothstep(0.0, 0.14, abs(vScanWX - uScanX)));");
          };
          mat.customProgramCacheKey = () => "wh-reveal";
          mat.needsUpdate = true;
        });
      });
    patch(root, clipOpen);
    patch(stowedGltf.scene, clipStowed);
    // hairline frame plus a faint additive sheet, across the width and height of the unit
    const W = size.z + 0.5, H = size.y + 0.4;
    scanGroup = new THREE.Group();
    scanGroup.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, H)), new THREE.LineBasicMaterial({ color: 0xf18522, transparent: true, opacity: 0.95 })),
      new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0xf18522, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })),
    );
    scanGroup.rotation.y = Math.PI / 2;
    scanGroup.position.set(reveal.from, H / 2 - 0.05, center.z);
    scanGroup.visible = false;
    scene.add(scanGroup);
  }

  let deploy = -1;
  // The deployed model gives way to the packed file early in the deploy, and to the baked interior
  // (see "inside") while you look inside.
  let rootShown = true;
  let bakedOn = false;
  const showRoot = (on: boolean) => {
    rootShown = on;
    root.visible = on && !bakedOn;
  };
  const setDeploy = (t: number) => {
    const next = clamp01(t);
    if (next === deploy) return;
    deploy = next;
    if (reveal && stowedGltf) {
      // Only draw what can be seen: one model at rest, both while the scan crosses.
      stowedGltf.scene.visible = deploy < 0.999;
      showRoot(deploy > 0.001);
      const x = reveal.from + (reveal.to - reveal.from) * deploy;
      clipStowed.constant = -x;
      clipOpen.constant = x;
      scanU.uScanX.value = x;
      const on = deploy > 0.001 && deploy < 0.999;
      scanU.uScanOn.value = on ? Math.min(1, Math.min(deploy, 1 - deploy) * 12) : 0;
      if (scanGroup) { scanGroup.visible = on; scanGroup.position.x = x; }
      renderer.shadowMap.needsUpdate = true;
      return;
    }
    if (mixer && clip) {
      if (stowedGltf) {
        // Packed file first; it sinks away as the shelter starts to go up from the ground.
        const k = smooth(PACKED_SHARE - 0.07, PACKED_SHARE, deploy);
        stowedGltf.scene.visible = k < 1;
        stowedGltf.scene.scale.setScalar(Math.max(1 - k, 0.0001));
        showRoot(deploy > PACKED_SHARE - 0.01);
        scrub(clamp01((deploy - PACKED_SHARE) / (1 - PACKED_SHARE)) * clip.duration);
      } else {
        scrub(deploy * clip.duration);
      }
      renderer.shadowMap.needsUpdate = true;
      return;
    }
    // The walls swing down first; the fabric opens out over them; the inside appears last.
    const wall = smooth(0, 0.58, deploy);
    for (const h of hinges) h.obj.quaternion.slerpQuaternions(h.closed, h.open, wall);
    const open = smooth(0.42, 1, deploy);
    for (const p of unfolds) {
      p.scale.set(Math.max(open, 0.0001), 1, 1);
      // Squashed almost flat it would flicker against the container side, so it appears a little open.
      p.visible = open > 0.1;
    }
    for (const n of hidden) n.visible = deploy > 0.97;
    if (stowedGltf) {
      stowedGltf.scene.visible = deploy < 0.5;
      showRoot(deploy >= 0.5);
    }
    renderer.shadowMap.needsUpdate = true;
  };
  setDeploy(1);

  // ---- finish ---------------------------------------------------------------------
  let finishNow: TreccFinish = "green";
  let finishFrom: THREE.Color[] = tinted.map((t) => t.mat.color.clone());
  let finishTo: THREE.Color[] = finishFrom.map((c) => c.clone());
  let finishT = 1;
  let finishStart = 0;
  const colorFor = (t: Tint, finish: TreccFinish) => {
    if (finish === "green") return t.base.clone();
    const c = FINISH_COLORS[finish][t.group];
    return new THREE.Color(c[0], c[1], c[2]).multiplyScalar(t.rel);
  };
  const colorsFor = (finish: TreccFinish) => tinted.map((t) => colorFor(t, finish));
  const applyColors = (k: number) => tinted.forEach((t, i) => t.mat.color.copy(finishFrom[i]).lerp(finishTo[i], k));

  // ---- inside -----------------------------------------------------------------------
  // The shell is cut by a horizontal plane that sweeps down from above the roof to the cut height;
  // the cut-open walls are drawn double-sided so you see their inner faces, not holes.
  const shellMats: { mat: THREE.Material; side: THREE.Side }[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) shellMats.push({ mat, side: mat.side });
  });
  const topY = box.max.y + 0.5;
  const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), topY);
  let cutY = model.cutHeight ?? Math.min(size.y * 0.62, 2.1);
  // A baked interior's fit-out is cut too, a little higher than the walls, so what hangs from the
  // roof (lights, air ducts) goes with the roof while tall kit (shelving, a truck) stays whole.
  const FIT_CUT_ABOVE = 0.5;
  const fitCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), topY);
  /** 0 = whole (planes above the roof), 1 = cut open. */
  const setCut = (k: number) => {
    cut.constant = THREE.MathUtils.lerp(topY, cutY, k);
    fitCut.constant = THREE.MathUtils.lerp(topY, cutY + FIT_CUT_ABOVE, k);
  };
  // "cut": clipped by the plane, drawn double-sided so the cut walls show their inner faces. "walk":
  // whole again, still double-sided, since you're seeing every wall and the ceiling from inside.
  let shellMode: "off" | "cut" | "walk" = "off";
  const setShellMode = (mode: "off" | "cut" | "walk") => {
    if (mode === shellMode) return;
    shellMode = mode;
    for (const { mat, side } of shellMats) {
      mat.clippingPlanes = mode === "cut" ? [cut] : null;
      mat.clipShadows = mode === "cut";
      mat.side = mode === "off" ? side : THREE.DoubleSide;
      mat.needsUpdate = true;
    }
  };

  // Screens and lights glow while inside is shown (the files carry no emission of their own).
  const lit: { mat: THREE.MeshStandardMaterial; color: THREE.Color; strength: number }[] = [];
  const addLit = (mat: THREE.MeshStandardMaterial) => {
    const name = mat.name.toLowerCase();
    if (!/^(screen_lit|light)/.test(name) || lit.some((l) => l.mat === mat)) return;
    const c = mat.color.clone();
    const peak = Math.max(c.r, c.g, c.b);
    let color: THREE.Color;
    if (/exit/.test(name)) color = new THREE.Color(0.1, 1, 0.35);
    else if (mat.map) color = new THREE.Color(1, 1, 1);
    else if (peak > 1e-4 && peak < 0.6) color = c.multiplyScalar(1 / peak);
    else color = new THREE.Color(1, 0.93, 0.8);
    if (mat.map) mat.emissiveMap = mat.map;
    mat.emissive.setRGB(0, 0, 0);
    lit.push({ mat, color, strength: name.startsWith("light") ? 0.9 : 1.5 });
  };
  for (const { mat } of shellMats) addLit(mat as THREE.MeshStandardMaterial);

  // A baked interior (`inside.baked`, round 7 on): the furnished file carries the interior light in
  // its textures, on the shell's inside faces and the fit-out alike, so while you look inside it
  // stands in for the deployed model (same coordinates; static, no deploy to play). Its shell is
  // always drawn cut open; standing inside, the plane simply sits above the roof.
  const bakedSpec = model.inside?.baked && model.furnished ? model.inside.baked : null;
  let baked: THREE.Object3D | null = null;
  // What the inside reflects (roomEnv, made on first use): a plain room, not the outdoor sky, which a
  // steel cabinet would mirror as a blue gradient. Reflections and a little fill; the bake does the rest.
  const INSIDE_ENV = 0.45;
  /** Materials lit by the baked light (an emissive map on the second UV set), for the sharper copy. */
  const bakedLit: THREE.MeshStandardMaterial[] = [];
  const matsOf = (mesh: THREE.Mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
  const adoptBaked = (s: THREE.Object3D, fitNode: THREE.Object3D) => {
    const inFit = new Set<THREE.Object3D>();
    fitNode.traverse((o) => inFit.add(o));
    const shellUses = new Set<THREE.Material>();
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !inFit.has(mesh)) matsOf(mesh).forEach((m) => shellUses.add(m));
    });
    // The fit-out is cut at its own height, so a material it shares with the shell gets a copy.
    const copies = new Map<THREE.Material, THREE.Material>();
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const done = new Set<THREE.Material>();
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      const fit = inFit.has(mesh);
      const next = matsOf(mesh).map((m) => {
        if (!fit || !shellUses.has(m)) return m;
        let c = copies.get(m);
        if (!c) copies.set(m, (c = m.clone()));
        return c;
      });
      mesh.material = (next.length === 1 ? next[0] : next) as never;
      for (const m of next) {
        if (done.has(m)) continue;
        done.add(m);
        const mat = m as THREE.MeshStandardMaterial;
        // Double-sided, so cut walls and anything the fit-out plane slices show their inner faces.
        mat.clippingPlanes = [fit ? fitCut : cut];
        mat.clipShadows = true;
        mat.side = THREE.DoubleSide;
        // The outside takes the finish like the deployed model (the inside faces keep their own
        // materials, `paint_in` and so on, and their baked look).
        const t = addTint(mat);
        if (t) {
          relTo(t);
          const c = colorFor(t, finishNow);
          mat.color.copy(c);
          finishFrom.push(c.clone());
          finishTo.push(c.clone());
        }
        if (mat.emissiveMap?.channel === 1) bakedLit.push(mat);
        // Inside surfaces: the fit-out, anything lit by the bake, and the shell's inside-face copies.
        if (fit || mat.emissiveMap?.channel === 1 || /_in$/.test(mat.name)) {
          if (!roomEnv) {
            const room = new RoomEnvironment();
            roomEnv = pmrem.fromScene(room, 0.04).texture;
            room.dispose();
          }
          mat.envMap = roomEnv;
          mat.envMapIntensity = INSIDE_ENV;
          // Steel shows only what it reflects, and the bake has no reflections in it: a brighter room
          // and a lighter touch of the occlusion keep cabinets and counters reading as steel, not paint.
          if (mat.metalness >= 0.5) {
            mat.envMapIntensity = 1;
            mat.aoMapIntensity = 0.6;
          }
        }
        // Floors and walls are seen at a slant standing inside: filter the textures for that.
        for (const tex of [mat.map, mat.emissiveMap, mat.aoMap, mat.normalMap]) if (tex) tex.anisotropy = anisotropy;
      }
    });
    s.visible = false;
    scene.add(s);
    baked = s;
  };
  /**
   * Draws the baked interior once into a single pixel, so its shaders compile and its textures upload
   * while the button still says it's loading, not in the first frames of the move in. The full frame
   * drawn straight after keeps that pixel (and the cleared rest of the canvas) from ever showing.
   */
  const warmBaked = () => {
    if (!baked) return;
    const stowedShown = stowedGltf?.scene.visible ?? false;
    baked.visible = true;
    root.visible = false;
    if (stowedGltf) stowedGltf.scene.visible = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 1, 1);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    baked.visible = bakedOn;
    root.visible = rootShown && !bakedOn;
    if (stowedGltf) stowedGltf.scene.visible = stowedShown;
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  };
  /** Shows the baked interior in place of the deployed model, or puts the deployed model back. */
  const setBaked = (on: boolean) => {
    if (!baked || on === bakedOn) return;
    bakedOn = on;
    baked.visible = on;
    root.visible = rootShown && !on;
    renderer.shadowMap.needsUpdate = true;
  };

  /**
   * Barry's HD file (`-deployed-fitted-hd.glb`): the same model with the baked light and the inside's
   * occlusion at 4096 px, for standing inside on a screen large enough to show it. Its textures go onto
   * the materials already drawn; if it doesn't load, the 2048 px ones simply stay.
   */
  let hdLoad: Promise<void> | null = null;
  const loadHd = () => {
    const url = bakedSpec?.hd;
    if (!url || hdLoad || !bakedLit.length || renderer.capabilities.maxTextureSize < 4096) return;
    // Phones (and devices short of memory) keep the 2048 px light: each 4096 px texture is 64 MB of
    // graphics memory, more than a phone's browser can be counted on to spare.
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const phone = window.matchMedia?.("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
    if (phone || (memory !== undefined && memory < 4)) return;
    hdLoad = (async () => {
      const l = withImageTextures(new GLTFLoader());
      const d = new DRACOLoader().setDecoderPath(DRACO_PATH);
      l.setDRACOLoader(d);
      let hd: GLTF;
      try {
        hd = await l.loadAsync(url);
      } finally {
        d.dispose();
      }
      // Same meshes and UVs as the file on screen: only its larger textures are wanted (the baked light
      // and the inside's occlusion), matched by material name, so nothing on screen moves.
      const byName = new Map<string, THREE.MeshStandardMaterial>();
      hd.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const m of matsOf(mesh)) byName.set(m.name, m as THREE.MeshStandardMaterial);
        mesh.geometry.dispose();
      });
      if (disposed || !baked) return;
      const width = (t: THREE.Texture | null) => (t?.image as { width?: number } | undefined)?.width ?? 0;
      const sharper = (mine: THREE.Texture | null, theirs: THREE.Texture | null) =>
        !!mine && !!theirs && mine.channel === theirs.channel && width(theirs) > width(mine);
      const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const taken = new Set<THREE.Texture>();
      const replaced = new Set<THREE.Texture>();
      const seen = new Set<THREE.Material>();
      baked.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const m of matsOf(mesh)) {
          if (seen.has(m)) continue;
          seen.add(m);
          const mat = m as THREE.MeshStandardMaterial;
          const theirs = byName.get(mat.name);
          if (!theirs) continue;
          if (sharper(mat.emissiveMap, theirs.emissiveMap)) {
            replaced.add(mat.emissiveMap!);
            mat.emissiveMap = theirs.emissiveMap;
            taken.add(theirs.emissiveMap!);
          }
          if (sharper(mat.aoMap, theirs.aoMap)) {
            replaced.add(mat.aoMap!);
            mat.aoMap = theirs.aoMap;
            taken.add(theirs.aoMap!);
          }
        }
      });
      for (const t of taken) {
        t.anisotropy = anisotropy;
        renderer.initTexture(t);
      }
      for (const t of replaced) t.dispose();
      if (process.env.NODE_ENV !== "production") console.info(`[walk] HD light: ${taken.size} textures, ${Math.max(0, ...[...taken].map(width))} px`);
      walkChange();
    })().catch((err) => {
      // The 2048 px light stays; nothing for the visitor to do.
      if (process.env.NODE_ENV !== "production") console.warn("[walk] the HD file didn't load", err);
    });
  };

  let fitout: THREE.Object3D | null = null;
  let fitoutLoad: Promise<void> | null = null;
  const loadFitout = () => {
    const spec = model.inside;
    if (!spec) return Promise.resolve();
    fitoutLoad ??= (async () => {
      const l = withImageTextures(new GLTFLoader());
      const d = new DRACOLoader().setDecoderPath(DRACO_PATH);
      l.setDRACOLoader(d);
      l.setMeshoptDecoder(MeshoptDecoder);
      const src = bakedSpec ? model.furnished! : spec.src;
      try {
        const g = await l.loadAsync(src);
        const node = g.scene.getObjectByName(spec.node);
        if (!node) throw new Error(`${src} has no node ${spec.node}`);
        if (disposed) return;
        if (bakedSpec) {
          adoptBaked(g.scene, node);
        } else {
          // Only the fit-out node is kept; it carries its own placement in the deployed file's frame.
          root.add(node);
          g.scene.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            matsOf(mesh).forEach((m) => m.dispose());
          });
          node.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = shadows;
            mesh.receiveShadow = false;
            const mats = matsOf(mesh).map((m) => {
              const mat = (m as THREE.MeshStandardMaterial).clone();
              m.dispose();
              addLit(mat);
              return mat;
            });
            mesh.material = (mats.length === 1 ? mats[0] : mats) as never;
          });
          node.visible = false;
        }
        fitout = node;
        if (model.cutHeight === undefined) {
          // Keep the default cut above the fit-out's floor by a head height at most.
          const fb = new THREE.Box3().setFromObject(node);
          if (!fb.isEmpty()) cutY = Math.max(cutY, Math.min(fb.min.y + 1.2, size.y * 0.75));
        }
        warmBaked();
      } catch (err) {
        fitoutLoad = null;
        throw err;
      } finally {
        d.dispose();
      }
    })();
    return fitoutLoad;
  };

  let insideK = 0;
  let inside = { from: 0, to: 0, start: 0, ms: 0 };
  let camFrom = new THREE.Spherical();
  let camTo = new THREE.Spherical();
  const orbitTarget = () => controls?.target ?? target;
  const applyInside = (k: number) => {
    insideK = k;
    if (baked) {
      setBaked(k > 0.001);
      setInsideLight(k);
    } else {
      setShellMode(k > 0.001 ? "cut" : "off");
      if (fitout) fitout.visible = k > 0.001;
    }
    setCut(k);
    viewLift = 0.06 * (1 - k);
    applyViewOffset();
    camera.updateProjectionMatrix();
    setLit(k);
    renderer.shadowMap.needsUpdate = true;
  };
  const setLit = (f: number) => {
    for (const l of lit) {
      l.mat.emissive.copy(l.color).multiplyScalar(f);
      l.mat.emissiveIntensity = l.strength;
    }
  };
  const stepInside = (now: number) => {
    if (inside.ms === 0 || insideK === inside.to) return;
    const t = Math.min(1, (now - inside.start) / inside.ms);
    const e = easeInOut(t);
    applyInside(THREE.MathUtils.lerp(inside.from, inside.to, e));
    const s = new THREE.Spherical(
      THREE.MathUtils.lerp(camFrom.radius, camTo.radius, e),
      THREE.MathUtils.lerp(camFrom.phi, camTo.phi, e),
      camFrom.theta,
    );
    camera.position.setFromSpherical(s).add(orbitTarget());
    camera.lookAt(orbitTarget());
    if (t >= 1) inside.ms = 0;
  };
  const setInside = async (on: boolean, animate = true) => {
    if (!model.inside || walkCtrl || walkMove) return;
    if (on) await loadFitout();
    const to = on ? 1 : 0;
    camFrom = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbitTarget()));
    camTo = camFrom.clone();
    camTo.phi = THREE.MathUtils.degToRad(90 - (on ? INSIDE_ELEVATION : backdrop ? 11 : OUTSIDE_ELEVATION));
    viewZoom = on ? 1.22 : 1;
    camTo.radius = dist * viewZoom;
    if (animate) {
      inside = { from: insideK, to, start: performance.now(), ms: INSIDE_MS * Math.max(0.35, Math.abs(to - insideK)) };
    } else {
      inside = { from: to, to, start: 0, ms: 0 };
      applyInside(to);
      camera.position.setFromSpherical(camTo).add(orbitTarget());
      camera.lookAt(orbitTarget());
    }
  };


  // ---- walk through -------------------------------------------------------------------
  // "Step inside": the camera comes in over the cut-away walls to stand at eye height at one end of
  // the room, the roof goes back on over it, and the room is walked like a Matterport tour
  // (walkThrough.ts, loaded the first time). Going out, the roof lifts off again and the camera rises
  // back to the look-in view.
  const canWalk = !!model.inside && !!model.walk;
  let walkLib: typeof import("./walkThrough") | null = null;
  let walkBusy = false;
  let walkChange: () => void = () => undefined;
  /** The camera's angle round the shelter when you stepped in. */
  let walkReturn = 0;
  const UP = new THREE.Vector3(0, 1, 0);
  const lookAtQuat = (from: THREE.Vector3, to: THREE.Vector3) =>
    new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(from, to, UP));
  const camPose = (): CamPose => ({ pos: camera.position.clone(), quat: camera.quaternion.clone(), fov: camera.fov, lift: viewLift });
  /** The look-in view, from the side you were facing away from (so the room is ahead, as it was). */
  const lookInPose = (theta: number): CamPose => {
    const t = orbitTarget();
    const pos = new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist * 1.22, THREE.MathUtils.degToRad(90 - INSIDE_ELEVATION), theta)).add(t);
    return { pos, quat: lookAtQuat(pos, t), fov: orbitFov(), lift: 0 };
  };
  /** Everything you can stand on or bump into: the shelter as drawn, fit-out included, not the ropes. */
  const walkMeshes = () => {
    const out: THREE.Mesh[] = [];
    (baked ?? root).traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !thin(mesh)) out.push(mesh);
    });
    return out;
  };
  const stepWalk = (now: number) => {
    const m = walkMove;
    if (!m) return;
    const t = m.ms > 0 ? Math.min(1, (now - m.start) / m.ms) : 1;
    const e = easeInOut(t);
    // Along a curve through a point above the room, so the camera passes over the walls, not through.
    const u = 1 - e;
    const a = m.from.pos;
    const v = m.via;
    const b = m.to.pos;
    camera.position.set(
      u * u * a.x + 2 * u * e * v.x + e * e * b.x,
      u * u * a.y + 2 * u * e * v.y + e * e * b.y,
      u * u * a.z + 2 * u * e * v.z + e * e * b.z,
    );
    camera.quaternion.slerpQuaternions(m.from.quat, m.to.quat, e);
    camera.fov = THREE.MathUtils.lerp(m.from.fov, m.to.fov, e);
    viewLift = THREE.MathUtils.lerp(m.from.lift, m.to.lift, e);
    applyViewOffset();
    camera.updateProjectionMatrix();
    // The roof: walking in, it lifts off while the camera comes over and goes back on once you're
    // inside; walking out, it lifts off first and stays off for the look-in view.
    const k = m.dir === 1 ? (t < 0.62 ? Math.max(m.k0, smooth(0, 0.3, t)) : 1 - smooth(0.72, 1, t)) : Math.max(m.k0, smooth(0, 0.25, t));
    insideK = k;
    setCut(k);
    // Inside (and in the look-in view you come back out to) the baked light does the lighting.
    if (baked) setInsideLight(m.dir === 1 ? Math.max(m.k0, smooth(0, 0.3, t)) : 1);
    renderer.shadowMap.needsUpdate = true;
    if (t < 1) return;
    walkMove = null;
    if (m.dir === 1 && walkLib && walkRoom) {
      walkCtrl = walkLib.createWalkController({ camera, canvas, scene, room: walkRoom, reduced: m.reduced, onChange: () => walkChange() });
      walkCtrl.attach();
      camera.fov = walkFov();
      camera.updateProjectionMatrix();
    } else {
      // Back in the look-in view, where Show inside leaves it.
      viewZoom = 1.22;
      inside = { from: 1, to: 1, start: 0, ms: 0 };
      applyInside(1);
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
      resize();
    }
    walkChange();
  };
  /** Resolves true when the camera is on its way in (or out), false when it can't go. */
  const setWalk = async (on: boolean, animate = true): Promise<boolean> => {
    if (!canWalk) return false;
    const now = () => performance.now();
    if (on) {
      if (walkCtrl || walkMove) return true;
      await loadFitout();
      walkLib ??= await import("./walkThrough");
      if (!fitout || walkCtrl || walkMove) return !!(walkCtrl || walkMove);
      if (baked) {
        setBaked(true);
        loadHd();
      } else {
        fitout.visible = true;
        setShellMode("cut");
      }
      setLit(1);
      root.updateMatrixWorld(true);
      if (!walkRoom) {
        // The room is where the fit-out is (within the shelter); start at its end nearer the camera,
        // looking down it.
        const fb = new THREE.Box3().setFromObject(fitout);
        const area = fb.isEmpty() ? box.clone() : fb.clone().expandByVector(new THREE.Vector3(0.25, 0, 0.25)).intersect(box);
        const ac = area.getCenter(new THREE.Vector3());
        const as = area.getSize(new THREE.Vector3());
        const rel = as.x >= as.z ? camera.position.x - ac.x : camera.position.z - ac.z;
        walkRoom = walkLib.measureRoom(walkMeshes(), area, fb.isEmpty() ? box.min.y : fb.min.y, rel >= 0 ? 1 : -1, model.walk === true ? {} : model.walk);
        if (process.env.NODE_ENV !== "production") {
          const r = walkRoom;
          const f = (v: THREE.Vector3) => `${v.x.toFixed(2)},${v.z.toFixed(2)}`;
          console.info(`[walk] floor ${r.floor} start ${r.start ? f(r.start) : "none"} yaw ${r.yaw.toFixed(2)} stops ${r.stops.map(f).join(" ")} room ${f(area.min)}..${f(area.max)} shell ${f(box.min)}..${f(box.max)}`);
        }
      }
      // Out again, the look-in view returns to the angle you came in from.
      walkReturn = Math.atan2(camera.position.x - orbitTarget().x, camera.position.z - orbitTarget().z);
      // Nowhere in this room has standing height (a low shelter): stay in the look-in view.
      if (!walkRoom.start) return false;
      if (controls) controls.enabled = false;
      inside.ms = 0;
      const from = camPose();
      const pos = walkRoom.start.clone().setY(walkRoom.floor + walkRoom.eye);
      const to: CamPose = { pos, quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(walkRoom.pitch, walkRoom.yaw, 0, "YXZ")), fov: walkFov(), lift: 0 };
      const via = new THREE.Vector3(pos.x, Math.max(from.pos.y, box.max.y + 1.2), pos.z);
      camera.near = 0.05;
      walkMove = { dir: 1, from, to, via, start: now(), ms: animate ? 2000 : 0, k0: insideK, reduced: !animate };
      if (!animate) stepWalk(now());
      walkChange();
      return true;
    }
    if (walkMove?.dir === 1) {
      // Still on the way in: arrive, then go straight back out.
      walkMove.ms = 0;
      stepWalk(now());
    }
    if (!walkCtrl) return false;
    walkCtrl.dispose();
    walkCtrl = null;
    const from = camPose();
    const to = lookInPose(walkReturn);
    const via = new THREE.Vector3(from.pos.x, Math.max(to.pos.y, box.max.y + 1.5), from.pos.z);
    walkMove = { dir: -1, from, to, via, start: now(), ms: animate ? 1700 : 0, k0: 0, reduced: !animate };
    if (!animate) stepWalk(now());
    walkChange();
    return true;
  };

  const render = () => {
    if (finishT < 1) {
      finishT = Math.min(1, (performance.now() - finishStart) / 600);
      applyColors(1 - (1 - finishT) ** 3);
    }
    const now = performance.now();
    if (walkMove) stepWalk(now);
    else if (walkCtrl) walkBusy = walkCtrl.update(now);
    else {
      stepInside(now);
      controls?.update();
    }
    renderer.render(scene, camera);
  };

  return {
    canStow,
    // The clips run 3 to 7.4 s; played a little brisker, plus the packed file's share.
    deployMs: clip ? Math.round((clip.duration * 0.8 * 1000) / (stowedGltf ? 1 - PACKED_SHARE : 1)) : 2600,
    hasInside: !!model.inside,
    setInside,
    canWalk,
    setWalk,
    walkKey: (k) => walkCtrl?.key(k),
    walking: () => !!walkCtrl,
    setSite: (kind) => { setSite(kind); },
    preloadInside: loadFitout,
    insideProgress: () => insideK,
    setDeploy,
    setFinish: (finish, animate = true) => {
      finishNow = finish;
      finishFrom = tinted.map((t) => t.mat.color.clone());
      finishTo = colorsFor(finish);
      if (animate) {
        finishT = 0;
        finishStart = performance.now();
      } else {
        finishT = 1;
        applyColors(1);
      }
    },
    enableControls: (onChange) => {
      if (onChange) walkChange = onChange;
      if (controls) return;
      controls = new OrbitControls(camera, canvas);
      if (onChange) controls.addEventListener("change", onChange);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      // No wheel or pinch zoom: the wheel keeps scrolling the page.
      controls.enableZoom = false;
      controls.minPolarAngle = Math.PI * 0.18;
      controls.maxPolarAngle = Math.PI * 0.49;
      // Vertical swipes scroll the page on touch screens; sideways drags turn the model.
      canvas.style.touchAction = "pan-y";
      controls.update();
    },
    turn: (degrees) => {
      // Standing inside, the turn buttons turn you (right is clockwise seen from above).
      if (walkCtrl) return walkCtrl.turn((-degrees * Math.PI) / 180);
      controls?.rotateLeft((degrees * Math.PI) / 180);
      controls?.update();
    },
    render,
    resize,
    isAnimating: () => finishT < 1 || (inside.ms > 0 && insideK !== inside.to) || !!walkMove || walkBusy,
    dispose: () => { backdrop?.dispose(); disposeAll(); },
  };
}
