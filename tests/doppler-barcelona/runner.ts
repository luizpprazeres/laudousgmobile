import assert from "node:assert/strict";
import {
  calcularDopplerParcial,
  formatarBlocoDopplerParcial,
} from "../../packages/shared/src/calculators/doppler";
import { dopplerDaTela } from "../../apps/web/src/lib/catalog/dopplerParaCatalogo";

const uterinas14 = calcularDopplerParcial({
  weeks: 14,
  days: 0,
  ipUterinaDireita: 1.2,
  ipUterinaEsquerda: 1.4,
  ipUmbilical: 1,
});
assert.equal(uterinas14.arteriasUterinas?.ipMedio, 1.3);
assert.equal(uterinas14.arteriaUmbilical, undefined);

const parcial22 = calcularDopplerParcial({ weeks: 22, days: 3, ipUmbilical: 1 });
assert.ok(parcial22.arteriaUmbilical);
assert.equal(parcial22.arteriaCerebralMedia, undefined);

const acmBaixa = calcularDopplerParcial({ weeks: 30, days: 0, ipMCA: 0.5 });
assert.ok((acmBaixa.arteriaCerebralMedia?.percentile ?? 100) < 5);
assert.equal(acmBaixa.arteriaCerebralMedia?.pathological, true);

const estado = {
  ig: { bio_sem: "22", bio_dias: "3" },
  doppler: {
    realizado: "sim",
    "realizado.sim.ip_ut_dir": "1,20",
    "realizado.sim.ip_ut_esq": "1,40",
    "realizado.sim.ip_umb": "1,00",
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

const bloco = formatarBlocoDopplerParcial(
  { weeks: 14, days: 0, ipUterinaDireita: 1.2, ipUterinaEsquerda: 1.4 },
  uterinas14,
);
assert.match(bloco, /Fetal Medicine Barcelona/);
assert.doesNotMatch(bloco, /umbilical/i);

console.log("doppler-barcelona: 15 verificações aprovadas");
