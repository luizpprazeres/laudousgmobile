/** Scope is an explicit request option, never inferred from the transcript. */
export const OBSTETRICA_PLAIN_WRITER_POLICY = `ESCOPO EXPLÍCITO: OBSTÉTRICA SIMPLES.
Preserve o modelo original e todos os achados, medidas, variações e negações informados. Não acrescente exame de dopplervelocimetria nem normalidade vascular. A frase original dos batimentos por modo M e modo Doppler pode permanecer.`;

function hasDopplerConflict(text: string): boolean {
  // Detection-only clauses; never rewrite clinical input or output. Decimal dots survive.
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const clauses = normalized.split(/[;\n]+|[.!?](?!\d)|,?\s*\b(?:hoje|agora|atualmente|neste exame)\b/);
  return clauses.some(clause => {
    if (/\b(?:exame|laudo|doppler|avaliacao)\s+(?:anterior|previo|antigo)|\bhistoric[oa]\b|\bantecedente\b/.test(clause)) return false;
    const vessel = /\b(?:uterinas?|umbilical|cerebral media|acm|ducto venoso)\b/.test(clause);
    // An index is a numeric measurement with a restricted vocabulary, not the verb "ir".
    const index = /\b(?:ip|ir)\s*(?:(?:d[aeo]|da|do|arteria|uterina|direita|esquerda|umbilical|cerebral|media|acm|ducto|venoso|de)\s+|[:=(]\s*){0,9}\d/.test(clause)
      || /\bindice de (?:pulsatilidade|resistividade)\b[^;\n]{0,50}\d/.test(clause);
    if (vessel && index) return true;
    if (/\brcp\s*(?:de\s+|[:=]\s*)?\d/.test(clause)) return true;
    if (vessel && /\b(?:diastole|fluxo diastolico)\s+(?:ausente|revers[oa])\b/.test(clause)) return true;
    const negated = /\b(?:sem\s+|nao\s+(?:(?:foi|sera|e necessario)\s+)?(?:realizar|realizado|incluir|acrescentar|fazer|solicitar)?\s*)(?:o\s+|estudo\s+|exame\s+|de\s+)*doppler|\bdoppler(?:\s+(?:d[aeo]s?|arterias?|uterinas?|umbilical|cerebral|media|acm|ducto|venoso)){0,6}\s+nao\s+(?:realizado|solicitado|necessario)/.test(clause);
    if (negated) return false;
    if (/\bdoppler\s+(?:d[aeo]s?\s+)?(?:arterias?\s+)?(?:uterinas?|umbilical|cerebral media|acm|ducto venoso)\b/.test(clause)) return true;
    if (vessel && /\bdoppler\b[^;\n]*\balterado\b/.test(clause)) return true;
    if (/\b(?:bcf|batimentos cardiacos|frequencia cardiaca)\b/.test(clause) && /\bmodo doppler\b/.test(clause)) {
      clause = clause.replace(/\bmodo doppler\b/g, "modo cardiaco");
    }
    return /\bdopplervelocimetria\b|\b(?:exame|estudo|avaliacao|acrescente|acrescentar|inclua|incluir|realize|realizar|faca|fazer|com)\s+(?:o\s+|de\s+)?doppler\b|\bperfil hemodinamico\s+(?:alterado|normal|de\s*\d)/.test(clause);
  });
}

export function obstetricaPlainConflictWarning(category: string | undefined, rawInput: string) {
  if (category !== "OBSTETRICA" || !hasDopplerConflict(rawInput)) return undefined;
  return {
    code: "OBSTETRICA_PLAIN_DOPPLER_CONFLICT",
    message: "O ditado contém pedido ou dados de Doppler, mas o exame escolhido é obstétrico simples. Escolha Obstétrica com Doppler ou revise o ditado e tente novamente. Nenhum laudo foi entregue.",
  };
}

/** Returned violation must block delivery; never remove individual report lines. */
export function obstetricaPlainOutputWarning(category: string | undefined, output: string) {
  if (category !== "OBSTETRICA" || !hasDopplerConflict(output)) return undefined;
  return {
    code: "OBSTETRICA_PLAIN_DOPPLER_OUTPUT",
    message: "A geração incluiu Doppler apesar da escolha de obstétrico simples e foi interrompida. Nenhum laudo foi entregue. Revise o ditado ou escolha Obstétrica com Doppler e tente novamente.",
  };
}
