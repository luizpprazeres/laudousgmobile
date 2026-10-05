import assert from "node:assert/strict";
import { CLINICAL_MODEL_CODES } from "@laudousg/shared";
import { CATEGORIES_SEED } from "../data";

const expectedLabels = new Map<string, string>([
  ["ABDOMEN_TOTAL_DOPPLER", "Abdome Total c/ Doppler"],
  ["DOPPLER_HEPATICO", "Doppler hepático"],
  ["DOPPLER_VENOSO_MMSS", "Doppler Venoso MMSS"],
  ["DOPPLER_ARTERIAL_MMSS", "Doppler Arterial MMSS"],
  ["TORAX", "Tórax"],
  ["QUADRIL_INFANTIL", "Quadril Infantil"],
]);

assert.deepEqual(new Set(expectedLabels.keys()), new Set(CLINICAL_MODEL_CODES));

for (const code of CLINICAL_MODEL_CODES) {
  const rows = CATEGORIES_SEED.filter((row) => row.code === code);
  assert.equal(rows.length, 1, `${code}: deve existir uma única vez no seed`);
  assert.equal(rows[0]?.label, expectedLabels.get(code), `${code}: label divergente`);
  assert.equal(rows[0]?.active, true, `${code}: deve estar ativo no catálogo`);
}

console.log(`✓ seed dos ${CLINICAL_MODEL_CODES.length} modelos está em paridade com @laudousg/shared`);
