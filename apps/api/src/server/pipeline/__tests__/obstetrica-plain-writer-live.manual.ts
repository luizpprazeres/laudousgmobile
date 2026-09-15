import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadDeterministicBundle } from "../bundleLoader";
import { runWriterStream } from "../writer";
import { obstetricaPlainConflictWarning, obstetricaPlainOutputWarning } from "../../prompts/obstetricaPlainPolicy";

// Synthetic data only. Reads validated bundles; calls the writer, never /generate.
const PLAIN_MODEL = process.env.PLAIN_MODEL ?? "gpt-5.4-mini";
const PLAIN_REASONING = process.env.PLAIN_REASONING ?? "none";
const SUFFIX = process.env.PLAIN_MODEL ? `-${PLAIN_MODEL}` : "";
const base = "34 semanas e 2 dias. Feto único cefálico, dorso à esquerda. BCF 145 bpm. DBP 84 mm, CC 320 mm, CA 293 mm, CF 65 mm. Peso 2300 g, variação 320 g. Placenta posterior homogênea. Maior bolsão vertical 5 cm.";
const cases = [
  { name: "indices-residuais", raw: `${base} IP uterina direita 0,44, IP esquerda 0,74, IP umbilical 0,92, IP cerebral média 1,32, IR ducto venoso 0,38.`, extra: /placenta[^\n]*posterior/i },
  { name: "vascular-alterado-e-patologia-obstetrica", raw: `${base} Doppler umbilical com diástole ausente. Pelve renal fetal esquerda dilatada, medindo 8 mm. Na conclusão, pieloectasia renal esquerda.`, extra: /(?:pelve renal|pieloectasia)[^\n]*esquerd/i },
  { name: "pedido-residual-e-negacao", raw: `${base} Sem dilatação das pelves renais. Acrescente Doppler com IP umbilical 0,92 e cerebral média 1,32.`, extra: /(?:sem|não|ausência|normais|normal)[^\n]*(?:dilata|pelves|rins)|(?:rins|pelves)[^\n]*(?:normais|sem|não|ausência)/i },
];
const legitimateCases = [
  { name: "plain-variação-renal-negacao", raw: `${base} Pelve renal fetal esquerda dilatada, medindo 8 mm. Pelve renal direita sem dilatação. Na conclusão, pieloectasia renal esquerda.`, extra: /(?:pelve renal|pieloectasia)[^\n]*esquerd/i },
];

