/**
 * Seleção determinística da CATEGORIA para exame MORFOLÓGICO com Doppler.
 *
 * BUG corrigido (2026-06-04): quando o médico dita "morfológico COM Doppler",
 * o structurer (LLM) vê a palavra "Doppler" e detecta a categoria
 * DOPPLER_OBSTETRICO. O retriever filtra `category_code = DOPPLER_OBSTETRICO`,
 * então NUNCA alcança os blocos `modelo` da categoria MORFOLOGICO (1t/2t/3t,
 * priority 100, que já incluem seção Doppler) e o laudo perde a estrutura
 * morfológica (anatomia detalhada, ossos longos, marcadores).
 *
 * Morfológico PURO já roteia corretamente para MORFOLOGICO — o bug aparece
 * SÓ quando há Doppler junto.
 *
 * Estratégia (estilo pelveRouteSelection): detectar deterministicamente, no
 * input bruto, que se trata de um EXAME morfológico e sobrescrever a categoria
 * efetiva para MORFOLOGICO (mantendo a categoria DETECTADA intacta para
 * auditoria honesta). NÃO mutamos `findings` — devolvemos a categoria efetiva.
 *
 * Os blocos morfológicos já contêm Doppler, então o roteamento sozinho resolve;
 * a fraseologia da conclusão Doppler é tratada separadamente pelo
 * dopplerConclusionGuard (pós-writer).
 */

/**
 * O structurer (LLM) emite `categoria_detectada` em texto livre e às vezes
 * inventa códigos não-canônicos (ex.: "ULTRASSONOGRAFIA_OBSTETRICA"). Tratamos
 * como "família obstétrica" qualquer código que mencione obstétrica, doppler ou
 * morfológico — todos podem ceder ao roteamento morfológico quando o input é
 * claramente um exame morfológico. Categorias fora dessa família
 * (ABDOMEN_TOTAL, TIREOIDE, ...) nunca são reclassificadas.
 */
function isObstetricFamily(detectedCategory: string): boolean {
  return /obst[ée]tric|doppler|morfol[óo]gic/i.test(detectedCategory);
}

/**
 * Gatilho FORTE: o médico nomeou o exame morfológico explicitamente.
 * Alta precisão — "ultrassom/USG morfológico", "morfológico fetal",
 * "morfológico de 1º/2º/3º trimestre", "morfológico com Doppler".
 *
 * NÃO casa adjetivo solto ("morfologia preservada", "avaliação morfológica
 * normal", "aspecto morfológico"), que aparece em obstétrico Doppler puro.
 */
function hasExplicitMorphologicExam(rawInput: string): boolean {
  const t = rawInput.toLowerCase();
  // "morfológic(o/a)" como substantivo de exame: precedido de ultrassom/USG/
  // exame/avaliação OU seguido de fetal/trimestre/com doppler. Evita o
  // adjetivo descritivo ("morfologia ... normal/preservada").
  return (
    // (a) nome do exame: "ultrassom/USG/ecografia/exame morfológico(a)"
    /\b(ultrassom|ultrassonografia|usg|exame|ecografia)\s+morfol[óo]gic[oa]\b/.test(
      t,
    ) ||
    // (b) "morfológico fetal" / "morfológico com doppler"
    /\bmorfol[óo]gic[oa]\s+(fetal|com\s+doppler)\b/.test(t) ||
    // (c) "morfológico de/do 1/2/3/1º/2º/3º/primeiro/segundo/terceiro [trimestre]"
    /\bmorfol[óo]gic[oa]\s+d[eo]\s+(1[ºo]?|2[ºo]?|3[ºo]?|primeiro|segundo|terceiro)\b/.test(
      t,
    )
  );
}

/** Indica presença de Doppler no input (obstétrico). */
function mentionsDoppler(rawInput: string): boolean {
  return /\bdoppler\b/i.test(rawInput);
}

