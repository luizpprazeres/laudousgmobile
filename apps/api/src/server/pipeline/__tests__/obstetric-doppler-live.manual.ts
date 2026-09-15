import assert from "node:assert/strict";
import { loadDeterministicBundle } from "../bundleLoader";
import { requestedExamCategory, resolveDopplerMode, resolveWriterExam } from "../requestedExam";
import { runWriterStream } from "../writer";

async function main() {
  for (const selected of [undefined, "isolated"] as const) {
    const mode = resolveDopplerMode("DOPPLER_OBSTETRICO", selected);
    const category = requestedExamCategory("DOPPLER_OBSTETRICO", selected)!;
    const exam = resolveWriterExam(category, mode);
    const bundle = await loadDeterministicBundle({ categoryCode: exam.categoryCode, writingStyleId: "11111111-1111-4111-8111-111111111111", rawInput: "34 semanas" });
    assert.equal(bundle.error, null);
    const raw = "34 semanas e 2 dias. DBP 84 mm, CC 320 mm, CA 293 mm, CF 65 mm. Peso 2300 g, variação 320 g. Placenta posterior homogênea. Maior bolsão vertical 5 cm. IP uterina direita 0,44, IP esquerda 0,74, IP umbilical 0,92, IP cerebral média 1,32, IR ducto venoso 0,38.";
    const writer = runWriterStream({ categoryCode: category, categoryLabel: "Obstétrica com Doppler", dopplerMode: mode,
      writingStyleCode: "CLASSICO_COMPLETO", ragBlocks: mode === "isolated" ? [] : bundle.blocks,
      rawUserMessage: raw, sourceTranscript: raw,
      findings: { schema_version: "v1", categoria_detectada: category, tipo_exame: "Obstétrica com Doppler", achados: {}, comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta" },
    });
    let output = "";
    for (;;) { const next = await writer.next(); if (next.done) { output = next.value.fullText; break; } }
    if (mode === "combined") {
      assert.match(output, /ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER/);
      assert.match(output, /84(?:,0)?\s*mm/);
      assert.match(output, /2300\s*g/);
      assert.match(output, /320\s*g/);
      assert.match(output, /placenta[^\n]*posterior/i);
    } else {
      assert.match(output, /DOPPLERVELOCIMETRIA OBSTÉTRICA/);
      assert.doesNotMatch(output, /biometria|placenta|peso|2300|84\s*mm/i);
    }
    assert.match(output, /0,92/);
    assert.match(output, /1,32/);
    assert.match(output, /(?:resistividade|IR)[^\n]*0,38/i);
    console.log(`${mode}: modelo e dados preservados com writer real`);
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
