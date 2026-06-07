import type {
  RagBlockForPrompt,
  StructuredFindings,
  WritingStyleCode,
} from "@laudousg/shared";
import { openai } from "../ai/openai";
import { env } from "../env";
import { temperatureForCategory } from "./temperatureByCategory";
import { buildSystemMessage } from "../prompts/buildSystemMessage";

/**
 * Etapa 4 — Writer (gpt-4.1-mini, streaming, temperatura por categoria).
 *
 * Recebe TUDO consolidado e devolve apenas o LAUDO FINAL via stream de tokens.
 *
 * Precedência codificada no prompt (ordem importa, do mais forte ao mais fraco):
 *   1. comandos explícitos do médico    (no user message, com header destacado)
 *   2. achados estruturados              (no user message, JSON)
 *   3. validações determinísticas        (futuro: warnings viram observações)
 *   4. prompt global fixo                (no system, GLOBAL_RULES_BLOCK)
 *   5. contrato fixo da categoria        (no system, primeiro)
 *   6. estilo ativo                      (no system, overlay)
 *   7. blocos RAG validados              (no system, agrupados por kind)
 *   8. exemplos / few-shots              (no system, kind=exemplo)
 *
 * Order de injeção do system message: ver prompts/buildSystemMessage.ts.
 */
export async function* runWriterStream(args: {
  findings: StructuredFindings;
  ragBlocks: RagBlockForPrompt[];
  writingStyleCode: WritingStyleCode;
  categoryLabel: string;
  /**
   * Categoria EFETIVA p/ contrato + temperatura. Default = findings.categoria_
   * detectada. No fast-path (sem structurer) vem do category_hint resolvido.
   */
  categoryCode?: string;
  /**
   * FAST-PATH: quando fornecido, o user message é o DITADO CRU do médico (em vez
   * dos achados estruturados). Tira o structurer do caminho bloqueante.
   */
  rawUserMessage?: string;
  signal?: AbortSignal;
  onSystemMessage?: (message: string) => void;
}): AsyncGenerator<
  string,
  {
    fullText: string;
    latencyMs: number;
    systemMessage: string;
    inputTokens?: number;
    outputTokens?: number;
  },
  void
> {
  const t0 = Date.now();

  const effectiveCategoryCode =
    args.categoryCode ?? args.findings.categoria_detectada;

  const systemMessage = buildSystemMessage({
    categoryCode: effectiveCategoryCode,
    categoryLabel: args.categoryLabel,
    writingStyleCode: args.writingStyleCode,
    ragBlocks: args.ragBlocks,
  });
  args.onSystemMessage?.(systemMessage);

  const userMessage = args.rawUserMessage
    ? buildRawUserMessage(args.rawUserMessage)
    : buildUserMessage(args.findings);

  const stream = await openai().chat.completions.create(
    {
      model: env().OPENAI_MODEL_WRITER,
      // Temperatura por categoria — herdada do LaudoUSG original.
      temperature: temperatureForCategory(effectiveCategoryCode),
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 2500, // mesmo limite do original
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    },
    { signal: args.signal },
  );

  let full = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  for await (const chunk of stream) {
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      full += delta;
      yield delta;
    }
  }

  return {
    fullText: full,
    latencyMs: Date.now() - t0,
    systemMessage,
    inputTokens,
    outputTokens,
  };
}

/**
 * User message — mínimo, com comandos do médico em bloco destacado e
 * achados estruturados em JSON.
 *
 * Espelha o original (lib/promptBuilder.ts:124-185 + findingsPreprocessor.ts):
 * comandos viram o bloco "=== INSTRUÇÕES DE EDIÇÃO ===" antes de
 * "=== ACHADOS CLÍNICOS ===" para que o GLOBAL_RULES_BLOCK saiba aplicar
 * com precedência máxima.
 */
function buildUserMessage(f: StructuredFindings): string {
  const parts: string[] = [];

  if (f.comandos_do_medico.length > 0) {
    parts.push("=== INSTRUÇÕES DE EDIÇÃO ===");
    for (const c of f.comandos_do_medico) {
      parts.push(`- [${c.tipo}] ${c.texto}`);
    }
    parts.push("");
  }

  parts.push("=== ACHADOS CLÍNICOS (estruturados) ===");
  parts.push("```json");
  parts.push(JSON.stringify(f.achados, null, 2));
  parts.push("```");

  parts.push("");
  parts.push("Retorne apenas o laudo técnico completo.");

  return parts.join("\n");
}

/**
 * FAST-PATH user message: o ditado CRU do médico vira o input do writer,
 * sem a etapa estruturadora. Instrui o modelo a tratar o texto como o ditado
 * (achados + comandos juntos) e seguir as regras/modelo do system message.
 */
function buildRawUserMessage(rawInput: string): string {
  return [
    "=== DITADO DO MÉDICO (achados + instruções) ===",
    rawInput.trim(),
    "",
    "REGRAS DE GERAÇÃO (siga TODAS):",
    "1. Use o MODELO da categoria (no system) na ÍNTEGRA — preserve as seções",
    "   obrigatórias e a ordem do modelo. Para campos sem valor ditado DENTRO de",
    "   uma frase real, mantenha o placeholder \"____\" quando o modelo exigir.",
    "   NUNCA crie item de CONCLUSÃO cujo conteúdo inteiro seja apenas \"____\";",
    "   se o item depende totalmente de dado ausente, omita o item inteiro.",
    "   Ex.: se o modelo tem \"1) Gestação em torno de ____ semanas\" e o médico",
    "   não disse a idade, mantenha o item com \"____\".",
    "2. Aplique as INSTRUÇÕES do médico no ditado (ex.: \"na conclusão",
    "   acrescente...\", \"compare com...\", classificações RADS/FIGO ditadas).",
    "3. Preserve TODAS as medidas, lateralidades e negações exatamente como ditadas.",
    "4. NÃO invente achados que o médico não mencionou.",
    "Retorne apenas o laudo técnico completo.",
  ].join("\n");
}
