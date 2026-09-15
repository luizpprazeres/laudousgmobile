/** Scope is an explicit request option, never inferred from the transcript. */
export const OBSTETRICA_PLAIN_WRITER_POLICY = `ESCOPO EXPLÍCITO: OBSTÉTRICA SIMPLES.
Preserve o modelo original e TODOS os achados ditados, sem exceção:
- cada medida com o seu número e unidade (ex.: "pelve renal esquerda dilatada, medindo 8 mm" mantém os 8 mm no corpo; nunca reduza uma medida ao diagnóstico);
- o peso fetal estimado E a sua variação, sempre juntos (ex.: "2300 g, com variação de 320 g");
- cada negação ditada, como frase própria no corpo (ex.: "Sem dilatação das pelves renais." ou "Pelve renal direita sem dilatação.").
- o líquido amniótico com a técnica ditada: "maior bolsão vertical (MBV) de 5 cm" NÃO vira "ILA de 5 cm" (o índice de líquido amniótico é outra medida); se o modelo trouxer frase de ILA e o ditado só tiver MBV, substitua pela frase do MBV.
Achado ditado que não existe no modelo (ex.: pelve renal dilatada, medindo 8 mm; sem dilatação das pelves renais) entra no CORPO do laudo, na seção de anatomia fetal, com a medida ou a negação como ditada — e, se for patológico, também na conclusão. Constar só na conclusão não basta.
Não acrescente exame de dopplervelocimetria nem afirmações de normalidade vascular. Se o ditado trouxer dados vasculares (IP, IR, RCP, diástole ausente ou reversa, artérias uterinas, umbilical, cerebral média, ducto venoso), NÃO os transcreva em nenhuma seção nem na impressão: pertencem ao exame com Doppler, que não foi escolhido. A frase original dos batimentos por modo M e modo Doppler pode permanecer.
Antes de encerrar, confira item a item que cada número e cada negação do ditado está no laudo.`;

function normalizeClause(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const CLAUSE_SPLIT = /[;\n]+|[.!?](?!\d)|,?\s*\b(?:hoje|agora|atualmente|neste exame)\b/;

/** Recebe uma cláusula já normalizada (sem acentos, minúscula). */
function isDopplerClause(input: string): boolean {
  let clause = input;
  if (/\b(?:exame|laudo|doppler|avaliacao)\s+(?:anterior|previo|antigo)|\bhistoric[oa]\b|\bantecedente\b/.test(clause)) return false;
  const vessel = /\b(?:uterinas?|umbilical|cerebral media|acm|ducto venoso)\b/.test(clause);
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
}

function hasDopplerConflict(text: string): boolean {
  return normalizeClause(text).split(CLAUSE_SPLIT).some(clause => isDopplerClause(clause));
}

/**
 * Remove do ditado as cláusulas com dados ou pedido de Doppler, preservando o
 * restante intacto (pontuação e ordem). Usado SÓ quando o médico escolheu
 * obstétrica simples: o writer não deve nem ver os dados vasculares, em vez de
 * depender da instrução para omiti-los. Em produção a rota já recusa o ditado
 * antes disto (obstetricaPlainConflictWarning); aqui é a segunda barreira.
 */
export function stripDopplerClauses(text: string): string {
  const parts = text.split(/([;\n]+|[.!?](?!\d))/);
  let out = "";
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i] ?? "";
    const delimiter = parts[i + 1] ?? "";
    if (clause.trim() && isDopplerClause(normalizeClause(clause))) continue;
    out += clause + delimiter;
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.;!?])/g, "$1").trim();
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
