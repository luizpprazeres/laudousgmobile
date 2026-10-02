import assert from "node:assert/strict";
import { classifyAbdomenDopplerMentions, mentionsCurrentAbdomenTotalDoppler } from "../abdomenDopplerIntent";
import { structuredClinicalIntent } from "../fallbackPolicy";
import { resolveEffectiveCategory } from "../../pipeline/effectiveCategory";

const accepted = [
  "Ultrassonografia do abdome total com Doppler. Fígado normal.",
  "ULTRASSONOGRAFIA DO ABDÔMEN TOTAL COM DOPPLER COLORIDO",
  "Abdômen total com Doppler: veia porta pérvia.",
  "Abdómen total c/ Doppler",
  "abdomen total c/doppler",
  "ABDOME_TOTAL_DOPPLER",
  "Exame de abdome total com estudo Doppler",
  "Abdome total com Doppler sem alterações.",
  "Abdome total com Doppler: não há sinais de trombose portal.",
  "Abdome total com Doppler de controle.",
  "Em comparação com o exame anterior, abdome total com Doppler sem alterações.",
  "Abdome total com Doppler, comparativo com exame de 2024.",
  "Exame anterior de abdome total com Doppler normal. Hoje: abdome total com Doppler.",
  "Paciente sem queixas. Abdome total com Doppler.",
];
for (const text of accepted) {
  assert.equal(mentionsCurrentAbdomenTotalDoppler(text), true, `deve aceitar: ${text}`);
  assert.equal(structuredClinicalIntent(undefined, text), "ABDOMEN_TOTAL_DOPPLER", `intenção estruturada: ${text}`);
}

const negated = [
  "Não foi realizado abdome total com Doppler.",
  "Não é abdome total com Doppler, apenas abdome total.",
  "Sem abdome total com Doppler nesta data.",
  "Abdome total com Doppler não realizado.",
  "Abdômen total com Doppler: não foi possível realizar.",
  "Abdome total com Doppler, não solicitado.",
  "Abdome total com Doppler cancelado.",
  "Abdome total com Doppler — não.",
];
const prior = [
  "Exame anterior de abdome total com Doppler sem alterações. Hoje abdome total.",
  "US prévia de abdome total com Doppler normal.",
  "Comparado ao abdome total com Doppler de 2024.",
  "Em relação ao abdômen total com Doppler, houve melhora.",
  "Último abdome total com Doppler evidenciou trombose.",
  "Paciente traz abdome total com Doppler de outro serviço.",
  "Abdome total com Doppler anterior mostrava ascite.",
  "Abdome total com Doppler (prévio) normal.",
  "Abdome total com Doppler de outro serviço sem alterações.",
  "Abdome total com Doppler realizado há 3 meses.",
  "Abdome total com Doppler há 2 anos normal.",
];
for (const [texts, reason] of [[negated, "negated"], [prior, "prior_exam"]] as const) {
  for (const text of texts) {
    assert.equal(mentionsCurrentAbdomenTotalDoppler(text), false, `deve rejeitar (${reason}): ${text}`);
    assert.equal(structuredClinicalIntent(undefined, text), undefined, `sem intenção estruturada: ${text}`);
    assert.ok(classifyAbdomenDopplerMentions(text).every((mention) => mention.reason === reason), `motivo ${reason}: ${text}`);
  }
}

for (const text of ["Abdome total sem Doppler", "Avaliar Doppler da veia porta", "Abdome total. Doppler de carótidas.", "Abdome superior com Doppler"]) {
  assert.deepEqual(classifyAbdomenDopplerMentions(text), [], `sem título: ${text}`);
}

// A seleção explícita da categoria estruturada continua soberana sobre o texto.
assert.equal(structuredClinicalIntent("ABDOMEN_TOTAL_DOPPLER", "Não foi realizado abdome total com Doppler."), "ABDOMEN_TOTAL_DOPPLER");
assert.equal(structuredClinicalIntent("ABDOME_TOTAL_DOPPLER", ""), "ABDOMEN_TOTAL_DOPPLER");
// Seleção comum + título afirmativo sobe para o contrato; título negado/anterior não.
assert.equal(structuredClinicalIntent("ABDOMEN_TOTAL", "Abdômen total com Doppler."), "ABDOMEN_TOTAL_DOPPLER");
assert.equal(structuredClinicalIntent("ABDOMEN_TOTAL", "Exame anterior de abdome total com Doppler normal."), undefined);

const known = new Set(["ABDOMEN_TOTAL", "ABDOMEN_TOTAL_DOPPLER"]);
assert.equal(resolveEffectiveCategory("ABDOMEN_TOTAL", "Abdômen total com Doppler.", "t", known), "ABDOMEN_TOTAL_DOPPLER");
assert.equal(resolveEffectiveCategory("ABDOMEN_TOTAL", "Comparado ao abdome total com Doppler de 2024, fígado normal.", "t", known), "ABDOMEN_TOTAL");
assert.equal(resolveEffectiveCategory("ABDOMEN_TOTAL", "Abdome total com Doppler não realizado.", "t", known), "ABDOMEN_TOTAL");
// O palpite estruturado do structurer continua fechando o caminho.
assert.equal(resolveEffectiveCategory("ABDOMEN_TOTAL_DOPPLER", "Exame anterior de abdome total com Doppler.", "t", known), "ABDOMEN_TOTAL_DOPPLER");

console.log(`✓ detector abdome total com Doppler: ${accepted.length} aceitos, ${negated.length} negados, ${prior.length} anteriores`);
