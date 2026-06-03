import type { RagBlockForPrompt } from "@laudousg/shared";

/**
 * Seleção determinística da VIA DE ACESSO da pelve feminina (transabdominal /
 * transvaginal / ambas).
 *
 * BUG corrigido (2026-06-03): o modelo-base `pelve-feminina-modelo-template-ta-tv`
 * tem priority 100 (vs 70 dos templates `-ta` e `-tv`). O retriever ordena por
 * (priority DESC, similarity DESC) com quota modelo=2, então o template TA+TV era
 * SEMPRE recuperado no topo e o writer o copiava — gerando títulos/técnica
 * "TRANSABDOMINAL E TRANSVAGINAL" mesmo quando o médico ditava só uma via.
 *
 * Estratégia: quando a via é detectada deterministicamente no input bruto,
 * mantém-se APENAS o modelo-base correspondente (deduplicado — há cópias
 * triplicadas no banco) e descartam-se os demais modelos-base. Blocos não-modelo
 * (regras, frases, conclusões) e o modelo pós-abortamento ficam intactos.
 */

export type PelveRoute = "TA_TV" | "TA" | "TV";

/** Detecta a(s) via(s) ditada(s). null = não mencionada (não interferir). */
export function detectPelveRoute(rawInput: string): PelveRoute | null {
  const t = rawInput.toLowerCase();
  // Em laudo de pelve, "vaginal"/"abdominal" referem-se à via de acesso —
  // cobre transvaginal, endovaginal, "via vaginal", "via vaginal e abdominal" etc.
  const hasTV = /vaginal/.test(t);
  const hasTA = /abdominal|suprap[uú]bic/.test(t);
  if (hasTV && hasTA) return "TA_TV";
  if (hasTV) return "TV";
  if (hasTA) return "TA";
  return null;
}

/** Classifica um modelo-base pela via, a partir do conteúdo do template. */
function templateRoute(content: string): PelveRoute | null {
  const c = content.toLowerCase();
  const ta = c.includes("transabdominal");
  const tv = c.includes("transvaginal");
  if (ta && tv) return "TA_TV";
  if (ta) return "TA";
  if (tv) return "TV";
  return null;
}

/** Modelo-base de via = kind modelo que NÃO é o especial pós-abortamento. */
function isBaseTemplate(b: RagBlockForPrompt): boolean {
  return b.kind === "modelo" && !/abortamento/i.test(b.title);
}

/**
 * Contexto ATIVO de abortamento/produtos retidos → modelo pós-abortamento.
 * Específico de propósito: NÃO casa negação nem história ("nega aborto",
 * "sem história de aborto", "abortos prévios") — só achados que selecionam o
 * modelo D. (Edge case apontado na review do dex1.)
 */
function hasAbortamentoContext(rawInput: string): boolean {
  return /produtos?\s+retid|restos\s+ovulares|restos\s+placent|p[óo]s[-\s]?abort|controle\s+.{0,15}abort|esvaziamento\s+uterino|abort(o|amento)\s+(retido|incompleto|em\s+curso)/i.test(
    rawInput,
  );
}

/** Dedup por conteúdo (cópias triplicadas no banco) + maior priority, mantém 1. */
function pickOne(pool: RagBlockForPrompt[]): RagBlockForPrompt[] {
  const seen = new Set<string>();
  return pool
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .filter((b) => {
      const key = b.content.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 1);
}

export function applyPelveRouteSelection(
  blocks: RagBlockForPrompt[],
  categoryCode: string,
  rawInput: string,
): RagBlockForPrompt[] {
  if (categoryCode !== "PELVE_FEMININA") return blocks;
  const route = detectPelveRoute(rawInput);
  if (!route) return blocks; // via não ditada → não interfere

  const nonModelo = blocks.filter((b) => b.kind !== "modelo");
  const modelos = blocks.filter((b) => b.kind === "modelo");
  if (modelos.length === 0) return blocks;

  if (hasAbortamentoContext(rawInput)) {
    // Abortamento → mantém só o modelo pós-abortamento (modelo D).
    const posAbort = modelos.filter((b) => /abortamento/i.test(b.title));
    const keep = pickOne(posAbort.length > 0 ? posAbort : modelos);
    return [...nonModelo, ...keep];
  }

  // Caso normal → mantém só o modelo-base da via ditada; descarta as outras
  // vias E o pós-abortamento (que sequestrava o título).
  const baseTemplates = modelos.filter(isBaseTemplate);
  const matching = baseTemplates.filter(
    (b) => templateRoute(b.content) === route,
  );
  // Fallback defensivo: se o template da via não veio no retrieval, não deixa
  // o laudo sem modelo.
  const pool =
    matching.length > 0
      ? matching
      : baseTemplates.length > 0
        ? baseTemplates
        : modelos;
  return [...nonModelo, ...pickOne(pool)];
}
