import { renderClinicalModelReport } from "@laudousg/shared";
import { openai } from "../ai/openai";
import { env } from "../env";
import { DOPPLER_HEPATICO_JSON_SCHEMA, DOPPLER_HEPATICO_EXTRACTION_PROMPT, HepaticDopplerExtractionSchema, hepaticExtractionToContract } from "../renderer/categories/DOPPLER_HEPATICO";
import { DOPPLER_HEPATICO_FEWSHOTS } from "../renderer/categories/dopplerHepaticoFewshots";
import { auditHepaticDopplerExtraction, assertHepaticDopplerAuditPassed, type HepaticDopplerAudit } from "./dopplerHepaticoWriterAudit";

export type HepaticWriterResult = { fullText: string; latencyMs: number; ttftMs: number; model: string; inputTokens?: number; outputTokens?: number; audit: HepaticDopplerAudit };
type ExtractionResult = { value: unknown; inputTokens?: number; outputTokens?: number };
export type HepaticExtractor = (args: { rawInput: string; signal?: AbortSignal; model: string }) => Promise<ExtractionResult>;

const extract: HepaticExtractor = async ({ rawInput, signal, model }) => {
  const result = await openai().chat.completions.create({
    model, temperature: 0,
    response_format: { type: "json_schema", json_schema: { name: "HepaticDopplerEvidence", strict: true, schema: DOPPLER_HEPATICO_JSON_SCHEMA } },
    messages: [
      { role: "system", content: DOPPLER_HEPATICO_EXTRACTION_PROMPT },
      ...DOPPLER_HEPATICO_FEWSHOTS.flatMap(({ raw, extraction }) => [
        { role: "user" as const, content: raw }, { role: "assistant" as const, content: JSON.stringify(extraction) },
      ]),
      { role: "user", content: rawInput },
    ],
  }, { signal });
  const choice = result.choices[0];
  if (choice?.finish_reason !== "stop" || !choice.message.content || choice.message.refusal) throw new Error("DOPPLER_HEPATICO_EXTRACTION_INCOMPLETE");
  return { value: JSON.parse(choice.message.content), inputTokens: result.usage?.prompt_tokens, outputTokens: result.usage?.completion_tokens };
};

/** Só o dado auditado chega ao renderer aprovado. Nada é emitido antes do gate. */
export async function* runDopplerHepaticoWriterStream(args: { rawInput: string; objective?: boolean; signal?: AbortSignal }, dependencies: { extract?: HepaticExtractor; model?: string; enabled?: boolean } = {}): AsyncGenerator<string, HepaticWriterResult, void> {
  if (!(dependencies.enabled ?? env().DOPPLER_HEPATICO_WRITER_ENABLED !== "false")) throw new Error("DOPPLER_HEPATICO_WRITER_DISABLED");
  const model = dependencies.model ?? env().DOPPLER_HEPATICO_WRITER_MODEL;
  const started = Date.now();
  const extracted = await (dependencies.extract ?? extract)({ rawInput: args.rawInput, model, signal: args.signal });
  const audit = auditHepaticDopplerExtraction(args.rawInput, extracted.value);
  assertHepaticDopplerAuditPassed(audit);
  const contract = hepaticExtractionToContract(HepaticDopplerExtractionSchema.parse(extracted.value));
  let fullText = renderClinicalModelReport(contract);
  if (args.objective) fullText = fullText.replace(/^COMENTÁRIOS:$/m, "TÉCNICA:").replace(/^OS SEGUINTES ASPECTOS FORAM OBSERVADOS:$/m, "ACHADOS:").replace(/^CONCLUSÃO:$/m, "IMPRESSÃO:");
  const elapsed = Date.now() - started;
  yield fullText;
  return { fullText, latencyMs: elapsed, ttftMs: elapsed, model, inputTokens: extracted.inputTokens, outputTokens: extracted.outputTokens, audit };
}
