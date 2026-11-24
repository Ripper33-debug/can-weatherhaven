/**
 * Which systems have a real 3D model, and how to use it. One entry per system; the product page's
 * 3D viewer, the /ar/<slug> page and the mission builder's 3D camp all read this list.
 *
 * Model conventions (same as the TRECC files and Barry's Blender builds): metres, Y up, origin on
 * the ground at the centre of the footprint, width along X, length along Z, door end facing +Z.
 * Files live in public/models/<id>/ under Barry's model ids and file names (see `files` below);
 * public/models/README.md explains how a new round goes in.
 *
 * Global site (can-weatherhaven): the TRECC keeps its own viewer (public/assets/js/viewer3d.js).
 * Copy and AR facts here come from weatherhaven.com; the model setup matches the US site's registry.
 */
export type ModelCompression = "draco" | "meshopt";

export type SystemModel = {
  slug: string;
  /** Deployed model, used by the viewer, AR and the camp. */
  deployed: string;
  /**
   * Packed model. The product viewer shows it before a soft shelter's deploy animation (which starts
   * from bare ground); the mission builder's camp uses it for every system's arrival.
   */
  stowed?: string;
  /**
   * The deploy animation starts from the packed container (MECC, EHMECC, ATEPS, HERCon), so the
   * product viewer plays it from its first frame and doesn't load the packed file.
   */
  packedInClip?: boolean;
  compression: ModelCompression;
  /** Where the model came from, shown under the viewer and on the AR page. */
  source: string;
  /**
   * How the deployed file folds itself up for the stowed view and the deploy animation:
   * - hinges: nodes that rotate about their own origin; `stowed` is the rotation (radians, about Z)
   *   that folds them back up; the file holds the deployed rotation.
   * - unfold: nodes that open out from a hinge line at x = pivotX (scaled from 0 to 1 along X).
   * - hideStowed: nodes not shown while packed (interior, site kit).
   */
  articulation?: {
    hinges: { node: string; stowed: number }[];
    unfold: { node: string; pivotX: number }[];
    hideStowed: string[];
  };
  /**
   * Material names drawn in the finish colour, by the product viewer's colour switcher (shown when this
   * is set) and the mission builder's camp: paint (hard shell) and fabric, with everything outside that
   * follows them (end walls, roof shades, seam tape, hems, straps, frames). The first name in each list
   * is the reference; the others (darker trim, straps) keep their brightness relative to it. Exact names
   * only: the interior's baked copies (`paint_in`, `fabric_in`...) are never recoloured.
   */
  finishMaterials?: { paint: string[]; fabric: string[] };
  /**
   * For shelters modelled in their own colours (no finishMaterials): other material names the 3D camp
   * draws in the fabric's colour, e.g. the Series 8's white thermal cap, hems and end panels.
   */
  ownFabric?: string[];
  /**
   * Still of the deployed model for the product-page viewer's first paint, captured from the viewer
   * itself: 1600 × 900, plus a 1200 × 900 copy ending in -m for phones. Defaults to
   * /models/<slug>/<slug>-poster-deployed.jpg.
   */
  poster?: string;
  /**
   * Barry's render of the deployed shelter (1440 × 900): the outside view for browsers that can't run
   * the viewer, and the cover of a system with no photograph of its own.
   */
  hero?: string;
  /**
   * The example fit-out: node `node` of `src` is the fit-out alone, in the deployed file's
   * coordinates, and `label` names it. The mission builder's camp adds that node to its copy of the
   * shelter (and the product page's "Show inside" does, for a model without `baked`).
   *
   * `baked` (round 7 on): `furnished` carries the interior light baked in, on the shell's inside faces
   * and the fit-out alike. The product page's "Show inside" and "Step inside" then draw that whole
   * file in place of the deployed model. `hd` is Barry's `-deployed-fitted-hd.glb`: the same model
   * with the baked light at 4096 px, whose light textures replace the 2048 px ones once someone steps
   * inside on a large screen (the 2048 px ones stay if it fails to load). Not set where his HD file is
   * the same as the web one.
   */
  inside?: { src: string; node: string; label: string; baked?: { hd?: string } };
  /**
   * The whole deployed model with its fit-out: the AR page's "Furnished" choice and, with
   * `inside.baked`, what the product page shows while you look inside. Defaults to `inside.src` when
   * that is a `-deployed-fitted` file. The TRECC's is a merged file (its CAD shell plus the fit-out).
   */
  furnished?: string;
  /**
   * The AR page's model: the deployed shelter from Barry's web file with its animation taken out
   * (Android's Scene Viewer would otherwise loop the deploy). Defaults to `deployed`. AR never uses
   * the HD files.
   */
  arModel?: string;
  /**
   * For browsers that can't run the viewer: a short video of the deploy recorded from the same model,
   * and a render of the example fit-out (Barry's files). They stand in for "Packed/Deployed" and
   * "Show inside".
   */
  deployVideo?: string;
  interiorStill?: string;
  /**
   * The mission builder's camp copy: about a third of the triangles, no textures (the camp draws in
   * flat colours) and no animation, since the camp repeats a shelter many times. Defaults to `deployed`.
   */
  campModel?: string;
  /**
   * Height (metres above the ground) where "Show inside" cuts the shell. Defaults to about
   * two-thirds of the shelter's height, capped at 2.1 m.
   */
  cutHeight?: number;
  /**
   * "Step inside" on the product page: walk round the fit-out at eye height, Matterport style. Only
   * on models whose interior holds up close; `true` works out the start spot and the stops by
   * itself, or give a start spot (x, z in the deployed file's metres), the way to face (yaw, radians)
   * and how far to look down (pitch, radians): `standAt` turns Barry's eye and look points into these.
   * `eye` (m above the floor) is for a shelter too low to stand up in: you walk it crouched.
   */
  walk?: true | { start?: [number, number]; yaw?: number; pitch?: number; eye?: number };
  /** The AR page's copy. */
  ar?: { title: string; lead: string; facts: string[]; alt: string };
  /**
   * Deployed and packed are separate CAD exports sharing an origin (the TRECC): deploying is a scan
   * along x from `from` to `to` (metres), the packed file giving way to the deployed one behind it.
   */
  reveal?: { from: number; to: number };
  /** The model is Weatherhaven's own CAD (simplified), not built from specifications and photos. */
  cad?: boolean;
  /** An AR page of its own instead of /ar/<id>/ (the TRECC keeps /ar/). */
  arPage?: string;
};

