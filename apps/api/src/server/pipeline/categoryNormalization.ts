/**
 * Normalização determinística do `category_code` detectado pelo structurer.
 *
 * BUG (2026-06-04): o structurer (LLM) ocasionalmente emite códigos de categoria
 * NÃO-CANÔNICOS (ex.: "ULTRASSONOGRAFIA_OBSTETRICA", "ULTRASSONOGRAFIA_FETAL")
 * que não existem na tabela `categories`. Como reports.category_code tem FK pra
 * categories.code, gravar um código inválido QUEBRA a FK e derruba o pipeline
 * inteiro (PIPELINE_FAILURE). A defesa primária é constranger o prompt do
 * structurer à lista válida; esta função é a rede de segurança determinística.
 *
 * Estratégia (ordem):
 *  1. Código já é válido → mantém.
 *  2. Contém um código válido como substring (ULTRASSONOGRAFIA_OBSTETRICA ⊃
 *     OBSTETRICA) → mapeia, com desempate por Doppler.
 *  3. Heurística por família de exame (palavras-chave no código + texto bruto).
 *  4. category_hint, se válido.
 *  5. Último recurso: devolve o código detectado (o validator trata como
 *     "categoria desconhecida" — comportamento explícito, não inventa categoria).
 *
 * NÃO depende de banco — recebe o conjunto de códigos válidos (categoriesInfo).
 */

/**
 * Pares base → variante-Doppler. Quando o match cai na categoria base mas o
 * input tem Doppler, sobe pra variante (nomes divergem demais pra inferir por
 * string — ex.: OBSTETRICA vs DOPPLER_OBSTETRICO).
 */
const DOPPLER_UPGRADE: Record<string, string> = {
  OBSTETRICA: "DOPPLER_OBSTETRICO",
  ABDOMEN_TOTAL: "ABDOMEN_TOTAL_DOPPLER",
};

/**
 * Heurísticas família → código canônico, aplicadas SOBRE O CÓDIGO DETECTADO
 * (não o texto bruto) pra mapear códigos não-canônicos inventados pelo LLM.
 * Ordem CRÍTICA: específico ANTES de genérico (senão /abdom/ rouba de
 * PAREDE_ABDOMINAL, /cervical/ rouba de GLANDULAS_SALIVARES, etc).
 */
const FAMILY_RULES: Array<{ test: RegExp; code: string; needsDoppler?: boolean }> =
  [
    // ── Mais específicos primeiro ──
    { test: /paratire[óo]id/i, code: "PARATIREOIDE" },
    { test: /gl[âa]ndulas?\s*salivar|par[óo]tid|submandibular/i, code: "GLANDULAS_SALIVARES" },
    { test: /parede\s*abdominal|parede_abdominal/i, code: "PAREDE_ABDOMINAL" },
    { test: /vias?\s*urin[áa]ri|urin[áa]ri|trato_urin/i, code: "VIAS_URINARIAS" },
    { test: /pr[óo]stata.*transretal|transretal/i, code: "PROSTATA_TRANSRETAL" },
    { test: /abdom.*superior|abdome?n?_superior/i, code: "ABDOMEN_SUPERIOR" },
    { test: /quadril.*infantil|displasia.*quadril/i, code: "QUADRIL_INFANTIL" },
    { test: /transfontanel/i, code: "TRANSFONTANELA" },
    { test: /car[óo]tid/i, code: "DOPPLER_CAROTIDAS" },
    { test: /f[íi]stula|_fav\b|\bfav_/i, code: "DOPPLER_FISTULA_AV" },
    // ── Obstétrico / fetal / morfológico (morfológico ANTES de obstétrico) ──
    // Testado só no CÓDIGO detectado → não captura adjetivo "morfológica normal"
    // do texto bruto (essa cautela fica no morfologicoRouteSelection).
    { test: /morfol[óo]gic/i, code: "MORFOLOGICO" },
    { test: /obst[ée]tric|gestac|pr[ée].?natal|\bfeto\b|\bfetal\b/i, code: "DOPPLER_OBSTETRICO", needsDoppler: true },
    { test: /obst[ée]tric|gestac|pr[ée].?natal|\bfeto\b|\bfetal\b/i, code: "OBSTETRICA" },
    // ── Demais específicos ──
    { test: /pr[óo]stata/i, code: "PROSTATA_SUPRAPUBICA" },
    { test: /escrot|test[íi]cul/i, code: "ESCROTAL" },
    { test: /\bmam[áa]ri|\bmama\b/i, code: "MAMARIA" },
    { test: /pelve|pelvic|transvaginal|endovaginal/i, code: "PELVE_FEMININA" },
    { test: /tire[óo]id/i, code: "TIREOIDE" },
    { test: /ocular|globo_ocular|[óo]rbit/i, code: "OCULAR" },
    { test: /inguinal/i, code: "REGIAO_INGUINAL" },
    { test: /partes_moles|partes\s*moles/i, code: "PARTES_MOLES" },
    { test: /t[óo]rax|tor[áa]cic/i, code: "TORAX" },
    { test: /musculoesquel[ée]tic|articula|tend[ãa]o/i, code: "MUSCULOESQUELETICO_V2" },
    { test: /cervical|pesco[çc]o/i, code: "CERVICAL" },
    // ── Genéricos por último ──
    { test: /abdom/i, code: "ABDOMEN_TOTAL_DOPPLER", needsDoppler: true },
    { test: /abdom/i, code: "ABDOMEN_TOTAL" },
  ];

