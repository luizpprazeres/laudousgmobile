/**
 * Guard determinístico — REMOVE NARRAÇÃO DE OBSERVAÇÃO em 1ª pessoa que o LLM
 * tenha transcrito LITERALMENTE no laudo ("estou vendo...", "consigo ver...")
 * em vez de interpretar a referência espacial.
 *
 * Pegada: a instrução de "não transcreva, interprete" no prompt (camada 1) não
 * vence 100% → strip determinístico como rede de segurança (camada 3). Nenhum
 * laudo de verdade usa 1ª pessoa "estou vendo" — então remover é seguro. O
 * CONTEÚDO da frase (a referência anatômica) é preservado; só o enquadramento
 * narrativo sai, e a frase é recapitalizada.
 */

// Prefixos de narração em 1ª pessoa (+ "que" opcional). Conservador: só formas
// inequivocamente de observação ao vivo, que jamais apareceriam num laudo.
const NARRATION = new RegExp(
  String.raw`\b(?:estou\s+(?:vendo|visualizando|observando|a\s+ver)|consigo\s+(?:ver|visualizar)|t[ôo]\s+vendo|eu\s+vejo|vejo)\b\s*(?:(?:que|aqui|na\s+imagem|na\s+tela)\s+)*[\s,:-]*`,
  "gi",
);

export function stripObservationNarration(laudo: string): string {
  let out = laudo.replace(NARRATION, "");
  // Recapitaliza a 1ª letra de cada frase (após início, ponto, ponto-e-vírgula
  // ou quebra) caso o strip tenha deixado a frase começando em minúscula.
  out = out.replace(
    /(^|[.;\n]\s*)([a-zà-ÿ])/g,
    (_m, prefix: string, ch: string) => prefix + ch.toUpperCase(),
  );
  return out;
}
