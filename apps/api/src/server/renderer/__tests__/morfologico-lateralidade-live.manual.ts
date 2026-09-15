import assert from "node:assert/strict";
import { runRendererExtraction } from "../extraction";
import { MorfologicoFindingsSchema } from "../categories/MORFOLOGICO";

async function main() {
  const r = await runRendererExtraction({
    categoryCode: "MORFOLOGICO",
    rawInput: "Morfológico do segundo trimestre. 22 semanas. Fêmur direito 41 mm, fêmur esquerdo 39 mm. Tíbia esquerda 35 mm. Fíbula 34 mm, úmero 38 mm, rádio 31 mm, ulna 33 mm.",
  });
  const f = MorfologicoFindingsSchema.parse(r.findings);
  assert.equal(f.femur_dir_mm, 41);
  assert.equal(f.femur_esq_mm, 39);
  assert.equal(f.femur_mm, null);
  assert.equal(f.tibia_esq_mm, 35);
  assert.equal(f.tibia_dir_mm, null);
  assert.equal(f.tibia_mm, null);
  assert.equal(f.fibula_mm, 34);
  console.log("Live extraction: asymmetric femurs, unilateral tibia and generic fibula preserved");
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
