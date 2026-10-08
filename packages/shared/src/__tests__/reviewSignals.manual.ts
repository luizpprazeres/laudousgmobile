import assert from "node:assert/strict";
import { buildReviewSignals, stripAutomaticReviewMarkers } from "../reviewSignals";

const text = [
  "Rim direito medindo 123 cm.",
  "Bexiga com volume de ____ mL.",
  "Conclusão preservada.",
].join("\n");

const result = buildReviewSignals(text, [
  {
    type: "medida_divergente",
    severity: "warning",
    detail: "Magnitude improvável; confira a unidade.",
    trecho_laudo: "123 cm",
  },
  {
    type: "achado_omitido",
    severity: "critical",
    detail: "Achado citado no ditado não localizado no laudo.",
    trecho_laudo: null,
  },
]);

assert.deepEqual(result.highlights.map((item) => [item.kind, item.anchor]), [
  ["missing", "____"],
  ["warning", "123 cm"],
]);
assert.equal(result.notices.length, 1);
assert.ok(result.notices[0]);
assert.match(result.notices[0].message, /não localizado/);
const caseInsensitive = buildReviewSignals("Valor 123 CM.", [{ range: "123 cm", message: "Conferir" }]);
assert.ok(caseInsensitive.highlights[0]);
assert.equal(caseInsensitive.highlights[0].anchor, "123 CM");

const specificPlaceholder = buildReviewSignals("Bexiga com volume de ____ mL.", [
  {
    type: "placeholder_pendente",
    severity: "critical",
    detail: "Informe o volume vesical medido.",
    trecho_laudo: "____",
  },
]);
assert.equal(specificPlaceholder.highlights.length, 1);
assert.equal(specificPlaceholder.highlights[0]?.message, "Informe o volume vesical medido.");
assert.equal(stripAutomaticReviewMarkers("Texto [REVISAR — conferir]."), "Texto.");

console.log("reviewSignals.manual: ok");
