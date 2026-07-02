/**
 * PELVE `writer_guarded` — migração pedida pelo Dr. Luiz (02/07): a pelve TA/TV tem
 * muitos detalhes que mudam entre casos, e o renderer determinístico gera frase
 * repetida / fora de posição / alucinação. Mesma receita do MSK/PARTES_MOLES:
 * prompt base (regras da casa + roteiro das 4 vias) + few-shots dos laudos reais
 * assinados + fact-audit determinístico + guard de formato + streaming.
 *
 * Flag `PELVE_WRITER` (default OFF). Guard de formato reusa o do MSK (cabeçalhos iguais).
 */
import { openai } from "../ai/openai";
import { env } from "../env";
import { buildPelveWriterSystemMessage } from "../renderer/categories/PELVE_FEMININA";
import { PELVE_FEWSHOTS } from "../renderer/categories/pelveFewshots";
import { auditPelveFacts, pelveRevisarNote, type PelveAudit } from "./pelveWriterAudit";
import { normalizeMskWriterFormat } from "./mskWriterFormat";

export type PelveWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  outputTokens?: number;
  audit: PelveAudit;
};

/** Streama o laudo PELVE escrito pelo LLM. Yields deltas; retorna texto + métricas. */
export async function* runPelveWriterStream(args: {
  rawInput: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, PelveWriterResult, void> {
  const model = env().PELVE_WRITER_MODEL;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = PELVE_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  const stream = await openai().chat.completions.create(
    {
      model,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: buildPelveWriterSystemMessage() },
        ...fewshotMsgs,
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

  // Guard de formato determinístico (cabeçalhos canônicos, bullets, espaços).
  let fullText = normalizeMskWriterFormat(full);

  // Fact-audit determinístico: streama otimista, audita DEPOIS; falha → anexa [REVISAR].
  const audit = auditPelveFacts(args.rawInput, fullText);
  const nota = pelveRevisarNote(audit);
  if (nota) {
    fullText = `${fullText}\n\n${nota}`;
    yield `\n\n${nota}`;
  }

  return {
    fullText,
    latencyMs: Date.now() - t0,
    ttftMs,
    model,
    outputTokens,
    audit,
  };
}
