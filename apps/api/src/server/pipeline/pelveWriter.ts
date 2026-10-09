/**
 * PELVE `writer_guarded` — migração pedida pelo Dr. Luiz (02/07): a pelve TA/TV tem
 * muitos detalhes que mudam entre casos, e o renderer determinístico gera frase
 * repetida / fora de posição / alucinação. Mesma receita do MSK/PARTES_MOLES:
 * prompt base (regras da casa + roteiro das 4 vias) + few-shots dos laudos reais
 * assinados + fact-audit determinístico + guard de formato + streaming.
 *
 * Flag `PELVE_WRITER` (default OFF). Guard de formato reusa o do MSK (cabeçalhos iguais).
 */
import { dedicatedWriterTarget, llmTextStream } from "../ai/llm";
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
  const target = dedicatedWriterTarget(env().PELVE_WRITER_MODEL, "pelve-writer");
  const model = target.model;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = PELVE_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão; sem temperature no
  // Haiku (a 0.2 só vale no rollback OpenAI).
  const gen = llmTextStream({
    target,
    system: buildPelveWriterSystemMessage(),
    messages: [
      ...fewshotMsgs,
      { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
    ],
    openaiTemperature: 0.2,
    openaiMaxTokens: 4000,
    signal: args.signal,
    label: "pelve-writer",
  });

  let outputTokens: number | undefined;
  for (;;) {
    const next = await gen.next();
    if (next.done) {
      outputTokens = next.value.outputTokens;
      break;
    }
    const delta = next.value;
    if (delta) {
      if (!ttftMs) ttftMs = Date.now() - t0;
      full += delta;
      yield delta;
    }
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
