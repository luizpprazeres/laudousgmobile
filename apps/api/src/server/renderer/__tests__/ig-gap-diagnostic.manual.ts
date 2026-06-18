/**
 * Diagnóstico: qual caso o gpt-5-nano erra a ig? Roda mini (6/6 ref) × nano
 * (minimal, reforçado) lado a lado, por caso. Mostra ig extraída de cada.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/ig-gap-diagnostic.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { EXTRACTORS } from "../extraction";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ext = EXTRACTORS.OBSTETRICA!;
const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];

const REFORCO =
  "\n\nDISTINÇÃO CRÍTICA da idade gestacional:\n- ig_semanas/ig_dias = IG da BIOMETRIA ATUAL — a que vem rotulada 'pela biometria atual' ou 'IG pela biometria'. É a ÂNCORA.\n- ig_referencia_hoje_semanas/dias = a IG da referência precoce corrigida ('compatível com X', 'pela primeira US hoje com X'). NUNCA é a ig_semanas.\nEx.: 'em torno de 26 semanas e 5 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com 27 semanas e 6 dias' → ig_semanas=26, ig_dias=5; ig_referencia_hoje_semanas=27, ig_referencia_hoje_dias=6. NUNCA troque os dois.";

async function extract(model: string, reasoning: string | undefined, prompt: string, raw: string) {
  const body: Record<string, unknown> = {
    model, max_completion_tokens: 8000,
    response_format: { type: "json_schema", json_schema: { name: ext.schemaName, strict: true, schema: ext.jsonSchema } },
    messages: [{ role: "system", content: prompt }, { role: "user", content: `Ditado do médico:\n${raw}` }],
  };
  if (reasoning) body.reasoning_effort = reasoning; else body.temperature = 0;
  const res = await client.chat.completions.create(body as never);
  const f = JSON.parse((res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}");
  return `${f.ig_semanas ?? "null"}s${f.ig_dias ?? 0}d`;
}

(async () => {
  console.log("caso | mini(base) | nano(base) | nano(reforço-ig)");
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!.raw_input;
    const mini = await extract("gpt-4.1-mini", undefined, ext.prompt, r);
    const nanoB = await extract("gpt-5-nano", "minimal", ext.prompt, r);
    const nanoR = await extract("gpt-5-nano", "minimal", ext.prompt + REFORCO, r);
    const flag = nanoR === mini ? "" : "  <-- diverge";
    console.log(`  ${i + 1}  |   ${mini.padEnd(7)} |   ${nanoB.padEnd(7)} |   ${nanoR.padEnd(7)}${flag}`);
  }
  console.log("✓ diagnóstico concluído");
})().catch((e) => { console.error(e); process.exit(1); });
