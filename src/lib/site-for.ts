/** Which climate each system's page shows it in (where Weatherhaven describes it working). Kept apart from
 * siteBackdrop.ts so the page script can read it without pulling in three.js. */
export type SiteKind = "desert" | "arctic" | "temperate" | "tropical";
export const SITE_FOR: Record<string, SiteKind> = {
  mecc: "temperate", ehmecc: "desert", ateps: "desert", hercon: "temperate", series4: "temperate", series8: "tropical",
  rdmss: "desert", mts: "temperate", mex26: "desert", polarhaven: "arctic", polarchief: "arctic", endurance: "arctic",
};
