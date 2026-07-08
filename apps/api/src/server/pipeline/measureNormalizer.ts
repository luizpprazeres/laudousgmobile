/**
 * Normalizador determinístico de medidas no texto do laudo (pós-processo
 * universal, idempotente). Conservador de propósito: mexe só em unidade por
 * extenso e na junção de dimensões — NÃO força separador decimal (a casa usa
 * vírgula e ponto conforme o contexto; forçar teria alto risco de regressão).
 *
 * - "1,5 centímetros" → "1,5 cm"
 * - "0.3 por 0.3 por 0.6" → "0.3 x 0.3 x 0.6"
 * - "2,0x3,0" → "2,0 x 3,0" (espaça o joiner)
 *
 * A junção "A por B" só ocorre quando AMBOS os lados são números, para não
 * tocar em prosa ("obtida por via", "no terço médio por ...").
 */
const NUM = "\\d+(?:[.,]\\d+)?";

export function normalizeMeasures(text: string): string {
  let out = text;
  // unidade por extenso → abreviada (preserva o número e seu separador)
  out = out.replace(new RegExp(`(${NUM})\\s*cent[íi]metros?\\b`, "gi"), "$1 cm");
  out = out.replace(new RegExp(`(${NUM})\\s*mil[íi]metros?\\b`, "gi"), "$1 mm");
  // "A por B" → "A x B" (duas passadas p/ pegar a 3ª dimensão, sem sobreposição)
  const porRe = new RegExp(`(${NUM})\\s+por\\s+(${NUM})`, "gi");
  out = out.replace(porRe, "$1 x $2");
  out = out.replace(porRe, "$1 x $2");
  // normaliza espaçamento do joiner ("x" ou "×") entre números
  out = out.replace(new RegExp(`(${NUM})\\s*[x×]\\s*(${NUM})`, "gi"), "$1 x $2");
  return out;
}
