import assert from "node:assert/strict";
import { categoryDisplayLabel } from "../categoryPresentation";

assert.equal(categoryDisplayLabel("PAREDE_ABDOMINAL"), "Parede abdominal");
assert.equal(categoryDisplayLabel("DOPPLER_VENOSO_MMSS"), "Doppler venoso de membros superiores");
assert.equal(
  categoryDisplayLabel("ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA"),
  "Abdome total + Próstata suprapúbica",
);
assert.equal(categoryDisplayLabel("NOVA_CATEGORIA_MMII"), "Nova categoria MMII");
assert.equal(categoryDisplayLabel(null), "Categoria não informada");

console.log("categoryPresentation: 5/5");
