import assert from "node:assert/strict";
import {
  ALL_MEDICAL_ASR_KEYTERMS,
  KEYTERM_WORD_BUDGET,
  keytermWordCount,
  medicalAsrKeytermsForCategory,
} from "../medicalGlossary";

/// Categorias com teto prático de contagem de termos (não de palavras).
const EXPECTED_MAX = {
  TIREOIDE: 55, MAMARIA: 55, ABDOMEN_TOTAL: 55, OBSTETRICA: 55,
  DOPPLER_VENOSO_MMII: 55, MUSCULOESQUELETICO_V2: 55, PELVE_FEMININA: 55,
} as const;

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
for (const [cat, max] of Object.entries(EXPECTED_MAX)) {
  const n = medicalAsrKeytermsForCategory(cat).length;
  assert.ok(n <= max, `${cat} tem ${n} keyterms — acima do teto prático de ${max}`);
}

// ── O teste que impede a regressão de 06/08 ──────────────────────────────────
// O Deepgram rejeita a requisição INTEIRA com HTTP 400 quando a lista estoura:
//   "Keyterm limit exceeded. The maximum number of tokens across all keyterms
//    is 500."
// E o cliente iOS, ao ver a conexão com keyterms falhar, reconecta SEM eles.
// Resultado: nenhum erro visível e o ditado despenca de ~85% para ~66% de
// acerto de termo. Medido contra a API em 06/08: 137 palavras passam, 138 dão
// 400. Foi assim que "maior bolsão vertical" (3 palavras) quebrou produção.
//
// Se este teste falhar, NÃO aumente o orçamento sem medir contra a API de novo:
// o limite real é em tokens de subpalavra, e palavras são só um proxy.
const allWords = keytermWordCount(ALL_MEDICAL_ASR_KEYTERMS);
assert.ok(
  allWords <= KEYTERM_WORD_BUDGET,
  `ALL_MEDICAL_ASR_KEYTERMS tem ${allWords} palavras — acima do orçamento de ` +
    `${KEYTERM_WORD_BUDGET}. O Deepgram vai devolver 400 e o cliente vai cair ` +
    `no fallback SEM keyterms, silenciosamente. Encurte termos ou remova algum.`,
);

// Toda lista efetivamente enviada precisa caber, não só o fallback.
for (const cat of [null, "CATEGORIA_DESCONHECIDA", ...Object.keys(EXPECTED_MAX)]) {
  const n = keytermWordCount(medicalAsrKeytermsForCategory(cat));
  assert.ok(
    n <= KEYTERM_WORD_BUDGET,
    `categoria ${cat} envia ${n} palavras — acima do orçamento`,
  );
}

console.log(
  `medical glossary: PASS (fallback ALL = ${allWords}/${KEYTERM_WORD_BUDGET} palavras, ` +
    `folga de ${KEYTERM_WORD_BUDGET - allWords})`,
);
