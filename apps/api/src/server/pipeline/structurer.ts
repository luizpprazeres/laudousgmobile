import {
  StructuredFindingsSchema,
  type StructuredFindings,
} from "@laudousg/shared";
import { z } from "zod";
import { env } from "../env";
import { openai } from "../ai/openai";
import { STRUCTURED_FINDINGS_JSON_SCHEMA } from "../ai/jsonSchema";

/**
 * Etapa 1 — Structurer (gpt-4.1-mini com Structured Outputs strict).
 *
 * Recebe input bruto + hint de categoria e produz StructuredFindings:
 * categoria detectada, tipo_exame, achados (registro), comandos do médico,
 * trechos confusos, nivel_de_confianca.
 *
 * Esta etapa NÃO redige laudo.
 *
 * Workaround: o campo `achados` viaja como STRING JSON-encoded para satisfazer
 * Structured Outputs (ver ai/jsonSchema.ts). Re-parseamos aqui.
 */

const STRUCTURER_SYSTEM_PROMPT = `Você é a etapa estruturadora do LaudoUSG Mobile.
Sua única tarefa é organizar o que o médico disse em JSON estruturado.
NÃO redija laudo. NÃO adicione informação que o médico não disse.

Regras:
- "categoria_detectada": SCREAMING_SNAKE_CASE (ex: ABDOMEN_TOTAL, PELVE_FEMININA, MAMARIA, TIREOIDE).
- "tipo_exame": frase curta em português (ex: "Ultrassonografia do abdome total").
- "achados": JSON ESTRUTURADO codificado como STRING (vai ser re-parseado). Use chaves em snake_case por estrutura/órgão. Inclua medidas como ditadas, com vírgula decimal.
- "comandos_do_medico": frases imperativas do médico ("acrescente...", "compare com...", "item 1 da conclusão = ..."). NÃO repita esses textos em "achados".
- "trechos_confusos": apenas se o input tiver ambiguidade real.
- "nivel_de_confianca": baixa / media / alta.
- "datas_referidas": datas mencionadas em formato como falado (string array). Use [] se nenhuma.
- "lateralidades_mencionadas": ["direito"|"esquerdo"|"bilateral"|"nao_aplicavel"]. Use [] se inaplicável.
- NUNCA invente. NUNCA calcule volumes/percentis (BI-RADS, TI-RADS, FIGO).
- Se o médico falar APENAS um número de líquido amniótico sem ILA/MBV, deixe para a etapa seguinte resolver.`;

/**
 * Schema interno do structurer: aceita `achados` como string e faz parse.
 * Depois re-valida contra StructuredFindings (com `achados` como objeto).
 */
const StructurerRawOutputSchema = z.object({
  schema_version: z.string(),
  categoria_detectada: z.string(),
  tipo_exame: z.string(),
  achados: z.string(),
  comandos_do_medico: z.array(
    z.object({
      tipo: z.string(),
      texto: z.string(),
      trecho_original: z.string().nullable(),
    }),
  ),
  trechos_confusos: z.array(
    z.object({ trecho: z.string(), motivo: z.string() }),
  ),
  nivel_de_confianca: z.enum(["baixa", "media", "alta"]),
  datas_referidas: z.array(z.string()).nullable(),
  lateralidades_mencionadas: z
    .array(z.enum(["direito", "esquerdo", "bilateral", "nao_aplicavel"]))
    .nullable(),
});

export async function runStructurer(args: {
  rawInput: string;
  categoryHint?: string;
  signal?: AbortSignal;
}): Promise<{ findings: StructuredFindings; latencyMs: number }> {
  const t0 = Date.now();
  const e = env();

  const userMessage = [
    args.categoryHint ? `Hint de categoria: ${args.categoryHint}` : "",
    "",
    "Input do médico:",
    args.rawInput,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const res = await openai().chat.completions.create(
    {
      model: e.OPENAI_MODEL_STRUCTURER,
      temperature: 0.0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "StructuredFindings",
          strict: true,
          schema: STRUCTURED_FINDINGS_JSON_SCHEMA as Record<string, unknown>,
        },
      },
      messages: [
        { role: "system", content: STRUCTURER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    },
    { signal: args.signal },
  );

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("structurer: resposta vazia");

  // Fix codex MÉDIO #8: try-catch no JSON.parse pra ter erro descritivo
  // (em vez de "Unexpected token" genérico que mata debug do SSE).
  let rawObj: unknown;
  try {
    rawObj = JSON.parse(raw);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `structurer: resposta do LLM não é JSON válido (${detail}). Início: ${raw.slice(0, 200)}`,
    );
  }
  const validated = StructurerRawOutputSchema.parse(rawObj);

  // Re-parse do `achados` (string) para objeto
  let achados: Record<string, unknown>;
  try {
    achados = JSON.parse(validated.achados);
  } catch {
    throw new Error(
      `structurer: campo achados não é JSON válido: ${validated.achados.slice(0, 200)}`,
    );
  }

  const findings: StructuredFindings = StructuredFindingsSchema.parse({
    schema_version: validated.schema_version || e.FINDINGS_SCHEMA_VERSION,
    categoria_detectada: validated.categoria_detectada,
    tipo_exame: validated.tipo_exame,
    achados,
    comandos_do_medico: validated.comandos_do_medico.map((c) => ({
      tipo: c.tipo as never, // CommandKindSchema valida no parse final
      texto: c.texto,
      trecho_original: c.trecho_original ?? undefined,
    })),
    trechos_confusos: validated.trechos_confusos,
    nivel_de_confianca: validated.nivel_de_confianca,
    datas_referidas: validated.datas_referidas ?? undefined,
    lateralidades_mencionadas: validated.lateralidades_mencionadas ?? undefined,
  });

  return { findings, latencyMs: Date.now() - t0 };
}
