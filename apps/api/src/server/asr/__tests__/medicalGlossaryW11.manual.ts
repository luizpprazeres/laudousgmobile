/**
 * W11 — ajuste de keyterms pela grafia assinada: desligado por padrão, dentro do orçamento,
 * fallback ALL intacto. Rodar: pnpm exec tsx src/server/asr/__tests__/medicalGlossaryW11.manual.ts
 */
import assert from "node:assert/strict";
import {
  ALL_MEDICAL_ASR_KEYTERMS, KEYTERM_WORD_BUDGET, keytermWordCount, keytermsW11Ativo,
  medicalAsrKeytermsForCategory, medicalAsrKeytermsW11,
} from "../medicalGlossary";

const CATS = ["MAMARIA", "MUSCULOESQUELETICO_V2", "MUSCULOESQUELETICO", "ABDOMEN_TOTAL", "VIAS_URINARIAS", "TIREOIDE",
  "OBSTETRICA", "DOPPLER_OBSTETRICO", "PELVE_FEMININA", "DOPPLER_RENAL", "PARTES_MOLES", "ESCROTAL", "DOPPLER_CAROTIDAS"];
let ok = 0;
// padrão: desligado
assert.equal(keytermsW11Ativo("MAMARIA", undefined), false); ok++;
assert.equal(keytermsW11Ativo("MAMARIA", ""), false); ok++;
assert.equal(keytermsW11Ativo("MAMARIA", "mamaria"), true); ok++;
assert.equal(keytermsW11Ativo("TIREOIDE", "MAMARIA"), false); ok++;
assert.equal(keytermsW11Ativo(null, "*"), false, "sem categoria nunca usa o ajuste (fallback ALL intacto)"); ok++;
for (const c of CATS) {
  const w = medicalAsrKeytermsW11(c);
  assert.ok(keytermWordCount(w) <= KEYTERM_WORD_BUDGET, `${c}: ${keytermWordCount(w)} palavras`); ok++;
  assert.equal(new Set(w).size, w.length, `${c}: sem duplicata`); ok++;
  for (const proibido of ["supraespinal", "supraespinhoso", "infraespinal", "subdeltóidea", "córtico-medular"]) assert.ok(!w.includes(proibido), `${c}: ${proibido}`);
  ok++;
  // nada que estava na lista some além das trocas declaradas
  const antes = medicalAsrKeytermsForCategory(c).filter((t) => !["supraespinal", "supraespinhoso", "infraespinal", "subdeltóidea", "córtico-medular"].includes(t));
  for (const t of antes) assert.ok(w.includes(t), `${c}: perdeu ${t}`);
  ok++;
}
assert.ok(medicalAsrKeytermsW11("MAMARIA").includes("superolateral")); ok++;
assert.ok(medicalAsrKeytermsW11("MUSCULOESQUELETICO_V2").includes("supraespinhal")); ok++;
assert.ok(medicalAsrKeytermsW11("MUSCULOESQUELETICO_V2").includes("subdeltoidea")); ok++;
// fallback continua no teto e igual
assert.ok(keytermWordCount(ALL_MEDICAL_ASR_KEYTERMS) <= KEYTERM_WORD_BUDGET); ok++;
assert.ok(ALL_MEDICAL_ASR_KEYTERMS.includes("subdeltóidea"), "fallback ALL não é tocado pela W11"); ok++;
console.log(`keyterms W11: ${ok} verificações passaram. Palavras por categoria (antes → W11): ` +
  CATS.map((c) => `${c} ${keytermWordCount(medicalAsrKeytermsForCategory(c))}→${keytermWordCount(medicalAsrKeytermsW11(c))}`).join(", "));
