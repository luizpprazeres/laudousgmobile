/**
 * DOPPLER_RENAL `writer_guarded` — piloto do eixo vascular. Mesma receita do
 * MSK/PARTES_MOLES/PELVE: prompt base (roteiro + critérios JVB + guards) + few-shots
 * hand-crafted + fact-audit determinístico + guard de formato + streaming.
 *
 * Gate dedicado ativo por padrão. Falha de auditoria é fail-closed e nunca cai no
 * writer geral. Rollback explícito suspende a categoria. Guard de formato reusa o MSK.
 */
import { openai } from "../ai/openai";
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
  const model = env().DOPPLER_RENAL_WRITER_MODEL;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  const fewshotMsgs = DOPPLER_RENAL_FEWSHOTS.flatMap((f) => [
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
        { role: "system", content: buildDopplerRenalWriterSystemMessage() },
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
    }
    if (chunk.usage?.completion_tokens) outputTokens = chunk.usage.completion_tokens;
  }

  const fullText = normalizeMskWriterFormat(full);

  const audit = auditDopplerRenalFacts(args.rawInput, fullText);
  // O stream do provedor é deliberadamente retido até a auditoria terminar. Um texto
  // inválido não pode ser "desenviado" depois de ter chegado ao cliente.
  assertDopplerRenalAuditPassed(audit);
  yield fullText;

  return { fullText, latencyMs: Date.now() - t0, ttftMs, model, outputTokens, audit };
}
