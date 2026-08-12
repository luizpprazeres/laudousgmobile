/**
 * Quando um laudo que falhou pode virar `discarded`.
 *
 * Esta regra vive num módulo próprio por um motivo específico: ela precisa ser
 * a MESMA no pipeline e no teste. Quando o teste espelhava a decisão em vez de
 * importá-la, ele travava a regra no papel mas não detectaria uma divergência
 * do código real — foi a observação do @devops na revisão do deploy de 12/08,
 * e ela estava certa.
 *
 * Duas travas, e cada uma corrige um dano observado:
 *
 *  1. CANCELAR NÃO É DESCARTAR. Quando o médico fecha o app, o erro que sobe
 *     nem sempre se chama "AbortError" — pode vir como DOMException, como
 *     `TypeError: terminated` do undici, ou como stream fechado. Classificar
 *     pelo nome deixava esses casos virarem descarte, matando a retomada
 *     (`loadReportForResume`). O fato é o SIGNAL; o nome é sintoma.
 *
 *  2. LAUDO ENTREGUE NÃO É REBAIXADO. Depois do `done`, o pipeline ainda roda
 *     o esquema venoso e o sanity de IA. Uma falha ali não invalida um texto
 *     que o médico já tem na tela.
 */

export type DecisaoDeFalha = {
  outcome: "aborted" | "error";
  /** Marcar o report como `discarded`? */
  marcaDescartado: boolean;
};

export function decidirDescarte(args: {
  erro: unknown;
  /** `signal.aborted` do request — o fato, não o nome do erro. */
  signalAbortado: boolean;
  /** O report já foi finalizado como `generated`? */
  laudoEntregue: boolean;
}): DecisaoDeFalha {
  const nome = args.erro instanceof Error ? args.erro.name : "";
  if (args.signalAbortado || nome === "AbortError") {
    return { outcome: "aborted", marcaDescartado: false };
  }
  return { outcome: "error", marcaDescartado: !args.laudoEntregue };
}
