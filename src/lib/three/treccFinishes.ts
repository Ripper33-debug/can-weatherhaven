/** TRECC shell finishes, matching the three source-model colourways. Kept separate from the
 * three.js stage so UI can import it without pulling three.js into the main bundle. */
export type TreccFinish = "green" | "tan" | "arctic";

/** Shell colours taken from the three finishes of the source models (linear RGB). */
export const TRECC_FINISHES: { id: TreccFinish; label: string; color: [number, number, number]; swatch: string }[] = [
  { id: "green", label: "Green", color: [0.072, 0.1, 0.048], swatch: "#4b5a37" },
  { id: "tan", label: "Desert tan", color: [0.34, 0.27, 0.135], swatch: "#a38c62" },
  { id: "arctic", label: "Arctic white", color: [0.72, 0.74, 0.74], swatch: "#e4e7e6" },
];

