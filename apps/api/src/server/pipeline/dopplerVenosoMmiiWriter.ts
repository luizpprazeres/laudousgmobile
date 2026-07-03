/**
 * DOPPLER_VENOSO_MMII `writer_guarded` — 2ª modalidade do eixo vascular. Mesma receita
 * (prompt + few-shots hand-crafted + fact-audit + gpt-4.1 + streaming). Gate =
 * membership em RENDERER_CATEGORIES. Guard de formato reusa o do MSK.
 */
import { openai } from "../ai/openai";
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
  const model = env().DOPPLER_VENOSO_WRITER_MODEL;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = DOPPLER_VENOSO_MMII_FEWSHOTS.flatMap((f) => [
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
        { role: "system", content: buildDopplerVenosoMmiiWriterSystemMessage() },
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

  let fullText = normalizeMskWriterFormat(full);

  const audit = auditDopplerVenosoFacts(args.rawInput, fullText);
  const nota = dopplerVenosoRevisarNote(audit);
  if (nota) {
    fullText = `${fullText}\n\n${nota}`;
    yield `\n\n${nota}`;
  }

  return { fullText, latencyMs: Date.now() - t0, ttftMs, model, outputTokens, audit };
}
