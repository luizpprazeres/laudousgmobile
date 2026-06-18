/**
 * Testa gpt-5-nano/minimal na EXTRAÇÃO com prompt REFORÇADO, p/ fechar o gap de
 * precisão (5/6 → 6/6) sem reasoning. Compara baseline vs reforçado, por caso.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/gpt5nano-accuracy.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { EXTRACTORS } from "../extraction";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ext = EXTRACTORS.OBSTETRICA!;
const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];

const REFORCO =
  "\n\nATENÇÃO (não esqueça): se o ditado mencionar 'primeira ultrassonografia/USG/1ª US realizada em DATA com X semanas', PREENCHA primeira_us_data, primeira_us_ig_semanas/dias e referencia_fonte='usg_precoce'. Se mencionar 'hoje com Y semanas', preencha ig_referencia_hoje_semanas/dias. NUNCA deixe esses campos null quando a 1ª US foi dita.";

async function extract(prompt: string, raw: string) {
  const t0 = Date.now();
  const res = await client.chat.completions.create({
    model: "gpt-5-nano",
    reasoning_effort: "minimal",
    max_completion_tokens: 8000,
    response_format: { type: "json_schema", json_schema: { name: ext.schemaName, strict: true, schema: ext.jsonSchema } },
    messages: [{ role: "system", content: prompt }, { role: "user", content: `Ditado do médico:\n${raw}` }],
  } as never);
  const ms = Date.now() - t0;
  const f = JSON.parse((res as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "{}");
  return { ms, f };
}

async function suite(nome: string, prompt: string) {
  let tot = 0, igOk = 0, usOk = 0;
  const falhas: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const { ms, f } = await extract(prompt, r.raw_input);
    tot += ms;
    const temUs = /ultrassonografia realizada|primeira u|1[ºª] ?ultra/i.test(r.raw_input);
    if (f.ig_semanas != null) igOk++;
    if (!temUs || f.primeira_us_data) usOk++; else falhas.push(`caso ${i + 1} não captou 1ªUS`);
  }
  console.log(`${nome.padEnd(20)} média ${Math.round(tot / rows.length)}ms | ig ${igOk}/6 | 1ªUS ${usOk}/6 ${falhas.length ? "| " + falhas.join("; ") : ""}`);
}

(async () => {
  await suite("baseline", ext.prompt);
  await suite("reforçado", ext.prompt + REFORCO);
  console.log("✓ teste gpt-5-nano concluído");
})().catch((e) => { console.error(e); process.exit(1); });
