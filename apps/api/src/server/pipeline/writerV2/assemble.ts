import type { EditPlan, ReportSpec } from "./types";

/**
 * MONTAGEM DETERMINÍSTICA (código, ~0ms) — aplica o EditPlan sobre o laudo-base.
 * Garante por construção: slots não editados saem VERBATIM do base; a estrutura
 * (título/COMENTÁRIOS/ACHADOS/CONCLUSÃO), a numeração e o fechamento são do
 * contrato — não da livre escrita do modelo. Isto é o que dá a fidelidade do
 * renderer ao writer reflexivo.
 */

/** Slots que NÃO são órgãos do corpo (têm papel estrutural). */
const SPECIAL_SLOTS = new Set([
  "titulo",
  "comentarios",
  "conclusao_normal",
  "conclusao_fechamento",
]);

function slotText(spec: ReportSpec, plan: EditPlan, slotId: string): string {
  const op = plan.slots.find((s) => s.slotId === slotId);
  if (op) return op.corpo;
  return spec.base.find((s) => s.id === slotId)?.frase_normal ?? "";
}

/** Separador de numeração a partir do contrato: "1." → ".", "1)" → ")". */
function numSep(numeracao: string): string {
  return numeracao.replace(/^\d+/, "") || ")";
}

export function assemble(spec: ReportSpec, plan: EditPlan): string {
  const titulo = slotText(spec, plan, "titulo").trim();
  const comentarios = slotText(spec, plan, "comentarios").trim();

  // Órgãos do corpo, na ordem do base; cada um: achado (plan) OU frase_normal.
  const corpo = spec.base
    .filter((s) => !SPECIAL_SLOTS.has(s.id))
    .map((s) => slotText(spec, plan, s.id).trim())
    .filter(Boolean)
    .join("\n");

  // Conclusão: vazia = normal (item único, sem número). Com achados = numerada +
  // último item de fechamento ("Demais órgãos...").
  let conclusao: string;
  if (plan.conclusao.length === 0) {
    conclusao = slotText(spec, plan, "conclusao_normal").trim();
  } else {
    const fechamento =
      spec.base.find((s) => s.id === "conclusao_fechamento")?.frase_normal.trim() ?? "";
    const itens = fechamento ? [...plan.conclusao, fechamento] : [...plan.conclusao];
    const sep = numSep(spec.contract.numeracao_conclusao);
    conclusao = itens.map((it, i) => `${i + 1}${sep} ${it.trim()}`).join("\n");
  }

  return [
    titulo,
    "",
    "COMENTÁRIOS:",
    comentarios,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    corpo,
    "",
    "CONCLUSÃO:",
    conclusao,
  ].join("\n");
}
