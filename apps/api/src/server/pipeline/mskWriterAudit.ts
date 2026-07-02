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
  "labrum",
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
};

/** Extrai os NÚMEROS de medidas (com unidade) de um texto. */
function extractMeasureNumbers(text: string): string[] {
  const re =
    /(\d+(?:[.,]\d+)?)\s*(?:cm³|mm²|cm|mm|cent[íi]metros?(?:\s+c[úu]bicos?)?|mil[íi]metros?(?:\s+quadrados?)?)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]!);
  return out;
}

/** Número presente no laudo em qualquer grafia decimal (2.4 / 2,4). */
function numberInLaudo(num: string, laudo: string): boolean {
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

  return {
    ok: missingMeasures.length === 0 && missingSides.length === 0 && extraStructures.length === 0,
    missingMeasures,
    missingSides,
    extraStructures,
  };
}

/** Nota "[REVISAR: …]" para anexar ao fim do laudo quando o audit falha (opção 2). */
export function auditRevisarNote(a: MskAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s) no texto: ${a.missingMeasures.join(", ")}`);
  if (a.missingSides.length) partes.push(`lateralidade ditada: ${a.missingSides.join(", ")}`);
  if (a.extraStructures.length) partes.push(`estrutura(s) fora do protocolo: ${a.extraStructures.join(", ")}`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