/** Barry's site-sourced models (weatherhaven.com pages and photos, not engineering CAD). */
const builtFrom = (name: string) => `3D model built from Weatherhaven’s published ${name} specifications and photos`;
const LEAD_HARD = "in the room you’re standing in, at full size. Walk around it; walk inside it.";
const LEAD_SOFT = "in the space you’re standing in, at full size. Walk around it; walk inside it.";
/**
 * Where "Step inside" starts: Barry's interior camera for the model (the eye and look points in his
 * web-kit/viewer.html, in metres). His files are Z-up there, so (x, y, z) becomes (x, z, -y) here: the
 * spot to stand on the floor, which way to face and how far to look down. Eye height is the walk's own.
 */
const standAt = (eye: [number, number, number], look: [number, number, number]) => {
  const dx = look[0] - eye[0];
  const dz = -(look[1] - eye[1]);
  const dy = look[2] - eye[2];
  return { start: [eye[0], -eye[1]] as [number, number], yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
};
/** Military shelters modelled in the green finish: the finish picker recolours these. */
const SOFT_FINISHES = { paint: ["paint", "frame"], fabric: ["fabric", "strap", "hem", "fabric_end", "seam_fabric", "seam_hem"] };

/**
 * Every file for a model, in public/models/<id>/ by Barry's model id. His files keep the names they're
 * delivered with (the web package, copied as is by scripts/models/copy-models.mjs): the deployed
 * shelter with its deploy clip, the packed one, the furnished one with its baked interior light, the
 * deploy video and the two renders. The site's own copies carry the same id: the AR still, the camp
 * copy, the camp's fit-out and the viewer's stills.
 */
const files = (id: string) => ({
  deployed: `/models/${id}/${id}-deployed-web.glb`,
  stowed: `/models/${id}/${id}-stowed-web.glb`,
  compression: "draco" as const,
  furnished: `/models/${id}/${id}-deployed-fitted-web.glb`,
  deployVideo: `/models/${id}/${id}-deploy.mp4`,
  hero: `/models/${id}/${id}-hero.jpg`,
  interiorStill: `/models/${id}/${id}-interior.jpg`,
  poster: `/models/${id}/${id}-poster-deployed.jpg`,
  arModel: `/models/${id}/${id}-ar.glb`,
  campModel: `/models/${id}/${id}-camp.glb`,
});


const SOFT = SOFT_FINISHES;
const CONT = { paint: ["paint", "paint_dark"], fabric: ["fabric", "strap"] };
const ar = (name: string, lead: string, facts: string[], alt: string) => ({ title: `See the ${name} at full size`, lead, facts, alt });
export const SYSTEM_MODELS: Record<string, SystemModel> = {
  mecc: { slug: "mecc", ...files("mecc"), packedInClip: true, source: "3D model built from Weatherhaven’s published MECC drawings, specifications and photos", finishMaterials: CONT,
    inside: { src: "/models/mecc/mecc-fitout.glb", node: "MECC_fitout", label: "Command post", baked: {} }, walk: standAt([0, 2.6, 1.7], [0, -3, 1.2]),
    ar: ar("MECC", `Place the deployed MECC ${LEAD_HARD}`, ["20' ISO container packed", "Three times the floor area deployed", "2 people, 10–15 minutes"], "Weatherhaven MECC expandable container, deployed") },
  ehmecc: { slug: "ehmecc", ...files("ehmecc"), packedInClip: true, source: builtFrom("EHMECC"), finishMaterials: CONT,
    inside: { src: "/models/ehmecc/ehmecc-fitout.glb", node: "EHMECC_fitout", label: "Operating room", baked: {} }, walk: standAt([1.9, -2.5, 2], [-0.3, 0.4, 1]),
    ar: ar("EHMECC", `Place the deployed EHMECC ${LEAD_HARD}`, ["12'6\" of vertical space deployed", "Roof rises 4.5 ft over a MECC", "Three times the floor area"], "Weatherhaven EHMECC expandable container with its roof raised, deployed") },
  ateps: { slug: "ateps", ...files("ateps"), packedInClip: true, source: builtFrom("ATEPS"),
    inside: { src: "/models/ateps/ateps-fitout.glb", node: "ATEPS_fitout", label: "Medical aid station", baked: {} }, walk: standAt([-2.8, 0.25, 1.7], [2.4, -0.55, 0.9]),
    ar: ar("ATEPS", `Place the deployed ATEPS ${LEAD_HARD}`, ["One 463L pallet packed", "244\" × 104\" deployed", "2 people, under 10 minutes"], "Weatherhaven ATEPS expandable shelter, deployed") },
  hercon: { slug: "hercon", ...files("hercon"), packedInClip: true, source: builtFrom("HERCon"), finishMaterials: { paint: ["paint", "paint_dark"], fabric: [] },
    inside: { src: "/models/hercon/hercon-fitout.glb", node: "HERCON_fitout", label: "Housing, 8 berths", baked: {} }, walk: standAt([0, -2.3, 1.65], [2.6, 0.8, 1]),
    ar: ar("HERCon", `Place the deployed HERCon ${LEAD_HARD}`, ["Two 4'-wide units ship like one 8' container", "Up to six times the shipping footprint", "A team of six, in minutes"], "Weatherhaven HERCon expandable container, deployed") },
  series4: { slug: "series4", ...files("series4"), source: builtFrom("Series 4"), finishMaterials: SOFT,
    inside: { src: "/models/series4/series4-fitout.glb", node: "SERIES4_fitout", label: "Kitchen and dining", baked: {} }, walk: standAt([0, 4.4, 1.7], [0, -4, 1]),
    ar: ar("Series 4", `Place a Series 4 ${LEAD_SOFT}`, ["All climates, including polar", "Standard, Tropical and Shop versions", "Shown 16 × 32 ft"], "Weatherhaven Series 4 soft-wall shelter, deployed") },
  series8: { slug: "series8", ...files("series8"), source: builtFrom("Series 8"), ownFabric: ["cap", "hem", "paint"],
    inside: { src: "/models/series8/series8-fitout.glb", node: "SERIES8_fitout", label: "Equipment and storage", baked: {} }, walk: standAt([0, 4.4, 2], [0, -3.5, 1.2]),
    ar: ar("Series 8", `Place a tropical Series 8 ${LEAD_SOFT}`, ["16 ft (4.88 m) standard width", "Tropical models with a thermal cap", "Shown 16 × 32 ft, with deck and awnings"], "Weatherhaven Series 8 tropical soft-wall shelter, deployed on a deck with awnings") },
  rdmss: { slug: "rdmss", ...files("rdmss"), source: builtFrom("RDMSS"), finishMaterials: { paint: ["paint", "paint_dark"], fabric: ["fabric", "strap", "cap", "seam_fabric"] },
    inside: { src: "/models/rdmss/rdmss-fitout.glb", node: "RDMSS_fitout", label: "Command post", baked: {} }, walk: standAt([0, 4, 1.8], [0, -4, 1]),
    ar: ar("RDMSS", `Place the deployed RDMSS ${LEAD_SOFT}`, ["Operational from −51°C to +49°C", "Under 10 minutes, 3 people (most models)", "Full blackout capability"], "Weatherhaven RDMSS soft-wall shelter with its solar shade, deployed") },
  mts: { slug: "mts", ...files("mts"), source: builtFrom("MTS"), finishMaterials: SOFT,
    inside: { src: "/models/mts/mts-fitout.glb", node: "MTS_fitout", label: "Dining hall", baked: {} }, walk: standAt([0, 4, 1.7], [0, -4, 0.9]),
    ar: ar("MTS", `Place a deployed MTS ${LEAD_SOFT}`, ["Deploys in varying lengths from standard modules", "Bags sized for a four-person lift", "Works over- and under-pressure"], "Weatherhaven MTS modular tentage system, deployed") },
  mex26: { slug: "mex26", ...files("mex26"), source: builtFrom("MEX-26"), finishMaterials: SOFT,
    inside: { src: "/models/mex26/mex26-fitout.glb", node: "MEX26_fitout", label: "Vehicle maintenance bay", baked: {} }, walk: standAt([2.6, -4.8, 2.2], [-0.2, 1, 1]),
    ar: ar("MEX-26", `Place the deployed MEX-26 ${LEAD_SOFT} It’s big: you’ll want a parking lot or a field.`, ["26 ft wide, extended height", "First-line system on one 463L pallet", "10 people, 3 hours or less"], "Weatherhaven MEX-26 maintenance shelter, deployed") },
  polarhaven: { slug: "polarhaven", ...files("polarhaven"), source: builtFrom("Polarhaven"),
    inside: { src: "/models/polarhaven/polarhaven-fitout.glb", node: "POLARHAVEN_fitout", label: "Base camp", baked: {} }, walk: standAt([0, 2.6, 1.6], [0, -2.6, 0.8]),
    ar: ar("Polarhaven", `Place a Polarhaven ${LEAD_SOFT}`, ["A base camp shelter for the polar regions", "Antarctic camps since 1988", "Shown 14 × 20 ft"], "Weatherhaven Polarhaven arch shelter, deployed") },
  polarchief: { slug: "polarchief", ...files("polarchief"), source: builtFrom("Polar Chief"),
    inside: { src: "/models/polarchief/polarchief-fitout.glb", node: "POLARCHIEF_fitout", label: "Kitchen and mess", baked: {} }, walk: standAt([-0.5, -1.6, 1.6], [-0.5, 2.4, 1]),
    ar: ar("Polar Chief", `Place the deployed Polar Chief ${LEAD_SOFT}`, ["Octagonal: no large flat surface for the wind", "Often the kitchen or office of a camp", "Fully insulated, with an insulated vestibule"], "Weatherhaven Polar Chief octagonal polar shelter, deployed") },
  // Weatherhaven's own CAD of the TRECC (the files the home page's hero uses): a scan reveals the deployed
  // unit from the packed one. No interior file, so no "Show inside"; the home page hero has its walk-in.
  trecc: { slug: "trecc", deployed: "/assets/models/trecc-open.glb", stowed: "/assets/models/trecc-stowed.glb", compression: "draco",
    reveal: { from: -2.45, to: 2.45 }, cad: true, source: "Weatherhaven’s own CAD model of the TRECC, simplified for the web; the motion between packed and deployed is illustrative",
    finishMaterials: { paint: ["paint"], fabric: [] }, poster: "/models/trecc/trecc-poster-deployed.jpg", deployVideo: "/assets/img/hero-deploy.mp4", arPage: "/ar/",
    ar: ar("TRECC", `Place the deployed TRECC ${LEAD_HARD}`, ["One 463L pallet packed (TRECC-P)", "Extends from 5 to 8 feet high", "Set up in minutes by 1–2 people"], "Weatherhaven TRECC expandable container, deployed") },
  endurance: { slug: "endurance", ...files("endurance"), source: builtFrom("Endurance"),
    inside: { src: "/models/endurance/endurance-fitout.glb", node: "ENDURANCE_fitout", label: "Sleeping quarters", baked: {} }, cutHeight: 0.95, walk: { ...standAt([0, 1.9, 1.2], [0, -1.5, 0.5]), eye: 1.1 },
    ar: ar("Endurance", `Place the deployed Endurance ${LEAD_SOFT}`, ["A quick-erect expedition shelter", "Resists extreme winds, cold and heavy snow loads", "Used on a 1,000 km dog-sled journey north of Greenland"], "Weatherhaven Endurance expedition shelter, deployed") },
};
/** Which models each product page shows (the Polar page switches between three). */
export const PRODUCT_MODELS: Record<string, string[]> = {
  trecc: ["trecc"], mecc: ["mecc"], ehmecc: ["ehmecc"], ateps: ["ateps"], hercon: ["hercon"], series4: ["series4"], series8: ["series8"],
  rdmss: ["rdmss"], mts: ["mts"], mex26: ["mex26"], polar: ["polarhaven", "polarchief", "endurance"],
};
export const MODEL_NAMES: Record<string, string> = { polarhaven: "Polarhaven", polarchief: "Polar Chief", endurance: "Endurance" };
