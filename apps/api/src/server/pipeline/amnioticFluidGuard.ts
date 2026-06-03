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
