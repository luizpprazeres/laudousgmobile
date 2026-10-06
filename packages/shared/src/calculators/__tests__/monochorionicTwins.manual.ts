import assert from "node:assert/strict";
import {
  discordanciaGemelar,
  percentilCaGemelar,
  percentilNormalBarcelona,
  percentilPesoGemelarMonocorionico,
  psvAcmMomGemelar,
} from "../monochorionicTwins";

assert.equal(Math.round(percentilNormalBarcelona(0)), 50);
assert.equal(Math.round(percentilNormalBarcelona(1.6448536)), 95);
assert.equal(Math.round(percentilNormalBarcelona(-1.6448536)), 5);

const pesoFeminino = percentilPesoGemelarMonocorionico({
  semanas: 32, dias: 0, sexo: "feminino", pesoG: 1700,
});
assert.equal(pesoFeminino.percentil, 36);
assert.ok(Math.abs(pesoFeminino.esperado - 1777.549) < 0.001);

const pesoMasculino = percentilPesoGemelarMonocorionico({
  semanas: 32, dias: 0, sexo: "masculino", pesoG: 1700,
});
assert.equal(pesoMasculino.percentil, 30);
assert.ok(Math.abs(pesoMasculino.esperado - 1816.117) < 0.001);

const ca = percentilCaGemelar({ semanas: 20, dias: 0, caMm: 149.08 });
assert.equal(ca.percentil, 50);
assert.ok(Math.abs(ca.esperado - 149.08) < 0.001);

assert.equal(discordanciaGemelar(2000, 1600), 20);
assert.equal(discordanciaGemelar(2250, 2400), 6.3);

const psv = psvAcmMomGemelar({ semanas: 30, dias: 0, psvCmS: 60 });
assert.ok(Math.abs(psv.esperadoCmS - 40.044846) < 0.000001);
assert.ok(Math.abs(psv.mom - 1.49832) < 0.00001);

assert.throws(
  () => percentilPesoGemelarMonocorionico({ semanas: 23, dias: 6, sexo: "feminino", pesoG: 600 }),
  /24 e 40 semanas/,
);
assert.throws(() => percentilCaGemelar({ semanas: 24, dias: 0, caMm: 200 }), /14 e 23 semanas/);
assert.throws(() => discordanciaGemelar(0, 1000), /positivo/);

console.log("✓ Calculadora gemelar Barcelona: fórmulas, limites e discordância aprovados");
