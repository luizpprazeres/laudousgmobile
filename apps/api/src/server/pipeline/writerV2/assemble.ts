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

/**
 * Monta a CONCLUSÃO conforme o modo do contrato.
 * - "fechamento" (abdome): vazio = frase de normalidade única (sem número);
 *   com achado = diagnósticos numerados + fechamento "Demais órgãos...".
 * - "por_estrutura" (pelve/obstétrica): um item por estrutura com
 *   `frase_conclusao` (ordem do base); o achado do slot substitui o item normal;
 *   slots omitidos não geram item; itens avulsos (IG, correlação) vão ao fim.
 *   A completude é do CÓDIGO — não depende do LLM listar todos os itens.
 */
function buildConclusao(
  spec: ReportSpec,
  plan: EditPlan,
  omit: Set<string>,
): string {
  const sep = numSep(spec.contract.numeracao_conclusao);

  if (spec.contract.conclusao_modo === "por_estrutura") {
    // Ordem da conclusão: `conclusao_ordem` (se definida) tem prioridade; slots
    // com frase_conclusao fora dela entram depois, na ordem do base.
    const ordem = spec.contract.conclusao_ordem ?? [];
    const conclSlots = spec.base.filter((s) => s.frase_conclusao);
    const ordered = [
      ...ordem
        .map((id) => conclSlots.find((s) => s.id === id))
        .filter((s): s is (typeof conclSlots)[number] => Boolean(s)),
      ...conclSlots.filter((s) => !ordem.includes(s.id)),
    ];
    const itens: string[] = [];
    for (const s of ordered) {
      if (omit.has(s.id)) continue;
      const op = plan.slots.find((p) => p.slotId === s.id);
      const item =
        op && op.conclusao.trim() ? op.conclusao.trim() : (s.frase_conclusao ?? "").trim();
      if (item) itens.push(item);
    }
    for (const avulso of plan.conclusao) {
      if (avulso.trim()) itens.push(avulso.trim());
    }
    return itens.map((it, i) => `${i + 1}${sep} ${it}`).join("\n");
  }

  // modo "fechamento" (abdome)
  if (plan.conclusao.length === 0) {
    return slotText(spec, plan, "conclusao_normal").trim();
  }
  const fechamento =
    spec.base.find((s) => s.id === "conclusao_fechamento")?.frase_normal.trim() ?? "";
  const itens = fechamento ? [...plan.conclusao, fechamento] : [...plan.conclusao];
  return itens.map((it, i) => `${i + 1}${sep} ${it.trim()}`).join("\n");
}

export function assemble(spec: ReportSpec, plan: EditPlan): string {
  const titulo = slotText(spec, plan, "titulo").trim();
  const comentarios = slotText(spec, plan, "comentarios").trim();

  // Órgãos do corpo, na ordem do base; cada um: achado (plan) OU frase_normal.
  // Slots em omitSlots são REMOVIDOS (médico pediu "não descreva X").
  const omit = new Set(plan.omitSlots ?? []);
  const corpo = spec.base
    .filter((s) => !SPECIAL_SLOTS.has(s.id) && !omit.has(s.id))
    .map((s) => slotText(spec, plan, s.id).trim())
    .filter(Boolean)
    .join("\n");

  const conclusao = buildConclusao(spec, plan, omit);

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
