/**
 * DOPPLER_VENOSO_MMII `writer_guarded` — 2ª modalidade do eixo vascular. Mesma receita
 * (prompt + few-shots hand-crafted + fact-audit + Haiku 5.5 + streaming). Gate =
 * membership em RENDERER_CATEGORIES. Guard de formato reusa o do MSK.
 */
import { dedicatedWriterTarget, llmTextStream } from "../ai/llm";
import { env } from "../env";
import { buildDopplerVenosoMmiiWriterSystemMessage } from "../renderer/categories/DOPPLER_VENOSO_MMII";
import { DOPPLER_VENOSO_MMII_FEWSHOTS } from "../renderer/categories/dopplerVenosoMmiiFewshots";
import {
  auditDopplerVenosoFacts,
  dopplerVenosoRevisarNote,
  type DopplerVenosoAudit,
} from "./dopplerVenosoMmiiWriterAudit";
import { normalizeMskWriterFormat } from "./mskWriterFormat";

export type DopplerVenosoWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  outputTokens?: number;
  audit: DopplerVenosoAudit;
};

export async function* runDopplerVenosoMmiiWriterStream(args: {
  rawInput: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, DopplerVenosoWriterResult, void> {
  const target = dedicatedWriterTarget(env().DOPPLER_VENOSO_WRITER_MODEL, "doppler-venoso-writer");
  const model = target.model;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = DOPPLER_VENOSO_MMII_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão; sem temperature no
  // Haiku (a 0.2 só vale no rollback OpenAI).
  const gen = llmTextStream({
    target,
    system: buildDopplerVenosoMmiiWriterSystemMessage(),
    messages: [
      ...fewshotMsgs,
      { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
    ],
    openaiTemperature: 0.2,
    openaiMaxTokens: 4000,
    signal: args.signal,
    label: "doppler-venoso-writer",
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

  let fullText = normalizeMskWriterFormat(full);

  const audit = auditDopplerVenosoFacts(args.rawInput, fullText);
  const nota = dopplerVenosoRevisarNote(audit);
  if (nota) {
    fullText = `${fullText}\n\n${nota}`;
    yield `\n\n${nota}`;
  }

  return { fullText, latencyMs: Date.now() - t0, ttftMs, model, outputTokens, audit };
}
