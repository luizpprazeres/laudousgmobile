import assert from "node:assert/strict";

import { calcularHadlock, type BiometryInput, type PercentileSource } from "./hadlock";

const normal: BiometryInput = {
  dbp: 72,
  cc: 280,
  ca: 260,
  cf: 56,
  igWeeks: 30,
  igDays: 2,
  sex: "unisex",
};

function calcular(
  patch: Partial<BiometryInput> = {},
  source: PercentileSource = "intergrowth21st",
) {
  return calcularHadlock({ ...normal, ...patch }, "hadlock4_1985", source);
}

assert.equal(calcular()?.weightGrams, 1472);
assert.equal(calcular()?.percentileValue, 56);
assert.equal(calcular({}, "hadlock1991")?.weightGrams, 1472);
assert.equal(calcular({}, "hadlock1991")?.percentileValue, 24);

for (const [weeks, days, esperado] of [
  [21, 6, false],
  [22, 0, true],
  [39, 6, true],
  [40, 0, true],
  [40, 1, false],
] as const) {
  assert.equal(Boolean(calcular({ igWeeks: weeks, igDays: days })), esperado, `Intergrowth ${weeks}+${days}`);
}

for (const [weeks, days, esperado] of [
  [23, 6, false],
  [24, 0, true],
  [40, 6, true],
  [41, 0, true],
  [41, 1, false],
] as const) {
  assert.equal(Boolean(calcular({ igWeeks: weeks, igDays: days }, "hadlock1991")), esperado, `Hadlock ${weeks}+${days}`);
}

for (const patch of [
  { igWeeks: -1 },
  { igWeeks: 22.5 },
  { igWeeks: Number.NaN },
  { igDays: -1 },
  { igDays: 7 },
  { igDays: 2.5 },
] satisfies Array<Partial<BiometryInput>>) {
  assert.equal(calcular(patch), null, `IG inválida ${JSON.stringify(patch)}`);
}

const termoCm = calcular({ dbp: 9.2, cc: 33.5, ca: 35, cf: 7.2, igWeeks: 38, igDays: 0 });
const termoMm = calcular({ dbp: 92, cc: 335, ca: 350, cf: 72, igWeeks: 38, igDays: 0 });
assert.ok(termoCm);
assert.deepEqual(
  { peso: termoCm.weightGrams, percentil: termoCm.percentileValue },
  { peso: termoMm?.weightGrams, percentil: termoMm?.percentileValue },
);
assert.equal(termoCm.weightGrams, 3424);
assert.equal(termoCm.percentileValue, 85);

const femurCm = calcular({ cf: 1.2, igWeeks: 22, igDays: 0 });
const femurMm = calcular({ cf: 12, igWeeks: 22, igDays: 0 });
assert.deepEqual(
  { peso: femurCm?.weightGrams, percentil: femurCm?.percentileValue },
  { peso: femurMm?.weightGrams, percentil: femurMm?.percentileValue },
);

console.log("Hadlock mobile: domínio das curvas, unidade e regressão aprovados");