/**
 * Sinais morfológicos FORTES (anatomia detalhada que não aparece num
 * obstétrico/Doppler padrão). Usados no gatilho conservador de recall.
 */
const STRONG_MORPHOLOGIC_SIGNALS: RegExp[] = [
  /\bcerebelo\b/,
  /\bcisterna\s+magna\b/,
  /\b(osso|ossos)\s+(longo|longos|nasal)\b/,
  /\b[úu]mero\b/,
  /\br[áa]dio\b/,
  /\bulna\b/,
  /\bt[íi]bia\b/,
  /\bf[íi]bula\b/,
  /\bfaces?\b|\bl[áa]bio\b|\bpalato\b|\bperfil\s+facial\b/,
  /\bquatro\s+c[âa]maras\b|\b4\s*c[âa]maras\b/,
  /\bcoluna\s+(vertebral|fetal)\b/,
  /\brins\b|\bbexiga\s+fetal\b/,
  /\bm[ãa]os\b|\bp[ée]s\b/,
  /\bpregas?\s+nucal\b|\btransluc[êe]ncia\s+nucal\b/,
];

/** Conta sinais morfológicos fortes distintos no input. */
function countStrongMorphologicSignals(rawInput: string): number {
  const t = rawInput.toLowerCase();
  let n = 0;
  for (const re of STRONG_MORPHOLOGIC_SIGNALS) {
    if (re.test(t)) n += 1;
  }
  return n;
}

/** Limiar de sinais fortes para o gatilho conservador (Doppler + anatomia). */
const STRONG_SIGNAL_THRESHOLD = 2;

export interface MorfologicoRouteResult {
  /** Categoria efetiva a usar no retriever/writer/sanity. */
  category: string;
  /** Houve override? */
  overridden: boolean;
  /** Por qual gatilho (telemetria). */
  reason: "explicit_exam" | "doppler_plus_signals" | null;
}

/**
 * Resolve a categoria efetiva para o roteamento. Recebe a categoria detectada
 * pelo structurer e o input bruto.
 *
 * Override → MORFOLOGICO quando:
 *  (a) a categoria detectada é obstétrica (DOPPLER_OBSTETRICO/OBSTETRICA), E
 *  (b) o input nomeia explicitamente um exame morfológico, OU
 *      tem Doppler + ≥ STRONG_SIGNAL_THRESHOLD sinais morfológicos fortes.
 *
 * Caso contrário, devolve a categoria detectada sem alteração.
 */
export function resolveMorfologicoCategory(
  detectedCategory: string,
  rawInput: string,
): MorfologicoRouteResult {
  // `overridden` só é verdadeiro quando a categoria REALMENTE muda — evita logar
  // "MORFOLOGICO -> MORFOLOGICO" quando o structurer já acertou (morfológico puro).
  const changed = detectedCategory !== "MORFOLOGICO";

  // Gatilho FORTE: o input NOMEIA o exame morfológico. É autoritativo — não
  // depende do palpite do structurer (que às vezes inventa códigos livres como
  // ULTRASSONOGRAFIA_FETAL). A alta precisão do regex já evita falso-positivo.
  if (hasExplicitMorphologicExam(rawInput)) {
    return {
      category: "MORFOLOGICO",
      overridden: changed,
      reason: changed ? "explicit_exam" : null,
    };
  }

  // Gatilho CONSERVADOR (sem a palavra "morfológico"): Doppler + ≥N sinais
  // anatômicos fortes. Aqui SIM exige família obstétrica detectada, pra não
  // reclassificar exames de outra natureza que coincidam sinais.
  if (
    isObstetricFamily(detectedCategory) &&
    mentionsDoppler(rawInput) &&
    countStrongMorphologicSignals(rawInput) >= STRONG_SIGNAL_THRESHOLD
  ) {
    return {
      category: "MORFOLOGICO",
      overridden: changed,
      reason: changed ? "doppler_plus_signals" : null,
    };
  }

  return { category: detectedCategory, overridden: false, reason: null };
}
