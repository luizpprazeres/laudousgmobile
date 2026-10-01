import { strict as assert } from "node:assert";
import {
  ABDOMEN_TOTAL_DOPPLER_CONTRACT,
  DOPPLER_ARTERIAL_MMSS_CONTRACT,
  DOPPLER_VENOSO_MMSS_CONTRACT,
  QUADRIL_INFANTIL_CONTRACT,
  TORAX_CONTRACT,
} from "../CLINICAL_MODELS_V1";
import { CATEGORY_CONTRACTS } from "../index";

const expected = {
  ABDOMEN_TOTAL_DOPPLER: ABDOMEN_TOTAL_DOPPLER_CONTRACT,
  DOPPLER_VENOSO_MMSS: DOPPLER_VENOSO_MMSS_CONTRACT,
  DOPPLER_ARTERIAL_MMSS: DOPPLER_ARTERIAL_MMSS_CONTRACT,
  TORAX: TORAX_CONTRACT,
  QUADRIL_INFANTIL: QUADRIL_INFANTIL_CONTRACT,
} as const;

for (const [code, contract] of Object.entries(expected)) {
  assert.equal(CATEGORY_CONTRACTS[code], contract, `${code}: contrato não registrado`);
  assert.match(contract, /Nunca invente medida/iu, `${code}: guard anti-invenção ausente`);
}

assert.match(ABDOMEN_TOTAL_DOPPLER_CONTRACT, /abdome total completo/iu);
assert.match(DOPPLER_VENOSO_MMSS_CONTRACT, /competência não foi testada/iu);
assert.match(DOPPLER_ARTERIAL_MMSS_CONTRACT, /Percentual de estenose só entra/iu);
assert.match(TORAX_CONTRACT, /não inferir síndrome clínica automaticamente/iu);
assert.match(TORAX_CONTRACT, /20 × separação máxima/iu);
assert.match(TORAX_CONTRACT, /adulto sob ventilação mecânica/iu);
assert.match(TORAX_CONTRACT, /10\.1007\/s00134-005-0024-2/iu);
assert.match(QUADRIL_INFANTIL_CONTRACT, /bloqueiam a classificação/iu);

console.log("✓ 5 contratos clínicos aprovados e registrados");
