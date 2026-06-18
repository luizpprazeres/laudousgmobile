/**
 * PROTÓTIPO — streaming da extração (ganho de UX #1: matar a tela muda).
 * Em vez de esperar o JSON inteiro (~5s em silêncio), STREAMA a extração e
 * mede: time-to-first-token (quando dá pra mostrar algo) + quando cada achado
 * fica disponível. Prova que o app pode mostrar progresso real desde ~1s.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/streaming-extraction-proto.manual.ts
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { EXTRACTORS } from "../extraction";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ext = EXTRACTORS.OBSTETRICA!;
const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];
const raw = rows[2]!.raw_input; // caso 3 (divergente, com 1ª US)

// Marcos legíveis: quando um campo aparece no JSON parcial, vira um "progresso".
const MARCOS: { re: RegExp; label: string }[] = [
  { re: /"bcf_bpm"\s*:/, label: "batimentos" },
  { re: /"cf_mm"\s*:/, label: "biometria fetal" },
  { re: /"peso_g"\s*:\s*\d/, label: "peso fetal" },
  { re: /"ig_semanas"\s*:\s*\d/, label: "idade gestacional" },
  { re: /"primeira_us_data"\s*:\s*"/, label: "1ª ultrassonografia" },
  { re: /"referencia_fonte"\s*:/, label: "fonte da correção" },
];

const run = async () => {
  console.log(`Ditado (caso 3, ${raw.length} chars). Streaming gpt-4.1-mini…\n`);
  const t0 = Date.now();
  let ttft = 0;
  let acc = "";
  const vistos = new Set<string>();

  const stream = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    max_tokens: 8000,
    stream: true,
    response_format: {
      type: "json_schema",
      json_schema: { name: ext.schemaName, strict: true, schema: ext.jsonSchema },
    },
    messages: [
      { role: "system", content: ext.prompt },
      { role: "user", content: `Ditado do médico:\n${raw}` },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;
    if (ttft === 0) {
      ttft = Date.now() - t0;
      console.log(`  ⏱  ${String(ttft).padStart(5)}ms  → 1º token (já dá pra mostrar "interpretando…")`);
    }
    acc += delta;
    for (const m of MARCOS) {
      if (!vistos.has(m.label) && m.re.test(acc)) {
        vistos.add(m.label);
        console.log(`  ✓  ${String(Date.now() - t0).padStart(5)}ms  → ${m.label}`);
      }
    }
  }
  const total = Date.now() - t0;
  console.log(`\n  Total da extração: ${total}ms`);
  console.log(`  Hoje (sem streaming): tela MUDA por ${total}ms, laudo aparece só no fim.`);
  console.log(`  Com streaming: 1º feedback em ${ttft}ms; achados visíveis progressivamente.`);
};

run().then(() => console.log("\n✓ protótipo concluído")).catch((e) => { console.error(e); process.exit(1); });
