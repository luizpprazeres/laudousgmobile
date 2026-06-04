/**
 * Guard determinístico de LÍQUIDO AMNIÓTICO.
 *
 * BUG corrigido (2026-06-03): o protocolo determinístico em prompts/global.ts
 * (§ LÍQUIDO AMNIÓTICO) classifica a quantidade puramente pelo número
 * (ILA < 8 = reduzida; bloqueio ILA < 6 = SEMPRE reduzida). Quando o médico
 * JÁ declarava a quantidade ("líquido amniótico de quantidade normal" com
 * ILA 5,7 cm), o writer recomputava "reduzida" e CONTRADIZIA o médico — falha
 * clínica/jurídica grave. Reforço de prompt não resolve (a "trava de segurança"
 * em linguagem absoluta vencia a regra de precedência).
 *
 * Solução: pós-processamento determinístico. Se o médico classificou
 * explicitamente a quantidade no input, o output é forçado a usar essa
 * classificação. Quando o médico só dá o número (sem classificar), o protocolo
 * do prompt continua valendo (este guard é no-op).
 */
import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

export type AmnioticClass = "normal" | "reduzida" | "aumentada";

/** Classificação de líquido amniótico explicitamente declarada pelo médico. */
export function detectStatedAmnioticClass(
  rawInput: string,
): AmnioticClass | null {
  const t = rawInput.toLowerCase();

  const NEG =
    "(?:sem|nega|nego|aus[êe]ncia de|descarta|exclui|sem sinais de|sem evid[êe]ncia de)\\s+(?:sinais de\\s+)?";
  const oligo = "oligo(?:hidr|idr|dr)?[âa]mnio";
  const poli = "poli(?:hidr|idr|dr)?[âa]mnio";

  const hasOligo = new RegExp(oligo, "i").test(t);
  const hasPoli = new RegExp(poli, "i").test(t);
  // NEGAÇÃO ("sem oligoâmnio", "nega polidrâmnio") não classifica como
  // patológico — evita transformar normal em reduzido/aumentado (review dex1).
  const negOligo = new RegExp(NEG + oligo, "i").test(t);
  const negPoli = new RegExp(NEG + poli, "i").test(t);

  if (hasOligo && !negOligo) return "reduzida";
  if (hasPoli && !negPoli) return "aumentada";

  // Classificação explícita junto de líquido / ILA / AFI / MBV / bolsão.
  const m = t.match(
    /(?:l[íi]quido(?:\s+amni[óo]tico)?|ila|afi|mbv|bolsão[^.;\n]{0,30})\s+(?:(?:de|em)\s+quantidade\s+)?(normal|adequad\w*|preservad\w*|reduzid\w*|diminu[íi]d\w*|escass\w*|aumentad\w*)/,
  );
  if (!m) return null;
  const w = m[1]!;
  if (/^(?:normal|adequad|preservad)/.test(w)) return "normal";
  if (/^aumentad/.test(w)) return "aumentada";
  return "reduzida"; // reduzid / diminuíd / escass
}

/**
 * Força a classificação do líquido no laudo a respeitar a declarada pelo médico.
 * No-op se o médico não classificou OU se o laudo não tem linha de quantidade.
 */
export function enforceStatedAmnioticClass(
  output: string,
  rawInput: string,
): string {
  const cls = detectStatedAmnioticClass(rawInput);
  if (!cls) return output;
  if (
    !/Líquido amniótico (?:de|em) quantidade (?:normal|reduzida|aumentada)/i.test(
      output,
    )
  ) {
    return output;
  }
  return output.replace(
    /(Líquido amniótico (?:de|em) quantidade )(normal|reduzida|aumentada)/gi,
    (_match, prefix: string) => `${prefix}${cls}`,
  );
}

/**
 * Garante a frase de líquido amniótico na CONCLUSÃO como item 2 (após a IG),
 * default "Líquido amniótico de quantidade normal." — a regra do banco manda
 * SEMPRE incluir, mas o LLM às vezes omite (prompt não vence → determinístico).
 *
 * No-op se a conclusão já tiver a frase de líquido. A classe (normal/reduzida/
 * aumentada) é ajustada depois por enforceStatedAmnioticClass se o médico ditou.
 * Renumera os itens da conclusão em sequência.
 */
const LIQUIDO_RE = /Líquido amniótico (?:de|em) quantidade/i;
const DEFAULT_LIQUIDO = "Líquido amniótico de quantidade normal.";
const VALID_AMNIOTIC_CLASS =
  /quantidade\s+(?:normal|reduzid|aumentad|adequad|preservad)/i;

export function ensureAmnioticConclusionLine(output: string): string {
  const parsed = parseConclusion(output);
  if (!parsed.found) return output;

  const hasIg = parsed.items.some((it) => /Gesta[çc][ãa]o em torno de/i.test(it));
  if (!hasIg) return output; // estrutura inesperada → não mexe

  // Preserva o conteúdo existente da frase de líquido SOMENTE se tiver classe
  // válida (normal/reduzida/aumentada). Se o LLM deixou placeholder
  // ("quantidade ____") ou classe inválida, usa o default "normal".
  const existing = parsed.items.find((it) => LIQUIDO_RE.test(it));
  const liquidoText =
    existing && VALID_AMNIOTIC_CLASS.test(existing) ? existing : DEFAULT_LIQUIDO;

  // Remove a frase de líquido de onde estiver e reinsere após a IG (item 2).
  const without = parsed.items.filter((it) => !LIQUIDO_RE.test(it));
  const igIdx = without.findIndex((it) => /Gesta[çc][ãa]o em torno de/i.test(it));
  without.splice(igIdx + 1, 0, liquidoText);

  return renderWithConclusion(parsed, without);
}
