import assert from "node:assert/strict";
import { loadDeterministicBundle } from "../bundleLoader";
import { runWriterStream } from "../writer";

// Casos ficticios: nao copiar medidas corrigidas de um paciente para outro.
const cases = [
  { variant: "1t", title: /PRIMEIRO TRIMESTRE/i,
    raw: "Morfológico do primeiro trimestre. 12 semanas e 4 dias. CCN 63 mm, TN 1,4 mm. BCF 155 bpm. Osso nasal presente. Ducto venoso normal.",
    checks: [/63(?:,0)?\s*mm/, /1,4\s*mm/] },
  { variant: "2t", title: /SEGUNDO TRIMESTRE COM CERVICOMETRIA TRANSVAGINAL/i,
    raw: "Morfológico do segundo trimestre com cervicometria transvaginal. Primeira USG com 7 semanas. Hoje 22 semanas e 2 dias. DBP 53 mm, CC 195 mm, CA 174 mm, fêmur 36 mm, tíbia 33 mm, fíbula 32 mm, úmero 35 mm, rádio 30 mm, ulna 31 mm. Peso 470 g, variação 68 g, percentil 46,81. Colo 3,2 cm, orifício interno fechado. Colo uterino ecograficamente normal. Maior bolsão vertical 5,2 cm.",
    checks: [/46,81/, /fêmur direito[^\n]*36/i, /fêmur esquerdo[^\n]*36/i, /anatomia fetal/i, /biometria fetal/i, /extra.fetal/i, /colo[^\n]*3,2\s*cm/i] },
  { variant: "3t", title: /TERCEIRO TRIMESTRE/i,
    raw: "Morfológico do terceiro trimestre com Doppler. Primeira USG com CCN 60 mm. Hoje 32 semanas e 3 dias. Fêmur 62 mm, tíbia 55 mm, fíbula 54 mm, úmero 57 mm, rádio 48 mm, ulna 51 mm. IP umbilical 0,91, IP cerebral média 1,72. ILA 11,3 cm.",
    checks: [/0,91/, /1,72/, /11,3\s*cm/] },
];

async function main() {
  for (const c of cases) {
    const bundle = await loadDeterministicBundle({ categoryCode: "MORFOLOGICO", writingStyleId: "11111111-1111-4111-8111-111111111111", rawInput: c.raw });
    assert.equal(bundle.error, null);
    assert.equal(bundle.variantKey, c.variant);
    const writer = runWriterStream({
      categoryCode: "MORFOLOGICO", categoryLabel: "Morfológico", writingStyleCode: "CLASSICO_COMPLETO",
      rawUserMessage: c.raw, sourceTranscript: c.raw, ragBlocks: bundle.blocks,
      findings: { schema_version: "v1", categoria_detectada: "MORFOLOGICO", tipo_exame: "Morfológico", achados: {}, comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta" },
    });
    let output = "";
    for (;;) {
      const next = await writer.next();
      if (next.done) { output = next.value.fullText; break; }
    }
    assert.match(output, c.title);
    assert.match(output, /COMENTÁRIOS:/);
    assert.match(output, /OS SEGUINTES ASPECTOS FORAM OBSERVADOS:/);
    assert.match(output, /CONCLUSÃO:/);
    for (const check of c.checks) assert.match(output, check);
    assert.doesNotMatch(output, /\d{2}\/\d{2}\/\d{4}/, "nenhuma data foi informada nestes casos");
    assert.doesNotMatch(output, /(?:apresentação|dorso|polo cefálico)[^\n]*_{3,}/i);
    const conclusion = output.split("CONCLUSÃO:")[1] ?? "";
    assert.doesNotMatch(conclusion, /^\s*\d+[).]\s*Cervicometria transvaginal\.?\s*$/im);
    console.log(`${c.variant}: template, medidas e complemento preservados`);
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
