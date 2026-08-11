import assert from "node:assert/strict";
import { normalizeMeasures } from "../../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "../dateNormalizer";
import { normalizeLanguageNumbers } from "../languageNumberNormalizer";
import { normalizeAsrTranscript } from "../transcriptNormalizer";

assert.equal(
  normalizeMeasures("Nódulo medindo 0.5 por 0.6 por 0.6 cm."),
  "Nódulo medindo 0,5 x 0,6 x 0,6 cm.",
);
assert.equal(
  normalizeMeasures("Versão 2.5, percentil 8.3 e idade 3.5."),
  "Versão 2.5, percentil 8.3 e idade 3.5.",
);
assert.equal(normalizeMeasures("Medindo 1.2 centímetros."), "Medindo 1,2 cm.");

assert.equal(
  normalizeSpokenDates("Exame em dois de março de dois mil e vinte e seis."),
  "Exame em 02/03/2026.",
);
assert.equal(
  normalizeSpokenDates("DUM zero dois barra zero três barra dois mil e vinte e seis."),
  "DUM 02/03/2026.",
);
assert.equal(normalizeSpokenDates("Data 2/3/2026."), "Data 02/03/2026.");
assert.equal(
  normalizeSpokenDates("Data 31 de fevereiro de dois mil e vinte e seis."),
  "Data 31 de fevereiro de dois mil e vinte e seis [REVISAR].",
);
assert.equal(
  normalizeSpokenDates(
    normalizeSpokenDates("Data 31 de fevereiro de dois mil e vinte e seis."),
  ),
  "Data 31 de fevereiro de dois mil e vinte e seis [REVISAR].",
);
// Forma mista (dia/mês já em dígito, preposição sobrevivente) — o caso real
// relatado em 06/08. Não é ambígua: reconstrói em vez de pedir revisão.
assert.equal(normalizeSpokenDates("DUM 25 do 02 de 2026."), "DUM 25/02/2026.");
assert.equal(normalizeSpokenDates("DUM 25 de 02 de 2026."), "DUM 25/02/2026.");
assert.equal(normalizeSpokenDates("DUM 5 do 2 de 2026."), "DUM 05/02/2026.");
assert.equal(
  normalizeSpokenDates("DUM vinte e cinco do 02 de 2026."),
  "DUM 25/02/2026.",
);
// Data impossível continua indo para revisão, não vira data inventada.
assert.equal(
  normalizeSpokenDates("DUM 31 do 02 de 2026."),
  "DUM 31 do 02 de 2026 [REVISAR].",
);
assert.equal(
  normalizeSpokenDates(normalizeSpokenDates("DUM 31 do 02 de 2026.")),
  "DUM 31 do 02 de 2026 [REVISAR].",
  "forma mista inválida deve ser idempotente",
);
// A regra nova NÃO pode roubar o garble da regra abaixo (ano partido em "e N").
assert.equal(
  normalizeSpokenDates("Data 2 do 3 de 2020 e 6."),
  "Data 2 do 3 de 2020 e 6 [REVISAR].",
);
assert.equal(
  normalizeSpokenDates("Data 2 de março de 2020 e 6."),
  "Data 2 de março de 2020 e 6 [REVISAR].",
);
assert.equal(
  normalizeSpokenDates("Controle em dois meses e três dias."),
  "Controle em dois meses e três dias.",
);
assert.equal(
  normalizeSpokenDates("Sem data definida e sem alterações."),
  "Sem data definida e sem alterações.",
);
assert.equal(
  normalizeAsrTranscript(
    "Sem trombose à esquerda. Nódulo 12,4 x 8,2 mm à direita.",
  ),
  "Sem trombose à esquerda. Nódulo 12,4 x 8,2 mm à direita.",
);

assert.equal(
  normalizeLanguageNumbers("Acrescente 1 frase e remova 2 linhas."),
  "Acrescente uma frase e remova duas linhas.",
);
assert.equal(normalizeLanguageNumbers("Escreva 3 itens."), "Escreva três itens.");
assert.equal(normalizeLanguageNumbers("Coloque na 2 linha."), "Coloque na segunda linha.");
assert.equal(
  normalizeLanguageNumbers("Primeira ultrassonografia registrada como 1ª ultrassonografia."),
  "Primeira ultrassonografia registrada como primeira ultrassonografia.",
);
assert.equal(
  normalizeLanguageNumbers("1º item, 2ª linha, 3º ponto e 10ª palavra."),
  "primeiro item, segunda linha, terceiro ponto e décima palavra.",
);
assert.equal(
  normalizeLanguageNumbers("1,5 cm; rim 1; nódulo 2; 2 por 3 cm."),
  "1,5 cm; rim 1; nódulo 2; 2 por 3 cm.",
);
assert.equal(
  normalizeAsrTranscript("Acrescente 1 frase. Nódulo 1.5 por 2 por 3 cm."),
  "Acrescente uma frase. Nódulo 1,5 x 2 x 3 cm.",
);
assert.equal(
  normalizeLanguageNumbers("Valor de 1 ponto 5 cm."),
  "Valor de 1 ponto 5 cm.",
);
assert.equal(
  normalizeLanguageNumbers("Acrescente 2. Coloque 1 cm e remova 3 x 4 mm."),
  "Acrescente dois. Coloque 1 cm e remova 3 x 4 mm.",
);
assert.equal(
  normalizeLanguageNumbers("Temperatura de referência 1ºC."),
  "Temperatura de referência 1ºC.",
);

const combined =
  "DUM dois de março de dois mil e vinte e seis. Cisto 0.5 por 0.6 por 0.6 cm.";
const normalized =
  "DUM 02/03/2026. Cisto 0,5 x 0,6 x 0,6 cm.";
assert.equal(normalizeAsrTranscript(combined), normalized);
assert.equal(normalizeAsrTranscript(normalized), normalized, "deve ser idempotente");

console.log("transcript normalizer: 26/26 PASS");
