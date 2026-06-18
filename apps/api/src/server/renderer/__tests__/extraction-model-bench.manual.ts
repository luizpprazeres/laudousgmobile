/**
 * Benchmark BARATO de modelos de EXTRAÇÃO (não escrita) nos ditados reais.
 * Mede latência + se captura os campos-chave da IG. Só modelos cheap.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/extraction-model-bench.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { EXTRACTORS } from "../extraction";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ext = EXTRACTORS.OBSTETRICA!;
type Row = { raw_input: string };
const rows: Row[] = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8"));

// Modelos a testar (todos cheap). reasoning só nos gpt-5*.
const MODELS: { id: string; reasoning?: "minimal" | "low" }[] = [
  { id: "gpt-4.1-mini" }, // baseline atual
  { id: "gpt-4.1-nano" }, // menor/mais rápido
  { id: "gpt-5-nano", reasoning: "minimal" }, // gpt-5 nano sem pensar
  { id: "gpt-5-nano", reasoning: "low" }, // gpt-5 nano pensando pouco
];

async function extract(model: string, reasoning: string | undefined, raw: string) {
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: 8000,
    response_format: {
      type: "json_schema",
      json_schema: { name: ext.schemaName, strict: true, schema: ext.jsonSchema },
    },
    messages: [
      { role: "system", content: ext.prompt },
      { role: "user", content: `Ditado do médico:\n${raw}` },
    ],
  };
  if (reasoning) body.reasoning_effort = reasoning;
  else body.temperature = 0.0;
  const t0 = Date.now();
  const res = await client.chat.completions.create(body as never);
  const ms = Date.now() - t0;
  const content = (res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}";
  let f: Record<string, unknown> = {};
  try { f = JSON.parse(content); } catch { /* schema strict deveria garantir */ }
  return { ms, f, out: (res as { usage?: { completion_tokens?: number } }).usage?.completion_tokens ?? 0 };
}

const run = async () => {
  for (const m of MODELS) {
    const label = m.id + (m.reasoning ? `/${m.reasoning}` : "");
    let totMs = 0, ok = 0, capturas = 0, erros = 0;
    for (const r of rows) {
      try {
        const { ms, f } = await extract(m.id, m.reasoning, r.raw_input);
        totMs += ms;
        // captura: pegou a 1ª US quando o ditado a menciona?
        const temUs = /ultrassonografia realizada|primeira u|1[ºª] ?ultra/i.test(r.raw_input);
        if (!temUs || f.primeira_us_data) capturas++;
        if (f.ig_semanas != null) ok++;
      } catch (e) {
        erros++;
        console.log(`  [${label}] erro: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    const n = rows.length - erros;
    console.log(`${label.padEnd(22)} média ${n ? Math.round(totMs / n) : 0}ms | ig ok ${ok}/${rows.length} | 1ªUS captada ${capturas}/${rows.length} | erros ${erros}`);
  }
};

run().then(() => console.log("✓ bench concluído")).catch((e) => { console.error(e); process.exit(1); });
