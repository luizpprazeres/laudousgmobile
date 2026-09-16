/**
 * Fact-audit determinístico do MSK writer_guarded (slice 2, arquitetura 2 modos).
 *
 * O writer entende linguagem natural, mas é probabilístico — pode (raro) dropar uma
 * medida/lado ou inventar estrutura fora do protocolo. Este audit compara o DITADO com
 * o LAUDO e sinaliza FATOS objetivos que faltam/sobram. NÃO julga prosa.
 *
 * Decisão de UX (Luiz, opção 2): streama otimista e, se um fato crítico falha, ANEXA
 * "[REVISAR: …]" no fim (não re-roda — mantém o TTFT). Tudo é logado (observabilidade).
 */

/** Estruturas que NÃO fazem parte do protocolo MSK da casa (over-coverage do writer). */
const FORA_DO_ROTEIRO = [
  "menisco",
  "cartilagem",
  "ligamento cruzado",
  "ligamento colateral",
  "lábio glenoidal",
  "sinóvia articular",
];

export type MskAudit = {
  ok: boolean;
  /** Medidas ditadas (número) não encontradas no laudo. */
  missingMeasures: string[];
  /** Lateralidade ditada não encontrada no laudo. */
  missingSides: string[];
  /** Estruturas fora do protocolo mencionadas no laudo (over-coverage). */
  extraStructures: string[];
  /** Combinações segmento+lado ditadas sem bloco próprio no laudo. Diferente de
   * missingSides: dois exames direitos não podem se encobrir mutuamente. */
  missingExams: string[];
};

const SEGMENTOS = [
  { id: "ombro", re: /(?<![\p{L}\p{N}_])ombros?(?![\p{L}\p{N}_])/giu },
  { id: "joelho", re: /(?<![\p{L}\p{N}_])joelhos?(?![\p{L}\p{N}_])/giu },
  // `\b` do JavaScript é ASCII e não reconhece corretamente a borda depois
  // de "pé"/"mão"; os limites Unicode evitam perder esses exames.
  { id: "pe", re: /(?<![\p{L}\p{N}_])p[ée]s?(?![\p{L}\p{N}_])/giu },
  { id: "mao", re: /(?<![\p{L}\p{N}_])m[aã]os?(?![\p{L}\p{N}_])/giu },
  { id: "punho", re: /(?<![\p{L}\p{N}_])punhos?(?![\p{L}\p{N}_])/giu },
  { id: "cotovelo", re: /(?<![\p{L}\p{N}_])cotovelos?(?![\p{L}\p{N}_])/giu },
  { id: "tornozelo", re: /(?<![\p{L}\p{N}_])tornozelos?(?![\p{L}\p{N}_])/giu },
  { id: "quadril", re: /(?<![\p{L}\p{N}_])quadr(?:il|is)(?![\p{L}\p{N}_])/giu },
] as const;

type MskExamKey = `${(typeof SEGMENTOS)[number]["id"]}:${"direito" | "esquerdo"}`;

function sidesIn(text: string): Array<"direito" | "esquerdo"> {
  if (/\b(?:bilateral|bilaterais|ambos?\s+os?|ambas?\s+as?)\b/iu.test(text)) {
    return ["direito", "esquerdo"];
  }
  const sides: Array<"direito" | "esquerdo"> = [];
  if (/\bdireit[oa]s?\b/iu.test(text)) sides.push("direito");
  if (/\besquerd[oa]s?\b/iu.test(text)) sides.push("esquerdo");
  return sides;
}

/**
 * Extrai pares segmento+lado explicitamente ditados. A janela termina antes da
 * próxima menção de segmento para não atribuir o lado do joelho ao ombro anterior.
 * Conservador: sem lateralidade explícita, não cria uma exigência artificial.
 */
export function extractExpectedMskExams(rawInput: string): MskExamKey[] {
  const mentions: Array<{ segment: (typeof SEGMENTOS)[number]["id"]; start: number; end: number }> = [];
  for (const segment of SEGMENTOS) {
    segment.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = segment.re.exec(rawInput)) !== null) {
      mentions.push({ segment: segment.id, start: match.index, end: match.index + match[0].length });
    }
  }
  mentions.sort((a, b) => a.start - b.start);

  const expected = new Set<MskExamKey>();
  for (let index = 0; index < mentions.length; index += 1) {
    const mention = mentions[index]!;
    const nextStart = index + 1 < mentions.length ? mentions[index + 1]!.start : Math.min(rawInput.length, mention.end + 80);
    // Começa na própria articulação: usar texto anterior faria o "direito" de
    // "ombro direito, joelho esquerdo" contaminar o joelho.
    const local = rawInput.slice(mention.start, nextStart);
    for (const side of sidesIn(local)) expected.add(`${mention.segment}:${side}`);
  }
  return [...expected];
}

