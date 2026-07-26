import type { Divergencia, EditPlan, ReportSpec } from "./types";

/**
 * AUDITORIA DE FIDELIDADE (código determinístico, ~0ms) — confere INVARIANTES
 * universais entre o ditado cru e o laudo montado. NUNCA regras de estilo
 * (isso é garantido por reproduzir o base). É a rede de segurança que dispara
 * o reparo condicional.
 *
 * v1 cobre: medidas numéricas omitidas + placeholders obrigatórios ausentes +
 * slotId inexistente no plano. TODO (ampliar antes do wire): lateralidade,
 * negação, multiplicidade — ver review Dex2.
 */

/** Números que aparecem em contexto de MEDIDA (unidade ou dimensão A x B). */
export function measureNumbers(text: string): string[] {
  const nums = new Set<string>();
  const norm = (s: string) => s.replace(".", ",");
  const reUnidade = /(\d+(?:[.,]\d+)?)\s*(?:cm³|cm|mm|ml|centímetros?|milímetros?)/gi;
  const reDim = /(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = reUnidade.exec(text)) !== null) nums.add(norm(m[1]));
  while ((m = reDim.exec(text)) !== null) {
    nums.add(norm(m[1]));
    nums.add(norm(m[2]));
  }
  return [...nums];
}

export function auditFidelity(args: {
  ditadoCru: string;
  laudo: string;
  spec: ReportSpec;
  plan: EditPlan;
}): Divergencia[] {
  const divergencias: Divergencia[] = [];

  // 1. Toda medida ditada precisa aparecer no laudo (fidelidade atômica).
  const ditadas = measureNumbers(args.ditadoCru);
  const noLaudo = new Set(measureNumbers(args.laudo));
  for (const n of ditadas) {
    if (!noLaudo.has(n)) {
      divergencias.push({
        tipo: "medida_ausente",
        detalhe: `medida "${n}" ditada não aparece no laudo`,
        severidade: "alta",
      });
    }
  }

  // 2. Slot do plano precisa existir no base (evita edição perdida).
  const slotIds = new Set(args.spec.base.map((s) => s.id));
  for (const op of args.plan.slots) {
    if (!slotIds.has(op.slotId)) {
      divergencias.push({
        tipo: "slot_inexistente",
        detalhe: `plano referencia slot inexistente "${op.slotId}"`,
        severidade: "alta",
      });
    }
  }

  // 3. Campo obrigatório sem valor deve trazer placeholder "____" (nunca omitir).
  for (const slot of args.spec.base) {
    if (!slot.obrigatorio) continue;
    const editado = args.plan.slots.find((s) => s.slotId === slot.id);
    const preenchido = editado ? editado.corpo.trim().length > 0 : false;
    if (!preenchido && !args.laudo.includes("____")) {
      divergencias.push({
        tipo: "placeholder_obrigatorio",
        detalhe: `campo obrigatório "${slot.id}" sem valor e sem placeholder "____"`,
        severidade: "media",
      });
    }
  }

  return divergencias;
}
