/**
 * PARTES_MOLES `writer_guarded` — 2ª categoria aberta na arquitetura de 2 modos
 * (2026-07-02), mesma receita do piloto MSK (pipeline/mskWriter.ts):
 * prompt base (regras da casa + roteiro) + few-shots dos laudos reais assinados +
 * fact-audit determinístico + guard de formato + streaming.
 *
 * Flag `PARTES_MOLES_WRITER` (default OFF). Guard de formato reusa o do MSK
 * (normalizeMskWriterFormat) — os cabeçalhos da casa são os mesmos.
 */
import { dedicatedWriterTarget, llmTextStream } from "../ai/llm";
import { cleanWriterOutput, WRITER_OUTPUT_RULE } from "./writerOutputGuard";
import { env } from "../env";
import { buildPartesMolesWriterSystemMessage } from "../renderer/categories/PARTES_MOLES";
import { PARTES_MOLES_FEWSHOTS } from "../renderer/categories/partesMolesFewshots";
import {
  auditPartesMolesFacts,
  partesMolesRevisarNote,
  type PartesMolesAudit,
} from "./partesMolesWriterAudit";
import { normalizeMskWriterFormat } from "./mskWriterFormat";

export type PartesMolesWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Fact-audit determinístico (medida/lado/deriva/placeholder) — observabilidade. */
  audit: PartesMolesAudit;
};

/** Streama o laudo PARTES_MOLES escrito pelo LLM. Yields deltas; retorna texto + métricas. */
export async function* runPartesMolesWriterStream(args: {
  rawInput: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, PartesMolesWriterResult, void> {
  const target = dedicatedWriterTarget(env().PARTES_MOLES_WRITER_MODEL, "partes-moles-writer", env(), "PARTES_MOLES");
  let model = target.model;
  let inputTokens: number | undefined;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  // Few-shots dos laudos REAIS assinados do médico (estilo da casa por exemplo) +
  // regras no system. Prefixo estável → cacheável pelo provedor.
  const fewshotMsgs = PARTES_MOLES_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão; sem temperature no
  // Haiku (a 0.2 só vale no rollback OpenAI).
  const gen = llmTextStream({
    target,
    system: `${buildPartesMolesWriterSystemMessage()}\n\n${WRITER_OUTPUT_RULE}`,
    messages: [
      ...fewshotMsgs,
      { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
    ],
    openaiTemperature: 0.2,
    openaiMaxTokens: 4000,
    signal: args.signal,
    label: "partes-moles-writer",
  });

  let outputTokens: number | undefined;
  for (;;) {
    const next = await gen.next();
    if (next.done) {
      outputTokens = next.value.outputTokens;
      inputTokens = next.value.inputTokens;
      // Modelo que efetivamente escreveu (o fallback de recusa pode trocá-lo).
      model = next.value.model ?? model;
      break;
    }
    const delta = next.value;
    if (delta) {
      if (!ttftMs) ttftMs = Date.now() - t0;
      full += delta;
      yield delta;
    }
  }

  // Guard de formato determinístico (cabeçalhos canônicos, bullets, espaços) — só
  // formato, nunca conteúdo. Mesmo guard do MSK (cabeçalhos idênticos).
  let fullText = normalizeMskWriterFormat(cleanWriterOutput(full).text);

  // Fact-audit determinístico (opção 2 do Luiz): streama otimista, audita DEPOIS.
  // Se um fato objetivo falha, ANEXA "[REVISAR: …]" ao fim (não re-roda). Sempre logado.
  const audit = auditPartesMolesFacts(args.rawInput, fullText);
  const nota = partesMolesRevisarNote(audit);
  if (nota) {
    fullText = `${fullText}\n\n${nota}`;
    yield `\n\n${nota}`;
  }

  return {
    fullText,
    latencyMs: Date.now() - t0,
    ttftMs,
    model,
    inputTokens,
    outputTokens,
    audit,
  };
}
