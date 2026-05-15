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
  signal?: AbortSignal;
}): AsyncGenerator<string, { fullText: string; latencyMs: number }, void> {
  const t0 = Date.now();

  const systemMessage = buildSystemMessage({
    categoryCode: args.findings.categoria_detectada,
    categoryLabel: args.categoryLabel,
    writingStyleCode: args.writingStyleCode,
    ragBlocks: args.ragBlocks,
  });

  const userMessage = buildUserMessage(args.findings);

  const stream = await openai().chat.completions.create(
    {
      model: env().OPENAI_MODEL_WRITER,
      // Temperatura por categoria — herdada do LaudoUSG original.
      temperature: temperatureForCategory(args.findings.categoria_detectada),
      stream: true,
      max_tokens: 2500, // mesmo limite do original
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    },
    { signal: args.signal },
  );

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      full += delta;
      yield delta;
    }
  }

  return { fullText: full, latencyMs: Date.now() - t0 };
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