async function main() {
  const records: unknown[] = [];
  const failures: string[] = [];
  const control = process.env.PLAIN_CONTROL === "1";
  const replay = process.env.PLAIN_REPLAY_FILE
    ? JSON.parse(readFileSync(process.env.PLAIN_REPLAY_FILE, "utf8")).records as Array<{ style: string; scenario: string; path: string; output: string }>
    : undefined;
  const legitimate = process.env.LEGITIMATE_PLAIN !== "0" && !control && !replay;
  let count = 0;
  for (const [style, id] of [["CLASSICO_COMPLETO", "11111111-1111-4111-8111-111111111111"], ["OBJETIVO", "44444444-4444-4444-8444-444444444444"]] as const) {
    const bundle = await loadDeterministicBundle({ categoryCode: "OBSTETRICA", writingStyleId: id, rawInput: base });
    assert.equal(bundle.error, null);
    const originalBlocks = JSON.stringify(bundle.blocks);
    for (const scenario of legitimate ? legitimateCases : cases) {
      for (const path of legitimate ? ["primary-raw"] as const : ["primary-raw", "fallback-raw", "primary-structured"] as const) {
        if (process.env.LIVE_CASE_LIMIT && count >= Number(process.env.LIVE_CASE_LIMIT)) break;
        const generator = runWriterStream({
          categoryCode: "OBSTETRICA", categoryLabel: "Obstétrica", includeDoppler: control ? undefined : false,
          writingStyleCode: style, ragBlocks: bundle.blocks,
          rawUserMessage: path === "primary-structured" ? undefined : scenario.raw,
          sourceTranscript: scenario.raw,
          findings: { schema_version: "v1", categoria_detectada: "OBSTETRICA", tipo_exame: "Obstétrica",
            achados: { texto: scenario.raw }, comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta" },
          modelConfig: { provider: "openai", model: PLAIN_MODEL, reasoningEffort: PLAIN_REASONING, credentialRef: "default" },
          signal: AbortSignal.timeout(90000),
        });
        let output = "";
        let systemMessage = "";
        if (replay) {
          output = replay.find(r => r.style === style && r.scenario === scenario.name && r.path === path)!.output;
        } else {
          for (;;) { const next = await generator.next(); if (next.done) { output = next.value.fullText; systemMessage = next.value.systemMessage; break; } }
        }
        let error: string | undefined;
        try {
          assert.match(output.trim(), /^ULTRASSONOGRAFIA OBSTÉTRICA\s*\n/);
          assert.doesNotMatch(output, /dopplervelocimetr|COM DOPPLER|artérias? uterinas?|umbilical|cerebral média|ducto venoso|\b(?:IP|IR|RCP)\b|diástole ausente|centraliza|perfil hemodinâmico|normalidade vascular/i);
          for (const value of [84, 320, 293, 65]) assert.match(output, new RegExp(`${value}(?:,0)?\\s*mm`));
          assert.match(output, /2[.]?300\s*(?:g|gramas)/);
          assert.match(output, /320\s*(?:g|gramas)/);
          assert.match(output, /placenta[^\n]*posterior/i);
          assert.match(output, /(?:bolsão|MBV)[^\n]*5(?:,0)?\s*cm/i);
          assert.match(output, scenario.extra);
          if (legitimate) {
            assert.equal(obstetricaPlainConflictWarning("OBSTETRICA", scenario.raw), undefined);
            assert.equal(obstetricaPlainOutputWarning("OBSTETRICA", output), undefined);
            assert.match(output, /8(?:,0)?\s*mm/);
            assert.match(output, /(?:direit[^\n]*(?:sem dilatação|não dilatada)|(?:sem dilatação|não dilatada)[^\n]*direit)/i);
          }
          if (scenario.name.includes("patologia")) assert.match(output, /8(?:,0)?\s*mm/);
          assert.equal(JSON.stringify(bundle.blocks), originalBlocks, "original bundle unchanged");
          for (const model of bundle.blocks.filter(b => b.kind === "modelo")) {
            if (!replay && style === "CLASSICO_COMPLETO") assert.ok(systemMessage.includes(model.content), "original template must be intact");
          }
          if (!legitimate) assert.ok(obstetricaPlainConflictWarning("OBSTETRICA", scenario.raw));
        } catch (e) { error = (e as Error).message; failures.push(`${style}/${scenario.name}/${path}: ${error}`); }
        records.push({ style, scenario: scenario.name, path, control, raw: scenario.raw, output, error, outputWarning: obstetricaPlainOutputWarning("OBSTETRICA", output), modelIds: bundle.blocks.filter(b => b.kind === "modelo").map(b => b.id) });
        count++;
        console.log(`${error ? "FAIL" : "PASS"} ${style}/${scenario.name}/${path}`);
      }
    }
  }
  const directory = resolve("tmp-review");
  mkdirSync(directory, { recursive: true });
  const file = resolve(directory, (legitimate ? "obstetrica-legitimate-plain-live" : replay ? "obstetrica-plain-writer-recheck" : control ? "obstetrica-plain-writer-control" : "obstetrica-plain-writer-live") + SUFFIX + ".json");
  writeFileSync(file, JSON.stringify({ model: PLAIN_MODEL, reasoningEffort: PLAIN_REASONING, records }, null, 2));
  console.log(`${count - failures.length}/${count} passed; evidence: ${file}`);
  assert.equal(failures.length, 0, failures.join("\n"));
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
