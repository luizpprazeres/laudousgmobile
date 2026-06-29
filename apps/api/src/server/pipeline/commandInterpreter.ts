/**
 * DET-6 FASE 2 — Interpretador de comandos por LLM (structured output).
 *
 * O LLM CLASSIFICA e ESTRUTURA; o código EXECUTA. O modelo recebe o ditado + o
 * laudo já renderizado (draft) e devolve um conjunto FECHADO de `ReportOperation[]`
 * — nunca reescreve o laudo. Resolve o que a regex determinística (fase 1) não
 * cobre: âncora SEMÂNTICA ("a frase do resíduo" → linha literal do draft) e achado
 * para o CORPO ("pode colocar cisto de óleo").
 *
 * Determinismo onde importa: o executor (`applyOperations`) é puro; a saída do LLM
 * é VALIDADA contra o draft (replace_phrase com `from` inexistente é descartado —
 * fail-safe, nunca toca no laudo errado). temperature 0 + json_schema strict.
 *
 * Flag: `COMMAND_INTERPRETER` (default OFF). Roda DEPOIS da fase 1 determinística.
 */
import { z } from "zod";
import { env } from "../env";
import { structuredCompletion } from "../ai/openai";
import { applyOperations } from "./operations";
import { normalizeAsrCommands } from "./asrNormalize";
import type { ReportOperation } from "@laudousg/shared";

// Subconjunto de ops que o LLM pode emitir (sem position/anchor — posicional fica
// determinístico). Schema strict para OpenAI (anyOf, cada branch fechado).
export const COMMAND_INTERPRETER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["operations"],
  properties: {
    operations: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "text"],
            properties: { op: { type: "string", enum: ["add_conclusion_item"] }, text: { type: "string" } },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "text"],
            properties: { op: { type: "string", enum: ["add_comment"] }, text: { type: "string" } },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "text"],
            properties: { op: { type: "string", enum: ["add_body_finding"] }, text: { type: "string" } },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["op", "from", "to"],
            properties: {
              op: { type: "string", enum: ["replace_phrase"] },
              from: { type: "string" },
              to: { type: "string" },
            },
          },
        ],
      },
    },
  },
} as const;

const InterpreterOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add_conclusion_item"), text: z.string().min(1) }),
  z.object({ op: z.literal("add_comment"), text: z.string().min(1) }),
  z.object({ op: z.literal("add_body_finding"), text: z.string().min(1) }),
  z.object({ op: z.literal("replace_phrase"), from: z.string().min(1), to: z.string().min(1) }),
]);
const InterpreterOutputSchema = z.object({ operations: z.array(InterpreterOpSchema) });

const INTERPRETER_SYSTEM = `Você é o INTERPRETADOR DE COMANDOS do LaudoUSG. Recebe (1) o DITADO bruto do médico e (2) o LAUDO já gerado (draft). Sua tarefa: identificar APENAS os COMANDOS de edição que o médico embutiu no ditado e convertê-los em OPERAÇÕES estruturadas. Você NÃO reescreve o laudo.

CONJUNTO FECHADO DE OPERAÇÕES (use só estas):
- add_conclusion_item {text}: o médico pediu para ACRESCENTAR algo À CONCLUSÃO ("na conclusão acrescente/recomende X", "no final coloque X").
- add_comment {text}: o médico pediu para acrescentar algo aos COMENTÁRIOS/técnica ("acrescente nos comentários que ...").
- add_body_finding {text}: o médico pediu para acrescentar um ACHADO ao CORPO do laudo ("pode colocar/coloque/acrescente <achado>" que descreve um achado clínico, não um item de conclusão; ex.: "pode colocar cisto de óleo").
- replace_phrase {from,to}: o médico pediu para TROCAR uma frase ("no lugar de X escreva Y", "no lugar da frase do resíduo escreva Y"). O campo "from" DEVE ser uma substring LITERAL EXATA copiada do LAUDO (draft) — encontre a linha correspondente ("a frase do resíduo" → a linha do draft que fala de resíduo) e copie-a IDÊNTICA. Se não houver linha correspondente no draft, NÃO emita a operação.

REGRAS:
1. text/to: a SUBSTÂNCIA LIMPA, nas palavras do médico, SEM as palavras de comando ("acrescente", "no lugar de", "pode colocar", "na conclusão") e SEM ruído.
2. NÃO emita operação para ACHADOS clínicos comuns que JÁ estão no laudo (eles já foram renderizados) — só para o que é COMANDO de edição.
3. IGNORE (não emita): correlação de idade gestacional ("correlacione/acione com a ultrassonografia precoce/DUM" — já é feito pelo sistema), e ruído de fala.
4. NUNCA invente conteúdo. Se o ditado não tem comando de edição, devolva operations: [].
5. Devolva SOMENTE o JSON no formato pedido.`;

/**
 * Chama o LLM e valida a saída contra o draft. replace_phrase com `from` que não
 * é substring literal do laudo é DESCARTADO (fail-safe: nunca substitui errado).
 */
export async function interpretCommandsLLM(
  rawInput: string,
  draft: string,
  signal?: AbortSignal,
): Promise<ReportOperation[]> {
  const out = await structuredCompletion({
    model: env().OPENAI_MODEL_STRUCTURER,
    system: INTERPRETER_SYSTEM,
    user: `DITADO:\n${normalizeAsrCommands(rawInput)}\n\n--- LAUDO ATUAL (draft) ---\n${draft}`,
    schemaName: "CommandOperations",
    schema: COMMAND_INTERPRETER_JSON_SCHEMA as unknown as Record<string, unknown>,
    parser: InterpreterOutputSchema,
    signal,
  });
  return out.operations.filter(
    (op) => op.op !== "replace_phrase" || draft.includes(op.from),
  );
}

/**
 * Aplica o interpretador LLM ao laudo (assíncrono). Falha graciosamente: erro no
 * LLM → retorna o laudo intocado (nunca quebra a geração).
 */
export async function applyCommandInterpreter(
  laudo: string,
  rawInput: string,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const ops = await interpretCommandsLLM(rawInput, laudo, signal);
    if (ops.length === 0) return laudo;
    return applyOperations(laudo, ops).laudo;
  } catch (e) {
    console.error(`[commandInterpreter] falhou; laudo intocado: ${(e as Error).message}`);
    return laudo;
  }
}
