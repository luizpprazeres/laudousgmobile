import OpenAI from "openai";
import { env } from "../env";

let _client: OpenAI | null = null;

export function openai() {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: env().OPENAI_API_KEY });
  return _client;
}

/**
 * Helper para chamar Structured Outputs (json_schema strict).
 * O codex destacou: usar json_schema strict, NÃO json_mode legado.
 *
 * Uso:
 *   const findings = await structuredCompletion({
 *     model: env().OPENAI_MODEL_STRUCTURER,
 *     system: STRUCTURER_SYSTEM_PROMPT,
 *     user: rawInput,
 *     schemaName: "StructuredFindings",
 *     schema: structuredFindingsJsonSchema, // gerado de Zod via zod-to-json-schema
 *     parser: StructuredFindingsSchema,     // valida no parse
 *     signal,
 *   });
 */
export async function structuredCompletion<T>(opts: {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  parser: { parse: (input: unknown) => T };
  signal?: AbortSignal;
  temperature?: number;
}): Promise<T> {
  const res = await openai().chat.completions.create(
    {
      model: opts.model,
      temperature: opts.temperature ?? 0.0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: opts.schemaName,
          strict: true,
          schema: opts.schema,
        },
      },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    },
    { signal: opts.signal },
  );

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error(`${opts.schemaName}: resposta vazia do modelo`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${opts.schemaName}: resposta não é JSON válido`);
  }
  return opts.parser.parse(parsed);
}
