/**
 * Normalização determinística de GARBLE de ASR CLÍNICO de altíssima confiança.
 *
 * A transcrição às vezes produz strings que NÃO existem no vocabulário médico de US
 * ("ecoeca", "miolétrico") ou troca um termo por um quase-homófono inequívoco
 * ("estímulo" no lugar de "istmo"). Quando isso chega à extração, o LLM ECOA o
 * garble cru (PELVE istmocele "na ecoeca") ou PERDE o dado (TIREOIDE: istmo ficou
 * "____ x ____") — boletim 2026-06-30 (e7ab387b, 900c411c).
 *
 * Aqui só tocamos em garbles INEQUÍVOCOS (strings que jamais são conteúdo clínico
 * legítimo). Aplicado ao ditado ANTES da extração. MUITO conservador — nada de
 * "correção" de termos que possam ser válidos.
 *
 * Flag: `ASR_CLINICAL` (default OFF).
 */
const CLINICAL_GARBLE: ReadonlyArray<readonly [RegExp, string]> = [
  // "istmo" tireoidiano transcrito como "estímulo" (nunca há "estímulo" num US).
  [/\best[íi]mulos?\b/gi, "istmo"],
  // "anecoica" quebrada: "na ecoeca" / "anecoeca" / "ecoeca" → anecoica.
  [/\bn[ao]\s+ecoec[ao]\b/gi, "anecoica"],
  [/\b(?:an?)?ecoec[ao]\b/gi, "anecoica"],
  // "miométrio" quebrado: "miolétrico" / "mio elétrico" → miométrio.
  [/\bmiol[ée]tric[oa]\b/gi, "miométrio"],
  [/\bmio\s+el[ée]tric[oa]\b/gi, "miométrio"],
];

/** Substitui garbles clínicos inequívocos por seus termos corretos. */
export function normalizeAsrClinical(text: string): string {
  let out = text;
  for (const [re, sub] of CLINICAL_GARBLE) out = out.replace(re, sub);
  return out;
}
