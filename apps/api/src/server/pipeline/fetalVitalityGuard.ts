import type { DeterministicIssue } from "./deterministicSanity";

/**
 * O médico declarou ausência de vitalidade — e o laudo saiu afirmando BCF?
 *
 * DUAS CORREÇÕES sobre a primeira versão (revisão 16/08):
 *
 * 1. "ÓBITO" não era reconhecido. O vocabulário do dia a dia é "óbito fetal",
 *    "feto morto", "parou o coração" — e nenhum casava. O guard ficava mudo
 *    exatamente no caso que ele existe para pegar.
 *
 * 2. NO GEMELAR ele era falso-positivo garantido. "Feto A com 140, feto B sem
 *    batimentos" tem, no MESMO laudo, uma negativa (correta) e um BCF positivo
 *    (também correto) — e o guard marcava o laudo como divergente. O que torna
 *    um guard crítico inútil não é errar pouco: é errar sempre no caso em que
 *    ele deveria falar. Agora a leitura é POR BLOCO DE FETO.
 */

const NEGATIVE_VITALITY_PATTERNS = [
  /\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b[^.!?\n]{0,50}\b(?:n[aã]o\s+(?:foram\s+)?visualizad[oa]s?|ausentes?)\b/iu,
  /\b(?:n[aã]o\s+(?:foram\s+)?visualizad[oa]s?|ausentes?)\b[^.!?\n]{0,30}\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b/iu,
  /\bsem\s+(?:atividade\s+card[ií]aca|batimentos?(?:\s+card[ií]acos?)?)\b/iu,
  /\b(?:feto|embri[aã]o)\s+sem\s+vitalidade\b/iu,
  /\bsem\s+(?:sinais\s+de\s+)?vitalidade\s+(?:fetal|embrion[aá]ria)\b/iu,
  /**
   * Vocabulário que o médico realmente usa — e que a v1 não via.
   *
   * `(?<!\p{L})` no lugar de `\b`: o `\b` do JavaScript é ASCII, então ele NÃO
   * reconhece limite de palavra antes de "ó". `/\bóbito/` simplesmente nunca
   * casa "Óbito fetal" — foi assim que o padrão passou no code review e falhou
   * no primeiro teste.
   */
  /(?<!\p{L})[óo]bito\s+(?:fetal|embrion[aá]ri[oa]|do\s+feto|intrauterino)/iu,
  /(?<!\p{L})morte\s+(?:fetal|embrion[aá]ria|intrauterina)/iu,
  /(?<!\p{L})feto\s+(?:morto|sem\s+vida|inviável|obitado)/iu,
  /**
   * "Ausência de batimentos cardíacos fetais." é a frase que o PRÓPRIO catálogo
   * escreve no corpo. Sem ela o guard não reconhecia a sua própria saída como
   * negativa honrada, e acusava divergência no laudo que ele mesmo montou.
   */
  /(?<!\p{L})ausência\s+de\s+(?:atividade\s+card[ií]aca|vitalidade|batimentos?\s+card[ií]acos?)/iu,
];

const POSITIVE_BCF_PATTERNS = [
  /\bbcf\s*(?:de\s+|[=:]\s*)?(?:\d{2,3}|_{2,})\s*(?:bpm)?\b/iu,
  /\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)[^.!?\n]{0,35}\b(?:presentes?|r[ií]tmic[oa]s?)\b/iu,
  /\b(?:presentes?|r[ií]tmic[oa]s?)\b[^.!?\n]{0,35}\b(?:bcf|batimentos?\s+card[ií]acos?\s+fetais?)\b/iu,
];

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return undefined;
}

/**
 * O corpo do laudo, sem a conclusão.
 *
 * A conclusão junta itens de fetos diferentes numa lista só — ler os blocos
 * por feto ali dentro misturaria "Óbito fetal (feto B)" com o item de líquido
 * do exame. A atribuição por feto só é confiável no corpo, onde existe o
 * cabeçalho.
 */
