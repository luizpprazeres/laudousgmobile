import { renderClinicalModelReport } from "@laudousg/shared";
import { dedicatedWriterTarget, llmJson, LlmOutputError } from "../ai/llm";
import { env } from "../env";
import { cleanExtractionMetatext } from "../renderer/extractionMetatext";
import { DOPPLER_HEPATICO_JSON_SCHEMA, DOPPLER_HEPATICO_EXTRACTION_PROMPT, HepaticDopplerExtractionSchema, hepaticExtractionToContract } from "../renderer/categories/DOPPLER_HEPATICO";
import { DOPPLER_HEPATICO_FEWSHOTS } from "../renderer/categories/dopplerHepaticoFewshots";
import { auditHepaticDopplerExtraction, assertHepaticDopplerAuditPassed, type HepaticDopplerAudit } from "./dopplerHepaticoWriterAudit";

export type HepaticWriterResult = { fullText: string; latencyMs: number; ttftMs: number; model: string; inputTokens?: number; outputTokens?: number; audit: HepaticDopplerAudit };
type ExtractionResult = { value: unknown; inputTokens?: number; outputTokens?: number };
export type HepaticExtractor = (args: { rawInput: string; signal?: AbortSignal; model: string }) => Promise<ExtractionResult>;

const extract: HepaticExtractor = async ({ rawInput, signal, model }) => {
  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão. Recusa, truncamento ou
  // término inesperado viram erro — a geração hepática é fail-closed.
  try {
    const { raw, usage } = await llmJson({
      target: dedicatedWriterTarget(model, "doppler-hepatico-writer"),
      system: DOPPLER_HEPATICO_EXTRACTION_PROMPT,
      messages: [
        ...DOPPLER_HEPATICO_FEWSHOTS.flatMap(({ raw: shot, extraction }) => [
          { role: "user" as const, content: shot },
          { role: "assistant" as const, content: JSON.stringify(extraction) },
        ]),
        { role: "user", content: rawInput },
      ],
      schemaName: "HepaticDopplerEvidence",
      schema: DOPPLER_HEPATICO_JSON_SCHEMA as unknown as Record<string, unknown>,
      signal,
      validate: (value) => void HepaticDopplerExtractionSchema.parse(value),
    });
    const { value } = cleanExtractionMetatext(JSON.parse(raw), DOPPLER_HEPATICO_JSON_SCHEMA);
    return { value, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
  } catch (err) {
    if (err instanceof LlmOutputError) throw new Error("DOPPLER_HEPATICO_EXTRACTION_INCOMPLETE");
    throw err;
  }
};

/** Só o dado auditado chega ao renderer aprovado. Nada é emitido antes do gate. */
export async function* runDopplerHepaticoWriterStream(args: { rawInput: string; objective?: boolean; signal?: AbortSignal }, dependencies: { extract?: HepaticExtractor; model?: string; enabled?: boolean } = {}): AsyncGenerator<string, HepaticWriterResult, void> {
  if (!(dependencies.enabled ?? env().DOPPLER_HEPATICO_WRITER_ENABLED !== "false")) throw new Error("DOPPLER_HEPATICO_WRITER_DISABLED");
  const model = dependencies.model ?? dedicatedWriterTarget(env().DOPPLER_HEPATICO_WRITER_MODEL, "doppler-hepatico-writer").model;
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
