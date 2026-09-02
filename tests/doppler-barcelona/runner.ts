import assert from "node:assert/strict";
import {
  calcularDopplerParcial,
  formatarBlocoDopplerParcial,
  zToBarcelonaDopplerPercentile,
} from "../../packages/shared/src/calculators/doppler";
import { dopplerDaTela } from "../../apps/web/src/lib/catalog/dopplerParaCatalogo";
import {
  renderDopplerModule,
  type DopplerObstetricoModule,
} from "../../apps/api/src/server/renderer/categories/dopplerObstetricoModule";

const uterinas14 = calcularDopplerParcial({
  weeks: 14,
  days: 0,
  ipUterinaDireita: 1.2,
  ipUterinaEsquerda: 1.4,
  ipUmbilical: 1,
});
assert.equal(uterinas14.arteriasUterinas?.ipMedio, 1.3);
assert.equal(uterinas14.arteriaUmbilical, undefined);

const uterinasMedia14 = calcularDopplerParcial({
  weeks: 14,
  days: 2,
  ipMedioUterinas: 1.2,
});
assert.ok(uterinasMedia14.arteriasUterinas, "IP médio informado diretamente deve gerar percentil");

const parcial22 = calcularDopplerParcial({ weeks: 22, days: 3, ipUmbilical: 1 });
assert.ok(parcial22.arteriaUmbilical);
assert.equal(parcial22.arteriaCerebralMedia, undefined);

const acmBaixa = calcularDopplerParcial({ weeks: 30, days: 0, ipMCA: 0.5 });
assert.ok((acmBaixa.arteriaCerebralMedia?.percentile ?? 100) < 5);
assert.equal(acmBaixa.arteriaCerebralMedia?.pathological, true);

// Limites literais do calc.js Barcelona: p5/p95 ainda são normais; p4/p96,
// respectivamente, cruzam o corte. Esta era a divergência de arredondamento.
assert.deepEqual(zToBarcelonaDopplerPercentile(1.645), { value: 95, label: "95" });
assert.deepEqual(zToBarcelonaDopplerPercentile(1.646), { value: 96, label: "96" });
assert.deepEqual(zToBarcelonaDopplerPercentile(-1.645), { value: 5, label: "5" });
assert.deepEqual(zToBarcelonaDopplerPercentile(-1.646), { value: 4, label: "4" });
assert.deepEqual(zToBarcelonaDopplerPercentile(2.6), { value: 100, label: ">99" });
assert.deepEqual(zToBarcelonaDopplerPercentile(-2.601), { value: 0, label: "<1" });

const dv30Medio = 0.903 - 0.0116 * 30;
const dv30 = calcularDopplerParcial({ weeks: 30, days: 0, ipDuctoVenoso: dv30Medio });
assert.equal(dv30.ductoVenoso?.percentileLabel, "50");
assert.equal(dv30.ductoVenoso?.pathological, false);
const dv30P96 = calcularDopplerParcial({
  weeks: 30,
  days: 0,
  ipDuctoVenoso: dv30Medio + 0.1483 * 1.646,
});
assert.equal(dv30P96.ductoVenoso?.percentileLabel, "96");
assert.equal(dv30P96.ductoVenoso?.pathological, true);

const estado = {
  ig: { bio_sem: "22", bio_dias: "3" },
  doppler: {
    realizado: "sim",
    "realizado.sim.ip_ut_dir": "1,20",
    "realizado.sim.ip_ut_esq": "1,40",
    "realizado.sim.ip_umb": "1,00",
    "realizado.sim.ip_acm": "1,50",
    "realizado.sim.ip_dv": "0,55",
    "realizado.sim.incisura": "ausente",
    "realizado.sim.centralizacao": "ausente",
    "realizado.sim.umbilical": "normal",
    "realizado.sim.acm": "normal",
  },
};
const adaptado = dopplerDaTela(estado);
assert.equal(adaptado?.ip_medio_uterinas, 1.3);
assert.equal(typeof adaptado?.perc_medio_uterinas, "number");
assert.equal(typeof adaptado?.perc_umbilical, "number");
assert.equal(typeof adaptado?.perc_acm, "number");
assert.equal(typeof adaptado?.perc_ducto_venoso, "number");
assert.equal(typeof adaptado?.perc_rcp, "number");
const laudoEstruturado = renderDopplerModule(adaptado as DopplerObstetricoModule);
const achadosEstruturados = laudoEstruturado.achados.join("\n");
assert.match(achadosEstruturados, /Artéria umbilical.*percentil/);
assert.match(achadosEstruturados, /Artéria cerebral média.*percentil/);
assert.match(achadosEstruturados, /Ducto venoso.*percentil/);
assert.match(achadosEstruturados, /Relação cérebro-placentária.*percentil/);
assert.match(achadosEstruturados, /Calculadora v2021/);

const adaptado14 = dopplerDaTela({
  ig: { bio_sem: "14", bio_dias: "0" },
  doppler: {
    realizado: "sim",
    "realizado.sim.ir_ut_dir": "0,60",
    "realizado.sim.ip_ut_dir": "1,20",
    "realizado.sim.ir_ut_esq": "0,62",
    "realizado.sim.ip_ut_esq": "1,40",
    "realizado.sim.ip_umb": "1,00",
  },
});
assert.equal(adaptado14?.ip_medio_uterinas, 1.3);
assert.equal(adaptado14?.ir_uterina_dir, null);
assert.equal(adaptado14?.ip_umbilical, null);
assert.equal(adaptado14?.perc_umbilical, null);

const adaptado19 = dopplerDaTela({
  ig: { bio_sem: "19", bio_dias: "6" },
  doppler: {
    realizado: "sim",
    "realizado.sim.ip_umb": "1,20",
    "realizado.sim.ip_acm": "1,40",
    "realizado.sim.ip_dv": "0,70",
  },
});
assert.equal(adaptado19?.ip_umbilical, 1.2);
assert.equal(adaptado19?.perc_umbilical, null);
assert.equal(adaptado19?.perc_acm, null);
assert.equal(adaptado19?.perc_ducto_venoso, null);

const bloco = formatarBlocoDopplerParcial(
  { weeks: 14, days: 0, ipUterinaDireita: 1.2, ipUterinaEsquerda: 1.4 },
  uterinas14,
);
assert.match(bloco, /Fetal Medicine Barcelona/);
assert.doesNotMatch(bloco, /umbilical/i);

console.log("doppler-barcelona: fórmulas, limites e integração aprovados");
