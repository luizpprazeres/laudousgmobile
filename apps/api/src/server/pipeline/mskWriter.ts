/**
 * MSK `writer_guarded` (piloto — arquitetura de 2 modos, 2026-07-02).
 *
 * Categoria ABERTA (MSK) escrita pelo LLM em vez do renderer determinístico: o modelo
 * ENTENDE o ditado em linguagem natural (multi-segmento, garble, comandos misturados),
 * guiado pelo ROTEIRO DA CASA no prompt (cobertura exata, sem inventar estrutura).
 *
 * Prova empírica (docs/plano-arquitetura-3-modos-2026-07-02.md §11): esta chamada é
 * TÃO rápida quanto a extração do renderer (~5s, 1º token ~1,2s) — o "14s" era modelo
 * grande + RAG pesado + multi-estágio, não o writer em si.
 *
 * Flag `MSK_WRITER` (default OFF). Fact-audit + rerun entram numa fatia seguinte.
 */
import { openai } from "../ai/openai";
import { env } from "../env";
import { buildMskWriterSystemMessage } from "../renderer/categories/MUSCULOESQUELETICO";

export type MskWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  outputTokens?: number;
};

/** Streama o laudo MSK escrito pelo LLM. Yields deltas; retorna o texto + métricas. */
export async function* runMskWriterStream(args: {
  rawInput: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, MskWriterResult, void> {
  const model = env().OPENAI_MODEL_WRITER;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const stream = await openai().chat.completions.create(
    {
      model,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: buildMskWriterSystemMessage() },
        { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
      ],
    },
    { signal: args.signal },
  );

  let outputTokens: number | undefined;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      if (!ttftMs) ttftMs = Date.now() - t0;
      full += delta;
      yield delta;
    }
    if (chunk.usage?.completion_tokens) outputTokens = chunk.usage.completion_tokens;
  }

  return {
    fullText: full.trim(),
    latencyMs: Date.now() - t0,
    ttftMs,
    model,
    outputTokens,
  };
}