function corpoSemConclusao(texto: string): string {
  const i = texto.search(/^\s*(?:CONCLUS[ÃA]O|IMPRESS[ÃA]O)\s*:/imu);
  return i === -1 ? texto : texto.slice(0, i);
}

/** Blocos "Feto A:", "Feto B:" … do corpo. `null` quando o laudo não é gemelar. */
function blocosPorFeto(corpo: string): { rotulo: string; texto: string }[] | null {
  const cabecalhos = [...corpo.matchAll(/^[ \t]*Feto\s+([A-Za-z0-9]{1,3})\s*:[ \t]*$/gmu)];
  if (cabecalhos.length < 2) return null;
  return cabecalhos.map((m, i) => ({
    rotulo: m[1] as string,
    texto: corpo.slice(
      (m.index ?? 0) + m[0].length,
      i + 1 < cabecalhos.length ? cabecalhos[i + 1]!.index : corpo.length,
    ),
  }));
}

function issue(detail: string, trecho: string): DeterministicIssue {
  return {
    type: "vitalidade_fetal_divergente",
    severity: "critical",
    detail,
    trecho_laudo: trecho,
    campo_achado: "vitalidade_fetal",
  };
}

/**
 * Sinaliza BCF positivo no laudo quando o médico declarou ausência de
 * batimentos/vitalidade. Ausência de BCF no input, isoladamente, não dispara.
 *
 * LIMITE CONHECIDO: no gemelar não se afirma QUANTOS fetos perderam a
 * vitalidade — o ditado é texto corrido e atribuir a negativa a um feto
 * específico exigiria interpretá-lo. O que se afirma é que a negativa do
 * médico sobreviveu em ALGUM feto. Um laudo de trigemelar em que dois fetos
 * morreram e só um foi registrado passa por aqui; para esse caso o dado
 * estruturado (`fetos[].bcf_alteracao`) é a fonte, não a regex.
 */
export function checkFetalVitality(
  rawInput: string,
  finalText: string,
): DeterministicIssue[] {
  const negativeInput = firstMatch(rawInput, NEGATIVE_VITALITY_PATTERNS);
  if (!negativeInput) return [];

  const corpo = corpoSemConclusao(finalText);
  const blocos = blocosPorFeto(corpo);

  // ---- Feto único: qualquer BCF positivo contradiz a negativa do ditado.
  if (!blocos) {
    const positivo = firstMatch(finalText, POSITIVE_BCF_PATTERNS);
    if (!positivo) return [];
    return [
      issue(
        `Input declara ausência de vitalidade/BCF, mas o laudo afirma BCF positivo: "${positivo}".`,
        positivo,
      ),
    ];
  }

  // ---- Gemelar: a leitura é por bloco.
  const contraditorio = blocos.find(
    (b) => firstMatch(b.texto, NEGATIVE_VITALITY_PATTERNS) && firstMatch(b.texto, POSITIVE_BCF_PATTERNS),
  );
  if (contraditorio) {
    const positivo = firstMatch(contraditorio.texto, POSITIVE_BCF_PATTERNS)!;
    return [
      issue(
        `O bloco do feto ${contraditorio.rotulo} afirma ausência de batimentos E BCF positivo: "${positivo}".`,
        positivo,
      ),
    ];
  }

  // A negativa do médico sobreviveu em algum feto? Se sim, os BCF positivos dos
  // OUTROS fetos são o comportamento correto e não são divergência.
  const honrada = blocos.some((b) => firstMatch(b.texto, NEGATIVE_VITALITY_PATTERNS));
  if (honrada) return [];

  const positivo = firstMatch(finalText, POSITIVE_BCF_PATTERNS);
  if (!positivo) return [];
  return [
    issue(
      `Input declara ausência de vitalidade, mas nenhum dos ${blocos.length} fetos do laudo a registra — ` +
        `todos saíram com BCF positivo ("${positivo}").`,
      positivo,
    ),
  ];
}
