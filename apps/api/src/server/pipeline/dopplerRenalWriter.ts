/**
 * DOPPLER_RENAL `writer_guarded` — piloto do eixo vascular. Mesma receita do
 * MSK/PARTES_MOLES/PELVE: prompt base (roteiro + critérios JVB + guards) + few-shots
 * hand-crafted + fact-audit determinístico + guard de formato + streaming.
 *
 * Gate dedicado ativo por padrão. Falha de auditoria é fail-closed e nunca cai no
 * writer geral. Rollback explícito suspende a categoria. Guard de formato reusa o MSK.
 */
import { dedicatedWriterTarget, llmTextStream } from "../ai/llm";
import { cleanWriterOutput, WRITER_OUTPUT_RULE } from "./writerOutputGuard";
import { env } from "../env";
import { buildDopplerRenalWriterSystemMessage } from "../renderer/categories/DOPPLER_RENAL";
import { DOPPLER_RENAL_FEWSHOTS } from "../renderer/categories/dopplerRenalFewshots";
import {
  assertDopplerRenalAuditPassed,
  auditDopplerRenalFacts,
  type DopplerRenalAudit,
} from "./dopplerRenalWriterAudit";
import { normalizeMskWriterFormat } from "./mskWriterFormat";

export type DopplerRenalWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  outputTokens?: number;
  audit: DopplerRenalAudit;
};

export async function* runDopplerRenalWriterStream(args: {
  rawInput: string;
  signal?: AbortSignal;
}): AsyncGenerator<string, DopplerRenalWriterResult, void> {
  const target = dedicatedWriterTarget(env().DOPPLER_RENAL_WRITER_MODEL, "doppler-renal-writer");
  const model = target.model;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = DOPPLER_RENAL_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão; sem temperature no
  // Haiku (a 0.2 só vale no rollback OpenAI).
  const gen = llmTextStream({
    target,
    system: `${buildDopplerRenalWriterSystemMessage()}\n\n${WRITER_OUTPUT_RULE}`,
    messages: [
      ...fewshotMsgs,
      { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
    ],
    openaiTemperature: 0.2,
    openaiMaxTokens: 4000,
    signal: args.signal,
    label: "doppler-renal-writer",
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
    }
  }

  const fullText = normalizeMskWriterFormat(cleanWriterOutput(full).text);

  const audit = auditDopplerRenalFacts(args.rawInput, fullText);
  // O stream do provedor é deliberadamente retido até a auditoria terminar. Um texto
  // inválido não pode ser "desenviado" depois de ter chegado ao cliente.
  assertDopplerRenalAuditPassed(audit);
  yield fullText;

  return { fullText, latencyMs: Date.now() - t0, ttftMs, model, outputTokens, audit };
}
