import type OpenAI from "openai";
import { editPlanSchema, type EditPlan, type ReportSpec } from "./types";
import { UNIVERSAL_CORE_V2 } from "../../prompts/universalCoreV2";

/**
 * CHAMADA SEMÂNTICA (Fase 3) — o LLM lê o ditado + o spec e emite um EDITPLAN
 * (structured output), NÃO o laudo. O código (assemble) monta o texto. Isto
 * separa entendimento (LLM) de montagem (determinística) — review Dex2.
 */

function serializeSpec(spec: ReportSpec): string {
  const slots = spec.base
    .map((s) => `- ${s.id}: ${s.frase_normal.replace(/\n/g, " ").slice(0, 90)}`)
    .join("\n");
  const dict = spec.dictionary
    .map((d) => `- [${d.slot_alvo}] ${d.gatilho}\n    corpo: ${d.corpo}\n    conclusão: ${d.conclusao || "(sem item de conclusão)"}`)
    .join("\n");
  return `SLOTS DO LAUDO-BASE (id → frase de normalidade):\n${slots}\n\nDICIONÁRIO DE ACHADOS (gatilho → corpo morfológico + conclusão cadastrada):\n${dict}`;
}

const PLAN_INSTRUCTIONS = `Sua saída NÃO é o laudo — é um PLANO DE EDIÇÃO (JSON) sobre o laudo-base.
- "slots": para cada ESTRUTURA com achado ditado, um item { slotId, corpo }. O "corpo" é a descrição MORFOLÓGICA do achado (ecogenicidade → margens → medindo → localização → extras), SEM o substantivo diagnóstico (cálculo/cisto/esteatose/litíase). Estrutura NÃO citada pelo médico: NÃO gere item (mantém-se normal). Use os slotIds EXATOS da lista.
- "conclusao": lista de DIAGNÓSTICOS nomeados (um por achado que tenha diagnóstico), na ordem dos achados, usando a TERMINOLOGIA do dicionário. NÃO inclua o item de fechamento "Demais órgãos..." (o código adiciona). Exame normal → "conclusao": [].
- Quando um achado casar com um GATILHO do dicionário, use o "corpo" e a "conclusão" cadastrados, preenchendo as medidas/lado/segmento realmente ditados. Achado sem entrada no dicionário: redija o corpo morfologicamente; se não souber nomear o diagnóstico, conclua de forma descritiva.
- FIDELIDADE: preserve medidas+unidade, lado, negação, multiplicidade EXATAMENTE. Não invente grau/severidade/diagnóstico/conduta não ditados.`;

const EDIT_PLAN_JSON_SCHEMA = {
  name: "edit_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      slots: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slotId: { type: "string" },
            corpo: { type: "string" },
          },
          required: ["slotId", "corpo"],
        },
      },
      conclusao: { type: "array", items: { type: "string" } },
    },
    required: ["slots", "conclusao"],
  },
} as const;

async function callPlan(openai: OpenAI, model: string, system: string, user: string): Promise<EditPlan> {
  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: EDIT_PLAN_JSON_SCHEMA },
    max_completion_tokens: 1500,
    reasoning_effort: "none",
  } as never);
  const raw = (res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}";
  return editPlanSchema.parse(JSON.parse(raw));
}

export async function generatePlanV2(args: {
  openai: OpenAI;
  model: string;
  ditadoCru: string;
  spec: ReportSpec;
}): Promise<EditPlan> {
  const system = `${UNIVERSAL_CORE_V2}\n\n=== TAREFA (PLANO DE EDIÇÃO) ===\n${PLAN_INSTRUCTIONS}\n\n=== SPEC DA CATEGORIA ===\n${serializeSpec(args.spec)}`;
  return callPlan(args.openai, args.model, system, `=== DITADO DO MÉDICO ===\n${args.ditadoCru.trim()}`);
}

/**
 * REPARO CONDICIONAL (Fase 4) — 1 chamada dirigida quando a auditoria acha
 * divergência. Reintroduz SÓ o que foi ditado e sumiu; não inventa.
 */
export async function repairPlanV2(args: {
  openai: OpenAI;
  model: string;
  ditadoCru: string;
  spec: ReportSpec;
  laudoAtual: string;
  divergencias: string[];
}): Promise<EditPlan> {
  const system = `${UNIVERSAL_CORE_V2}\n\n=== TAREFA (REPARO DO PLANO) ===\n${PLAN_INSTRUCTIONS}\n\nO plano anterior gerou um laudo com DIVERGÊNCIAS de fidelidade abaixo. Gere um PLANO CORRIGIDO (mesmo formato) que reponha EXATAMENTE o que o médico ditou e sumiu — sem inventar nada novo.\nDIVERGÊNCIAS:\n${args.divergencias.map((d) => `- ${d}`).join("\n")}\n\n=== SPEC DA CATEGORIA ===\n${serializeSpec(args.spec)}`;
  const user = `=== DITADO DO MÉDICO ===\n${args.ditadoCru.trim()}\n\n=== LAUDO ATUAL (com as divergências) ===\n${args.laudoAtual}`;
  return callPlan(args.openai, args.model, system, user);
}
