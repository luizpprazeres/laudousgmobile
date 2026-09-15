import assert from "node:assert/strict";
import { applyModeloVariantSelection } from "../bundleLoader";

const rows = ["1t", "2t", "3t"].map(variant => ({kind: "modelo", tags: [`variant:${variant}`]}));
const cases = [
  ["Morfológico do segundo trimestre. Primeira USG com 6 semanas e 5 dias. Hoje 24 semanas e 6 dias. CF 43,2 mm.", "2t"],
  ["Morfológico do terceiro trimestre. Primeira USG com CCN 64 mm. Hoje 32 semanas.", "3t"],
  ["Morfológico do segundo trimestre com Doppler do ducto venoso.", "2t"],
  ["Morfológico do terceiro trimestre, osso nasal presente e ducto venoso normal.", "3t"],
  ["Morfológico do primeiro trimestre, CCN 64 mm e ducto venoso normal.", "1t"],
  ["Morfológico, 22 semanas, DBP 54 mm, ducto venoso normal.", "2t"],
  ["Morfológico, 32 semanas, Doppler do ducto venoso.", "3t"],
  ["Morfológico, DBP 54 mm, osso nasal presente, ducto venoso normal.", "2t"],
  ["Morfológico, 14 semanas, TN 1,5 mm.", "1t"],
  ["Morfológico sem indicação de trimestre.", "2t"],
] as const;
let failures = 0;
for (const [raw, expected] of cases) {
  try {
    assert.equal(applyModeloVariantSelection(rows, "MORFOLOGICO", raw, null).variantKey, expected);
  } catch {
    failures++;
    console.error(`FAIL: ${raw} -> expected ${expected}`);
  }
}
assert.equal(failures, 0);
console.log(`morfologico bundle: ${cases.length} passed`);
