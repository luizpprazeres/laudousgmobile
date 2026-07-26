import assert from "node:assert/strict";
import {
  ALL_MEDICAL_ASR_KEYTERMS,
  medicalAsrKeytermsForCategory,
} from "../medicalGlossary";

const currentDeepgramTerms = [
  "Hadlock",
  "Intergrowth",
  "Gratacós",
  "BI-RADS",
  "TI-RADS",
  "O-RADS",
  "FIGO",
  "oligoâmnio",
  "polidrâmnio",
  "anecoico",
  "hipoecoico",
  "hiperecoico",
  "incisura",
  "ducto venoso",
  "artéria cerebral média",
  "translucência nucal",
  "pré-centralização",
  "leiomioma",
  "adenomiose",
  "endometrioma",
  "cisterna magna",
  "osso nasal",
];

for (const term of currentDeepgramTerms) {
  assert.ok(ALL_MEDICAL_ASR_KEYTERMS.includes(term), `termo atual removido: ${term}`);
}

const msk = medicalAsrKeytermsForCategory("MUSCULOESQUELETICO_V2");
for (const term of ["bursa", "subacromial", "subdeltóidea", "tendinopatia"]) {
  assert.ok(msk.includes(term), `termo MSK ausente: ${term}`);
}
assert.ok(!msk.includes("colédoco"), "categoria MSK recebeu glossário abdominal");

const vascular = medicalAsrKeytermsForCategory("DOPPLER_VENOSO_MMII");
assert.ok(vascular.includes("safena magna"));
assert.ok(vascular.includes("perfurante"));

assert.deepEqual(
  medicalAsrKeytermsForCategory(null),
  ALL_MEDICAL_ASR_KEYTERMS,
  "cliente legado sem categoria deve receber o glossário completo",
);
assert.deepEqual(
  medicalAsrKeytermsForCategory("CATEGORIA_DESCONHECIDA"),
  ALL_MEDICAL_ASR_KEYTERMS,
  "categoria desconhecida deve ter fallback aditivo",
);

console.log("medical glossary: PASS");
