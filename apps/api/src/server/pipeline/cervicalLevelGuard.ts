/**
 * Guard determinístico — SUGESTÃO DE NÍVEL CERVICAL (Robbins) a partir de
 * referência anatômica. Pegada: o médico dita só a referência aproximada
 * ("ângulo da mandíbula", "supraclavicular") e o sistema sugere o nível Robbins
 * — sem pedir pra IA "adivinhar" (mapeamento anatomia→nível é fato, não criação).
 *
 * Comportamento: para CERVICAL, em cada FRASE que tem (a) uma referência
 * anatômica conhecida E (b) um placeholder "nível ___" (médico não disse o
 * nível), preenche com o nível provável + marcador [REVISAR] — que renderiza
 * roxo " (?)" no app e SOME ao copiar/enviar se o médico confirmar (reuso do
 * sistema de marcador). Não toca em frases com nível explícito.
 *
 * Fonte do mapeamento: Som/Curtin/Mancuso (Radiology 1999) — classificação
 * Robbins (ver snippets/CERVICAL/regra/niveis-cervicais-robbins.md).
 */

// Referência anatômica → nível Robbins. Ordem: mais específico primeiro.
const LEVEL_HINTS: { re: RegExp; level: string }[] = [
  { re: /supraclavicular|fossa\s+supraclavicular|virchow/i, level: "VB" },
  { re: /paratraqueal|pr[ée]-?traqueal|peritireoidian|pr[ée]-?lar[íi]nge|delfian|recorrencial|compartimento\s+central/i, level: "VI" },
  { re: /submentonian|subment[ãa]|abaixo\s+do\s+(queixo|mento)|entre\s+os\s+ventres[^.]{0,30}dig[áa]strico/i, level: "IA" },
  { re: /submandibular|[âa]ngulo\s+da\s+mand[íi]bula|gl[âa]ndula\s+submandibular/i, level: "IB" },
  { re: /jugular\s+m[ée]di|m[ée]di[oa]\s+jugular/i, level: "III" },
  { re: /jugular\s+inferior|inferior\s+jugular|jugular\s+baix/i, level: "IV" },
  // II exige qualificador vertical (jugular sem altura atravessa II/III/IV — não
  // resolver genérico, per revisão dex1). "base do crânio"/"retromandibular" são
  // altos o suficiente pra II.
  { re: /jugular\s+superior|superior\s+jugular|jugular\s+alt|base\s+do\s+cr[âa]nio|retromandibular/i, level: "II" },
  { re: /tri[âa]ngulo\s+posterior|posterior\s+ao\s+(m[úu]sculo\s+)?esternocleidomast[óo]ide|borda\s+posterior\s+do\s+ecm|cervical\s+posterior/i, level: "V" },
];

const LEVEL_PLACEHOLDER = /(n[íi]vel\s+)_{2,}/i;

/** Sugere o nível Robbins nos placeholders "nível ___" conforme a anatomia. */
export function applyCervicalLevelSuggestions(laudo: string): string {
  // Processa por FRASE (mantém os delimitadores) pra casar a referência
  // anatômica com o placeholder na mesma frase — sem cross-matching frágil.
  const segments = laudo.split(/(\n|(?<=[.;])\s+)/);
  return segments
    .map((seg) => {
      if (!LEVEL_PLACEHOLDER.test(seg)) return seg;
      const hint = LEVEL_HINTS.find((h) => h.re.test(seg));
      if (!hint) return seg;
      return seg.replace(
        LEVEL_PLACEHOLDER,
        `$1${hint.level} [REVISAR — nível sugerido]`,
      );
    })
    .join("");
}
