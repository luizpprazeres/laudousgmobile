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

/**
 * Garbles GLOBAIS: strings que NÃO existem no vocabulário PT (não-palavras), então
 * podem ser normalizadas em qualquer categoria sem risco de falso-positivo.
 */
const CLINICAL_GARBLE_GLOBAL: ReadonlyArray<readonly [RegExp, string]> = [
  // "anecoica" quebrada: "na ecoeca" / "anecoeca" / "ecoeca" → anecoica.
  [/\bn[ao]\s+ecoec[ao]\b/gi, "anecoica"],
  [/\b(?:an?)?ecoec[ao]\b/gi, "anecoica"],
  // "miométrio" quebrado: "miolétrico" / "mio elétrico" → miométrio.
  [/\bmiol[ée]tric[oa]\b/gi, "miométrio"],
  [/\bmio\s+el[ée]tric[oa]\b/gi, "miométrio"],
];

/**
 * Garbles ESCOPADOS por categoria: "estímulo" é palavra PT legítima ("estímulo
 * doloroso") e só deve virar "istmo" no contexto tireoidiano — jamais há
 * "estímulo" num US de tireoide. Restringir por categoria evita falso-positivo
 * fora de TIREOIDE (review dex1, 2026-07-01).
 */
const CLINICAL_GARBLE_BY_CATEGORY: Readonly<
  Record<string, ReadonlyArray<readonly [RegExp, string]>>
> = {
  TIREOIDE: [
    // "istmo" tireoidiano transcrito como "estímulo".
    [/\best[íi]mulos?\b/gi, "istmo"],
  ],
};

/**
 * Substitui garbles clínicos inequívocos por seus termos corretos.
 * `categoryCode` habilita regras escopadas por categoria (ex.: estímulo→istmo só
 * em TIREOIDE). Sem categoria, aplica apenas os garbles globais (não-palavras).
 */
export function normalizeAsrClinical(text: string, categoryCode?: string): string {
  let out = text;
  for (const [re, sub] of CLINICAL_GARBLE_GLOBAL) out = out.replace(re, sub);
  const scoped = categoryCode
    ? CLINICAL_GARBLE_BY_CATEGORY[categoryCode]
    : undefined;
  if (scoped) for (const [re, sub] of scoped) out = out.replace(re, sub);
  return out;
}
