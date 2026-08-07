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

// ── Foco por categoria (03/08) ────────────────────────────────────────────────
// Antes, TODA categoria carregava o bloco obstétrico inteiro. Num exame de
// tireoide isso são 20+ termos que só competem no decode e diluem o boost.
const tireoide = medicalAsrKeytermsForCategory("TIREOIDE");
for (const intruso of ["Hadlock", "Grannum", "oligoâmnio", "ducto venoso"]) {
  assert.ok(
    !tireoide.includes(intruso),
    `TIREOIDE ainda recebe termo obstétrico: ${intruso}`,
  );
}
for (const esperado of ["TI-RADS", "tireoidite", "Hashimoto", "istmo", "anecoico"]) {
  assert.ok(tireoide.includes(esperado), `TIREOIDE perdeu termo próprio: ${esperado}`);
}

// As categorias obstétricas passam a ter grupo próprio (antes caíam no fallback
// de glossário completo, porque nem existiam no mapa).
const obst = medicalAsrKeytermsForCategory("OBSTETRICA");
for (const esperado of ["Hadlock", "Grannum", "oligoâmnio", "biometria"]) {
  assert.ok(obst.includes(esperado), `OBSTETRICA perdeu termo próprio: ${esperado}`);
}
assert.ok(!obst.includes("bursa"), "OBSTETRICA recebeu glossário de MSK");
assert.ok(
  obst.length < ALL_MEDICAL_ASR_KEYTERMS.length,
  "OBSTETRICA ainda está caindo no fallback do glossário completo",
);

// A pelve ganha o bloco ginecológico, não o obstétrico.
const pelve = medicalAsrKeytermsForCategory("PELVE_FEMININA");
assert.ok(pelve.includes("leiomioma"));
assert.ok(pelve.includes("adenomiose"));
assert.ok(!pelve.includes("Hadlock"), "PELVE recebeu termo obstétrico");

// Classificações são universais — qualquer exame pode citar uma.
for (const cat of ["TIREOIDE", "MAMARIA", "ABDOMEN_TOTAL", "MUSCULOESQUELETICO_V2"]) {
  const terms = medicalAsrKeytermsForCategory(cat);
  assert.ok(terms.includes("BI-RADS"), `${cat} sem BI-RADS`);
  assert.ok(terms.includes("TI-RADS"), `${cat} sem TI-RADS`);
}

// Teto prático: listas focadas precisam continuar enxutas.
for (const cat of Object.keys({
  TIREOIDE: 1, MAMARIA: 1, ABDOMEN_TOTAL: 1, OBSTETRICA: 1,
  DOPPLER_VENOSO_MMII: 1, MUSCULOESQUELETICO_V2: 1, PELVE_FEMININA: 1,
})) {
  const n = medicalAsrKeytermsForCategory(cat).length;
  assert.ok(n <= 55, `${cat} tem ${n} keyterms — acima do teto prático de 55`);
}

console.log("medical glossary: PASS");
