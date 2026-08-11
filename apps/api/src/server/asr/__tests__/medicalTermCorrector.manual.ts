import assert from "node:assert/strict";
import { correctMedicalTerms } from "../medicalTermCorrector";

// ── 1. Erros REAIS observados no benchmark de 03/08 ──────────────────────────
const observados: Array<[string, string]> = [
  ["nódulo sólido hipoicoico no lobo direito", "nódulo sólido hipoecoico no lobo direito"],
  ["nódulo isoicoico no istmo", "nódulo isoecoico no istmo"],
  ["classificado como trads 3", "classificado como TI-RADS 3"],
  ["classificado como birads 3", "classificado como BI-RADS 3"],
  ["biometria compatível pela tabela de adlock", "biometria compatível pela tabela de Hadlock"],
  ["placenta grau dois de granum", "placenta grau dois de Grannum"],
  ["safeina magna com refluxo", "safena magna com refluxo"],
  ["região retroariolar", "região retroareolar"],
  ["dinopatia do supraespinal", "tendinopatia do supraespinal"],
  ["índice de líquido aniotico normal", "índice de líquido amniótico normal"],
  ["vesícula biliar com coleíase", "vesícula biliar com colelitíase"],
  ["fígado com estiaatose hepática", "fígado com esteatose hepática"],
  // Caso real relatado em 06/08: dois erros empilhados na mesma frase — a
  // grafia perdida ("boçao") e o artigo virado em dígito pelo `numerals=true`.
  ["1 maior boçao vertical de 4 cm", "o maior bolsão vertical de 4 cm"],
  ["maior bolção vertical", "maior bolsão vertical"],
  ["1 menor bolsão vertical", "o menor bolsão vertical"],
];
for (const [entrada, esperado] of observados) {
  assert.equal(correctMedicalTerms(entrada), esperado, `falhou: ${entrada}`);
}

// ── 2. Capitalização preservada no início da frase ───────────────────────────
assert.equal(
  correctMedicalTerms("Hipoicoico em relação ao parênquima."),
  "Hipoecoico em relação ao parênquima.",
);
// Acrônimo NUNCA vira minúscula, mesmo no meio da frase.
assert.equal(correctMedicalTerms("achado birads 2"), "achado BI-RADS 2");

// ── 3. Flexões ───────────────────────────────────────────────────────────────
assert.equal(correctMedicalTerms("lesões hipoicoicas"), "lesões hipoecoicas");
assert.equal(correctMedicalTerms("imagem anicoica"), "imagem anecoica");

// ── 4. NÃO PODE ESTRAGAR — o teste que protege o laudo ───────────────────────
// Texto já correto passa intacto.
const jaCorretos = [
  "nódulo hipoecoico com halo hiperecoico e centro anecoico",
  "classificado como BI-RADS 4A",
  "tireoidite crônica linfocítica de Hashimoto",
  "safena magna pérvia",
  "colelitíase sem colecistite",
  "tendinopatia do supraespinal com rotura parcial",
];
for (const t of jaCorretos) {
  assert.equal(correctMedicalTerms(t), t, `texto correto foi alterado: ${t}`);
}

// Termos legítimos que se PARECEM com os erros não podem ser tocados.
const naoTocar = [
  "espessamento do miométrio",              // NÃO virar "biometria"
  "miomatose uterina",
  "colestase intra-hepática",               // parecido com colelitíase
  "esteatose hepática",
  "cisto anecoico",
  "fáscia plantar espessada",
  "bursa subdeltóidea",
  "bolsa amniótica íntegra",                // "bolsa" ≠ "bolsão": não pode virar
  "maior bolsão vertical de 5,2 cm",        // já correto
  "1 cisto simples no rim direito",         // "1 " só cai quando é maior/menor
];
for (const t of naoTocar) {
  assert.equal(correctMedicalTerms(t), t, `termo legítimo alterado: ${t}`);
}

// ── 5. Idempotência — rodar duas vezes não muda nada ─────────────────────────
for (const [entrada] of observados) {
  const uma = correctMedicalTerms(entrada);
  assert.equal(correctMedicalTerms(uma), uma, `não idempotente: ${entrada}`);
}

console.log("medical term corrector: PASS");
