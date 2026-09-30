import assert from "node:assert/strict";
import { test } from "node:test";
import { CATS } from "../../ui/tokens";

const EXPECTED = [
  "ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR", "PAREDE_ABDOMINAL", "VIAS_URINARIAS",
  "PROSTATA_SUPRAPUBICA", "PROSTATA_TRANSRETAL", "ESCROTAL", "REGIAO_INGUINAL",
  "DOPPLER_RENAL", "DOPPLER_CAROTIDAS", "DOPPLER_VENOSO_MMII",
  "DOPPLER_VENOSO_MMII_MEDIDAS", "DOPPLER_ARTERIAL_MMII", "DOPPLER_FISTULA_AV",
  "TIREOIDE", "PARATIREOIDE", "CERVICAL", "GLANDULAS_SALIVARES",
  "PARTES_MOLES", "MAMARIA", "PELVE_FEMININA", "OBSTETRICA",
  "DOPPLER_OBSTETRICO", "MORFOLOGICO", "CERVICOMETRIA",
  "MUSCULOESQUELETICO_V2", "TRANSFONTANELA", "OCULAR", "LIVRE",
];

test("seletor Android cobre exatamente categorias clinicamente liberadas", () => {
  const actual = CATS.map((category) => category.id);
  assert.deepEqual([...actual].sort(), [...EXPECTED].sort());
  assert.equal(new Set(actual).size, actual.length);
  assert.equal(actual[0], "ABDOMEN_TOTAL"); // categoria inicial atual
  for (const category of CATS) {
    assert.ok(category.label.trim(), `sem rotulo: ${category.id}`);
    assert.ok(category.sub.trim(), `sem subtitulo: ${category.id}`);
  }
});
