import assert from "node:assert/strict";
import { runRendererExtraction } from "../extraction";
import { requestedExamCategory } from "../../pipeline/requestedExam";
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { renderMorfologico, type MorfologicoFindings } from "../categories/MORFOLOGICO";

async function main() {
  const combinedCategory = requestedExamCategory("DOPPLER_OBSTETRICO", "combined")!;
  const combined = await runRendererExtraction({
    categoryCode: combinedCategory,
    dopplerMode: "combined",
    rawInput: "Gestação de 28 semanas. Feto em apresentação pélvica. DBP 70 mm, CC 250 mm, CA 230 mm, CF 50 mm. Placenta anterior. ILA 12 cm. IP umbilical 0,91 e IR umbilical 0,58.",
  });
  const obst = combined.findings as ObstetricaFindings;
  assert.equal(obst.fetos[0]?.dbp_mm, 70);
  assert.equal(obst.fetos[0]?.cf_mm, 50);
  assert.equal(obst.liquido_ila_cm, 12);
  assert.equal(obst.doppler?.ip_umbilical, 0.91);
  assert.equal(obst.doppler?.ir_umbilical, 0.58);
  const output = renderObstetrica(obst);
  assert.match(output, /COM DOPPLER/);
  assert.match(output, /70/);
  assert.match(output, /0,91/);
  console.log("combined extraction + rendering: passed");

  const morfo = await runRendererExtraction({
    categoryCode: requestedExamCategory("MORFOLOGICO")!,
    rawInput: "Morfológico do segundo trimestre com Doppler. 22 semanas. Fêmur 41 mm, tíbia 36 mm, fíbula 35 mm, úmero 39 mm, rádio 32 mm e ulna 34 mm. IP umbilical 0,91.",
  });
  const f = morfo.findings as MorfologicoFindings;
  for (const [key, value] of Object.entries({ femur_mm: 41, tibia_mm: 36, fibula_mm: 35, umero_mm: 39, radio_mm: 32, ulna_mm: 34 })) {
    assert.equal(f[key as keyof MorfologicoFindings], value, key);
  }
  const rendered = renderMorfologico(f);
  assert.match(rendered, /Comprimento da ulna direita de 34 mm/);
  assert.match(rendered, /Comprimento da ulna esquerda de 34 mm/);
  assert.match(rendered, /0,91/);
  console.log("morphologic long bones + Doppler extraction: passed");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Clinical extraction failed"); process.exitCode = 1; });
