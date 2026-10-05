import { mentionsCurrentAbdomenTotalDoppler } from "./abdomenDopplerIntent";

const FAIL_CLOSED_CLINICAL_RENDERERS = new Set([
  "ABDOMEN_TOTAL_DOPPLER",
  // Contrato e extração dedicada; falha de evidências nunca vira writer geral.
  "DOPPLER_HEPATICO",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
  // Writer dedicado aprovado. Se modelo/audit/rota falhar, nunca entregar um
  // texto plausível do writer geral sem as regras renais aprovadas.
  "DOPPLER_RENAL",
  "DOPPLER_VENOSO_MMII",
  "DOPPLER_VENOSO_MMII_MEDIDAS",
]);

export function clinicalRendererFallbackBlocked(categoryCode: string): boolean {
  return FAIL_CLOSED_CLINICAL_RENDERERS.has(canonicalClinicalCategory(categoryCode));
}

export function canonicalClinicalCategory(categoryCode: string): string {
  return categoryCode === "ABDOME_TOTAL_DOPPLER" ? "ABDOMEN_TOTAL_DOPPLER" : categoryCode;
}

/**
 * Explicit exam selection/title only; a bare Doppler mention is not sufficient.
 * The title must name the current exam: negated or prior-exam mentions do not count.
 */
export function structuredClinicalIntent(categoryHint?: string, rawInput = ""): string | undefined {
  if (categoryHint && clinicalRendererFallbackBlocked(categoryHint)) return canonicalClinicalCategory(categoryHint);
  if (mentionsCurrentAbdomenTotalDoppler(rawInput)) return "ABDOMEN_TOTAL_DOPPLER";
  return undefined;
}

// Only existing ordinary V2 specs. No defaults, clamped hints or future categories.
const EARLY_WRITER_V2_SAFE_CATEGORIES = new Set(["ABDOMEN_TOTAL", "PELVE_FEMININA", "MORFOLOGICO", "DOPPLER_OBSTETRICO"]);
export function earlyWriterV2Allowed(categoryHint: string | undefined, knownCategories: Set<string>): boolean {
  return categoryHint !== undefined && knownCategories.has(categoryHint) && EARLY_WRITER_V2_SAFE_CATEGORIES.has(categoryHint);
}
