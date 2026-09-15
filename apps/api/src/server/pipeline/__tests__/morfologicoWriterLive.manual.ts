import assert from "node:assert/strict";
import { loadDeterministicBundle } from "../bundleLoader";
import { runWriterStream } from "../writer";

async function main() {
  const raw = "Morfológico do segundo trimestre com Doppler do ducto venoso. 22 semanas. Fêmur 41 mm, tíbia 36 mm, fíbula 35 mm, úmero 39 mm, rádio 32 mm, ulna 34 mm. IP ducto venoso 0,72. ILA 12 cm.";
  const bundle = await loadDeterministicBundle({categoryCode: "MORFOLOGICO", writingStyleId: "11111111-1111-4111-8111-111111111111", rawInput: raw});
  assert.equal(bundle.error, null);
  assert.equal(bundle.variantKey, "2t");
  const writer = runWriterStream({
    categoryCode: "MORFOLOGICO", categoryLabel: "Morfológico", writingStyleCode: "CLASSICO_COMPLETO",
    rawUserMessage: raw, sourceTranscript: raw, ragBlocks: bundle.blocks,
    findings: {schema_version: "v1", categoria_detectada: "MORFOLOGICO", tipo_exame: "Morfológico", achados: {}, comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta"},
  });
  let text = "";
  for (;;) {
    const next = await writer.next();
    if (next.done) { text = next.value.fullText; break; }
  }
  assert.match(text, /SEGUNDO TRIMESTRE/i);
  assert.doesNotMatch(text, /PRIMEIRO TRIMESTRE/i);
  for (const [bone, value] of [["fêmur",41],["tíbia",36],["fíbula",35],["úmero",39],["rádio",32],["ulna",34]] as const) {
    assert.match(text, new RegExp(`${bone}[^\\n]*${value}(?:,0)?\\s*mm`, "i"));
  }
  assert.match(text, /0,72/);
  console.log("production writer + database bundle: 2T and all six bones preserved with ductus Doppler");
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : "Writer test failed"); process.exit(1); });