/** Extrai somente os títulos de bloco do laudo, evitando que uma lateralidade
 * citada no corpo de outra articulação conte como cobertura. */
export function extractRenderedMskExams(laudo: string): MskExamKey[] {
  const rendered = new Set<MskExamKey>();
  const re = /ULTRASSONOGRAFIA\s+(?:DO|DA)\s+(OMBRO|JOELHO|P[ÉE]|M[AÃ]O|PUNHO|COTOVELO|TORNOZELO|QUADRIL)\s+(DIREIT[OA]|ESQUERD[OA])/giu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(laudo)) !== null) {
    const rawSegment = (match[1] ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const segment = rawSegment === "pe" ? "pe" : rawSegment === "mao" ? "mao" : rawSegment;
    const side = /^direit/iu.test(match[2] ?? "") ? "direito" : "esquerdo";
    rendered.add(`${segment}:${side}` as MskExamKey);
  }
  return [...rendered];
}

/** Extrai os NÚMEROS de medidas (com unidade) de um texto. (Exportado: reusado
 *  pelo partesMolesWriterAudit — mesma auditoria de fato, outra categoria.) */
export function extractMeasureNumbers(text: string): string[] {
  const re =
    /(\d+(?:[.,]\d+)?)\s*(?:cm³|mm²|cm|mm|cent[íi]metros?(?:\s+c[úu]bicos?)?|mil[íi]metros?(?:\s+quadrados?)?)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]!);
  return out;
}

/** Número presente no laudo em qualquer grafia decimal (2.4 / 2,4). (Exportado:
 *  reusado pelo partesMolesWriterAudit.) */
export function numberInLaudo(num: string, laudo: string): boolean {
  return laudo.includes(num.replace(",", ".")) || laudo.includes(num.replace(".", ","));
}

/**
 * Audita o laudo MSK contra o ditado. Determinístico, conservador (só fatos objetivos).
 */
export function auditMskFacts(rawInput: string, laudo: string): MskAudit {
  const laudoLc = laudo.toLowerCase();

  // Medidas ditadas ausentes no laudo.
  const ditadas = extractMeasureNumbers(rawInput);
  const missingMeasures = [...new Set(ditadas)].filter(
    (n) => !numberInLaudo(n, laudo),
  );

  // Lateralidade ditada ausente (grosso — pega drop total de um lado).
  const rawLc = rawInput.toLowerCase();
  const missingSides: string[] = [];
  if (/\bdireit[oa]s?\b/.test(rawLc) && !/direit[oa]/.test(laudoLc)) missingSides.push("direito");
  if (/\besquerd[oa]s?\b/.test(rawLc) && !/esquerd[oa]/.test(laudoLc)) missingSides.push("esquerdo");

  // Estruturas fora do protocolo (over-coverage).
  const extraStructures = FORA_DO_ROTEIRO.filter((s) => laudoLc.includes(s));

  const renderedExams = new Set(extractRenderedMskExams(laudo));
  const missingExams = extractExpectedMskExams(rawInput).filter(
    (exam) => !renderedExams.has(exam),
  );

  return {
    ok:
      missingMeasures.length === 0 &&
      missingSides.length === 0 &&
      extraStructures.length === 0 &&
      missingExams.length === 0,
    missingMeasures,
    missingSides,
    extraStructures,
    missingExams,
  };
}

/** Nota "[REVISAR: …]" para anexar ao fim do laudo quando o audit falha (opção 2). */
export function auditRevisarNote(a: MskAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s) no texto: ${a.missingMeasures.join(", ")}`);
  if (a.missingSides.length) partes.push(`lateralidade ditada: ${a.missingSides.join(", ")}`);
  if (a.missingExams.length) {
    partes.push(
      `bloco(s) de articulação+lateralidade ausente(s): ${a.missingExams
        .map((exam) => exam.replace(":", " "))
        .join(", ")}`,
    );
  }
  if (a.extraStructures.length) partes.push(`estrutura(s) fora do protocolo: ${a.extraStructures.join(", ")}`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
