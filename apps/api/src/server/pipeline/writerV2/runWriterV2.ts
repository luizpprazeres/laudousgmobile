import type OpenAI from "openai";
import type { Divergencia, EditPlan, ReportSpec } from "./types";
import { generatePlanV2, repairPlanV2 } from "./generatePlan";
import { assemble } from "./assemble";
import { auditFidelity } from "./audit";

/**
 * Orquestrador do Writer V2 (INERTE / flag OFF): ditado → plano(LLM) →
 * montagem(código) → auditoria(código) → [reparo condicional ≤1] → laudo.
 * Caso comum = 1 chamada LLM; só há a 2ª chamada quando a auditoria acusa.
 */
export async function runWriterV2(args: {
  openai: OpenAI;
  model: string;
  ditadoCru: string;
  spec: ReportSpec;
}): Promise<{
  laudo: string;
  plan: EditPlan;
  divergencias: Divergencia[];
  reparou: boolean;
}> {
  const { openai, model, ditadoCru, spec } = args;

  let plan = await generatePlanV2({ openai, model, ditadoCru, spec });
  let laudo = assemble(spec, plan);
  let divergencias = auditFidelity({ ditadoCru, laudo, spec, plan });
  let reparou = false;

  if (divergencias.length > 0) {
    reparou = true;
    plan = await repairPlanV2({
      openai,
      model,
      ditadoCru,
      spec,
      laudoAtual: laudo,
      divergencias: divergencias.map((d) => d.detalhe),
    });
    laudo = assemble(spec, plan);
    divergencias = auditFidelity({ ditadoCru, laudo, spec, plan });
  }

  return { laudo, plan, divergencias, reparou };
}
