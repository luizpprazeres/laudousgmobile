import type OpenAI from "openai";
import { editPlanSchema, type EditPlan, type ReportSpec } from "./types";
import { assemble } from "./assemble";
import { UNIVERSAL_CORE_V2 } from "../../prompts/universalCoreV2";

// Plano vazio (nenhum achado) → o assemble devolve o LAUDO-BASE normal completo,
// usado para MOSTRAR o modelo inteiro ao planner (não é o laudo de saída).
const EMPTY_PLAN: EditPlan = editPlanSchema.parse({ slots: [], conclusao: [], omitSlots: [] });

/**
 * CHAMADA SEMÂNTICA (Fase 3) — o LLM lê o ditado + o spec e emite um EDITPLAN
 * (structured output), NÃO o laudo. O código (assemble) monta o texto. Isto
 * separa entendimento (LLM) de montagem (determinística) — review Dex2.
 */

function serializeSpec(spec: ReportSpec): string {
  const porEstrutura = spec.contract.conclusao_modo === "por_estrutura";
  // LAUDO-BASE COMPLETO (normal): dá ao LLM o DOCUMENTO inteiro — seções, ordem e
  // frases exatas — em vez de stubs truncados em 90 chars. Assim ele entende o
  // modelo, honra comandos posicionais ("após a frase de X") e não inventa frases.
  const baseLaudo = assemble(spec, EMPTY_PLAN);
  const slots = spec.base
    .map((s) => {
      // Frase COMPLETA (sem truncar) — em uma linha para o mapa de ids.
      const norm = s.frase_normal.replace(/\n/g, " ").trim();
      const base = `- ${s.id}: ${norm || "(vazio no modelo; só aparece quando há achado)"}`;
      // No modo por_estrutura, mostrar o item de conclusão normal do slot para o
      // modelo saber o que substituir quando aquela estrutura tiver achado.
      return porEstrutura && s.frase_conclusao
        ? `${base}\n    conclusão-normal: ${s.frase_conclusao}`
        : base;
    })
    .join("\n");
  const dict = spec.dictionary
    .map((d) => `- [${d.slot_alvo}] ${d.gatilho}\n    corpo: ${d.corpo}\n    conclusão: ${d.conclusao || "(sem item de conclusão)"}`)
    .join("\n");
  const modoNota = porEstrutura
    ? `\n\nMODO DE CONCLUSÃO = POR_ESTRUTURA: o CÓDIGO monta a conclusão listando um item por estrutura (a "conclusão-normal" acima). Para cada slot com achado, informe em "conclusao" o DIAGNÓSTICO daquele slot (o código o usa NO LUGAR da conclusão-normal). Estruturas sem achado saem normais automaticamente — NÃO as repita. "conclusao" (avulso) só para o que não nasce de uma estrutura (ex.: idade gestacional).`
    : `\n\nMODO DE CONCLUSÃO = FECHAMENTO: liste em "conclusao" (avulso) os diagnósticos nomeados; deixe "conclusao" dos slots vazio ("").`;
  const avulsos = spec.avulsos_condicionais.length
    ? `\n\nAVULSOS CONDICIONAIS (quando o gatilho ocorrer no ditado, acrescente o "texto" ao array "conclusao" avulso UMA ÚNICA vez — NÃO repita mesmo que o gatilho valha para mais de uma estrutura, e NÃO o pendure em nenhum slot):\n${spec.avulsos_condicionais
        .map((a) => `- gatilho: ${a.gatilho}\n    texto: ${a.texto}`)
        .join("\n")}`
    : "";
  return `LAUDO-BASE COMPLETO — o MODELO PADRÃO (versão normal). É a AUTORIDADE do estilo: preserve-o ao MÁXIMO e edite só o mínimo necessário. As seções (COMENTÁRIOS; OS SEGUINTES ASPECTOS FORAM OBSERVADOS; CONCLUSÃO), a ordem das estruturas e as frases fixas são as deste modelo. Para um comando posicional ("após a frase de X", "depois de Y"), localize a frase EXATA aqui dentro e insira ali — NUNCA reescreva a seção inteira nem invente frases (ex.: novas linhas de anatomia) que não existam neste modelo.\n\n${baseLaudo}\n\nMAPA DE SLOTS (id → a frase que ele ocupa no modelo acima; use estes ids EXATOS no plano):\n${slots}\n\nDICIONÁRIO DE ACHADOS (gatilho → corpo morfológico + conclusão cadastrada):\n${dict}${modoNota}${avulsos}`;
}

const PLAN_INSTRUCTIONS = `Sua saída NÃO é o laudo — é um PLANO DE EDIÇÃO (JSON) sobre o laudo-base.
- "slots": para cada ESTRUTURA com achado ditado, um item { slotId, corpo, conclusao }. O "corpo" é a descrição MORFOLÓGICA do achado (ecogenicidade → margens → medindo → localização → extras), SEM o substantivo diagnóstico (cálculo/cisto/esteatose/litíase). O "conclusao" é o DIAGNÓSTICO nomeado daquela estrutura (use "" quando o achado for só descritivo e não mudar a conclusão da estrutura). Estrutura NÃO citada pelo médico: NÃO gere item (mantém-se normal, corpo E conclusão). Use os slotIds EXATOS da lista.
- "conclusao" (avulso, nível raiz): siga a NOTA "MODO DE CONCLUSÃO" do spec. No modo FECHAMENTO, é a lista de diagnósticos nomeados (ordem dos achados, terminologia do dicionário; NÃO inclua "Demais órgãos...", o código adiciona; exame normal → []). No modo POR_ESTRUTURA, deixe [] a menos que haja um item que não nasça de nenhuma estrutura (ex.: idade gestacional).
- Quando um achado casar com um GATILHO do dicionário, use o "corpo" e a "conclusão" cadastrados, preenchendo as medidas/lado/segmento realmente ditados. Achado sem entrada no dicionário: redija o corpo morfologicamente; se não souber nomear o diagnóstico, conclua de forma descritiva.
- "omitSlots": se o médico pedir para NÃO descrever uma estrutura (ex.: "não descreva a bexiga", "sem a bexiga"), coloque o slotId dela aqui. Caso contrário, [].
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
            conclusao: { type: "string" },
          },
          required: ["slotId", "corpo", "conclusao"],
        },
      },
      conclusao: { type: "array", items: { type: "string" } },
      omitSlots: { type: "array", items: { type: "string" } },
    },
    required: ["slots", "conclusao", "omitSlots"],
  },
} as const;

async function callPlan(openai: OpenAI, model: string, system: string, user: string): Promise<EditPlan> {
  const isReasoning = /gpt-5/.test(model) && !/chat-latest/.test(model);
  const modelParams = isReasoning
    ? { max_completion_tokens: 1500, reasoning_effort: "none" }
    : { max_tokens: 1500, temperature: 0.2 };
  const res = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: EDIT_PLAN_JSON_SCHEMA },
    ...modelParams,
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
