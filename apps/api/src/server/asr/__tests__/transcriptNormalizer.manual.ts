import assert from "node:assert/strict";
import { normalizeMeasures } from "../../pipeline/measureNormalizer";
import { normalizeSpokenDates } from "../dateNormalizer";
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

const combined =
  "DUM dois de março de dois mil e vinte e seis. Cisto 0.5 por 0.6 por 0.6 cm.";
const normalized =
  "DUM 02/03/2026. Cisto 0,5 x 0,6 x 0,6 cm.";
assert.equal(normalizeAsrTranscript(combined), normalized);
assert.equal(normalizeAsrTranscript(normalized), normalized, "deve ser idempotente");

console.log("transcript normalizer: 16/16 PASS");
