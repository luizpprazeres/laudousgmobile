const FAIL_CLOSED_CLINICAL_RENDERERS = new Set([
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
]);

export function clinicalRendererFallbackBlocked(categoryCode: string): boolean {
  return FAIL_CLOSED_CLINICAL_RENDERERS.has(canonicalClinicalCategory(categoryCode));
}

export function canonicalClinicalCategory(categoryCode: string): string {
  return categoryCode === "ABDOME_TOTAL_DOPPLER" ? "ABDOMEN_TOTAL_DOPPLER" : categoryCode;
}

/** Explicit exam selection/title only; a bare Doppler mention is not sufficient. */
export function structuredClinicalIntent(categoryHint?: string, rawInput = ""): string | undefined {
  if (categoryHint && clinicalRendererFallbackBlocked(categoryHint)) return canonicalClinicalCategory(categoryHint);
  if (/\b(?:abdome|abdomen)[_\s]+total[_\s]+(?:(?:com|c\/)\s+)?doppler\b/i.test(rawInput)) return "ABDOMEN_TOTAL_DOPPLER";
  return undefined;
}

// Only existing ordinary V2 specs. No defaults, clamped hints or future categories.
const EARLY_WRITER_V2_SAFE_CATEGORIES = new Set(["ABDOMEN_TOTAL", "PELVE_FEMININA", "MORFOLOGICO", "DOPPLER_OBSTETRICO"]);
export function earlyWriterV2Allowed(categoryHint: string | undefined, knownCategories: Set<string>): boolean {
  return categoryHint !== undefined && knownCategories.has(categoryHint) && EARLY_WRITER_V2_SAFE_CATEGORIES.has(categoryHint);
}