/**
 * Devolve um category_code garantidamente normalizado. Se não conseguir mapear
 * para um código válido, devolve o detectado (caller/validator decide).
 */
export function normalizeCategoryCode(
  detectedCategory: string,
  knownCodes: Set<string>,
  rawInput: string,
  categoryHint?: string,
): { category: string; normalized: boolean } {
  // 1. Já é válido.
  if (knownCodes.has(detectedCategory)) {
    return { category: detectedCategory, normalized: false };
  }

  const hasDoppler = /\bdoppler\b/i.test(rawInput);

  // 2. Contém um código válido como substring (desempate por Doppler quando há
  // par com/sem Doppler, ex.: OBSTETRICA vs DOPPLER_OBSTETRICO).
  const upper = detectedCategory.toUpperCase();
  const substringMatches = [...knownCodes].filter((code) =>
    upper.includes(code),
  );
  // prefere o mais longo (mais específico).
  substringMatches.sort((a, b) => b.length - a.length);
  const best = substringMatches[0];
  if (best) {
    // upgrade pra variante-Doppler quando aplicável.
    const upgraded = DOPPLER_UPGRADE[best];
    if (hasDoppler && upgraded && knownCodes.has(upgraded)) {
      return { category: upgraded, normalized: true };
    }
    return { category: best, normalized: true };
  }

  // 3. Heurística por família — testada SOBRE O CÓDIGO detectado (não o texto
  // bruto), pra não capturar adjetivos do laudo (ex.: "morfológica normal").
  // Underscores viram espaço: `\b` não dispara entre `_` e letra (underscore é
  // char de palavra), então "ULTRASSONOGRAFIA_FETAL" precisa virar "... FETAL".
  // O desempate por Doppler usa hasDoppler (texto), separado do match de família.
  const detSpaced = detectedCategory.replace(/_/g, " ");
  for (const rule of FAMILY_RULES) {
    if (rule.needsDoppler && !hasDoppler) continue;
    if (rule.test.test(detSpaced) && knownCodes.has(rule.code)) {
      return { category: rule.code, normalized: true };
    }
  }

  // 4. category_hint válido.
  if (categoryHint && knownCodes.has(categoryHint)) {
    return { category: categoryHint, normalized: true };
  }

  // 5. Sem mapeamento seguro — devolve detectado (validator trata explicitamente).
  return { category: detectedCategory, normalized: false };
}
