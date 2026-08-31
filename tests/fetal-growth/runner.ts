import assert from "node:assert/strict";
import {
  classifyFetalGrowth,
  formatFetalGrowthReport,
} from "../../packages/shared/src/calculators/fetalGrowth";
import { fetalGrowthDaTela } from "../../apps/web/src/lib/catalog/fetalGrowthParaCatalogo";
import { adaptarObstetrica } from "../../apps/web/src/lib/catalog/obstetricaParaCatalogo";
import { adaptarMorfologico } from "../../apps/web/src/lib/catalog/morfologicoParaCatalogo";
import {
  ObstetricaFindingsSchema,
  renderObstetrica,
} from "../../apps/api/src/server/renderer/categories/OBSTETRICA";
import {
  MorfologicoFindingsSchema,
  renderMorfologico,
} from "../../apps/api/src/server/renderer/categories/MORFOLOGICO";
import { renderFetalGrowthModule } from "../../apps/api/src/server/renderer/categories/fetalGrowthModule";

const source = "Intergrowth-21st";

const aga = classifyFetalGrowth({ efwPercentile: 10, efwPercentileSource: source });
assert.equal(aga.classification, "adequate_for_gestational_age");
assert.equal(aga.stage, undefined);

const pig = classifyFetalGrowth({
  efwPercentile: 3,
  efwPercentileSource: source,
  dopplerAssessmentCompleteAndNormal: true,
});
assert.equal(pig.classification, "small_for_gestational_age");

const incomplete = classifyFetalGrowth({ efwPercentile: 6, efwPercentileSource: source });
assert.equal(incomplete.classification, "small_fetus_staging_incomplete");
assert.doesNotMatch(incomplete.conclusion, /Gratac/i);

const stage1ByWeight = classifyFetalGrowth({ efwPercentile: 2.9, efwPercentileSource: source });
assert.equal(stage1ByWeight.classification, "fetal_growth_restriction_stage_1");
assert.equal(stage1ByWeight.stage, 1);

const cprSingle = classifyFetalGrowth({
  efwPercentile: 7,
  efwPercentileSource: source,
  cprBelowP5: { present: true, confirmed: false },
});
assert.equal(cprSingle.classification, "small_fetus_staging_incomplete");
assert.equal(cprSingle.pendingCriteria[0]?.stage, 1);

const cprConfirmed = classifyFetalGrowth({
  efwPercentile: 7,
  efwPercentileSource: source,
  cprBelowP5: { present: true, confirmed: true },
});
assert.equal(cprConfirmed.stage, 1);

const stage1ByUterines = classifyFetalGrowth({
  efwPercentile: 8,
  efwPercentileSource: source,
  meanUterinePiAboveP95: true,
});
assert.equal(stage1ByUterines.stage, 1);

const absentUaSingle = classifyFetalGrowth({
  efwPercentile: 5,
  efwPercentileSource: source,
  umbilicalArteryEndDiastolicFlow: "absent",
});
assert.equal(absentUaSingle.stage, undefined);
assert.equal(absentUaSingle.pendingCriteria[0]?.stage, 2);

const stage2 = classifyFetalGrowth({
  efwPercentile: 5,
  efwPercentileSource: source,
  umbilicalArteryEndDiastolicFlow: "absent",
  umbilicalFlowConfirmedInRequiredInterval: true,
});
assert.equal(stage2.stage, 2);

const stage3 = classifyFetalGrowth({
  efwPercentile: 4,
  efwPercentileSource: source,
  ductusVenosus: { piAboveP95: true, confirmedAfter6To12Hours: true },
});
assert.equal(stage3.stage, 3);

const stage4ByCtg = classifyFetalGrowth({
  efwPercentile: 9,
  efwPercentileSource: source,
  pathologicalCtg: true,
});
assert.equal(stage4ByCtg.stage, 4);

const reverseDvSingle = classifyFetalGrowth({
  efwPercentile: 4,
  efwPercentileSource: source,
  ductusVenosus: { diastolicFlow: "reversed" },
});
assert.equal(reverseDvSingle.stage, undefined);
assert.equal(reverseDvSingle.pendingCriteria[0]?.stage, 4);

const stage4ByDv = classifyFetalGrowth({
  efwPercentile: 4,
  efwPercentileSource: source,
  ductusVenosus: {
    diastolicFlow: "reversed",
    confirmedAfter6To12Hours: true,
  },
});
assert.equal(stage4ByDv.stage, 4);

const stage1WithPendingStage3 = classifyFetalGrowth({
  efwPercentile: 2,
  efwPercentileSource: source,
  umbilicalArteryEndDiastolicFlow: "reversed",
});
assert.equal(stage1WithPendingStage3.stage, 1);
assert.match(stage1WithPendingStage3.warnings.join(" "), /estágio 3.*pendente/i);

const normalWeightAbnormalDoppler = classifyFetalGrowth({
  efwPercentile: 20,
  efwPercentileSource: source,
  meanUterinePiAboveP95: true,
});
assert.equal(normalWeightAbnormalDoppler.stage, undefined);
assert.match(normalWeightAbnormalDoppler.warnings.join(" "), /não preenche.*RCF/i);

const before24 = classifyFetalGrowth({
  efwPercentile: 2,
  efwPercentileSource: source,
  gestationalWeeks: 22,
  gestationalDays: 0,
});
assert.match(before24.warnings.join(" "), /confirmado com 24 semanas/i);

assert.match(formatFetalGrowthReport(stage4ByCtg), /Fetal Medicine Barcelona/);

assert.throws(
  () => classifyFetalGrowth({ efwPercentile: -1, efwPercentileSource: source }),
  RangeError,
);
assert.throws(
  () => classifyFetalGrowth({ efwPercentile: 5, efwPercentileSource: "" }),
  TypeError,
);

const estadoWebNormal = {
  ig: { bio_sem: "30", bio_dias: "0" },
  biometria: { peso: "1400" },
  crescimento_fetal: {
    avaliar: "sim",
    "avaliar.sim.percentil": "6",
    "avaliar.sim.fonte": "Intergrowth-21st",
    "avaliar.sim.rcp_confirmada": "nao",
    "avaliar.sim.acm_confirmada": "nao",
    "avaliar.sim.ctg": "nao_avaliada",
  },
  doppler: {
    realizado: "sim",
    "realizado.sim.ip_ut_dir": "0,70",
    "realizado.sim.ip_ut_esq": "0,72",
    "realizado.sim.ip_umb": "1,00",
    "realizado.sim.ip_acm": "1,80",
    "realizado.sim.umbilical": "normal",
    "realizado.sim.ducto_fluxo": "normal",
  },
};
const payloadNormal = fetalGrowthDaTela(estadoWebNormal);
assert.ok(payloadNormal);
assert.equal(payloadNormal.dopplerAssessmentCompleteAndNormal, true);
const renderedNormal = renderFetalGrowthModule(
  payloadNormal as Parameters<typeof renderFetalGrowthModule>[0],
  30,
  0,
);
assert.match(renderedNormal.conclusao.join(" "), /pequeno para a idade gestacional/i);
assert.match(renderedNormal.achados.join(" "), /versão publicada em novembro de 2024/i);

const estadoWebStage2 = structuredClone(estadoWebNormal);
estadoWebStage2.doppler["realizado.sim.umbilical"] = "diastole_ausente";
estadoWebStage2.doppler["realizado.sim.umbilical.diastole_ausente.confirmada"] = "sim";
const payloadStage2 = fetalGrowthDaTela(estadoWebStage2);
assert.ok(payloadStage2);
const renderedStage2 = renderFetalGrowthModule(
  payloadStage2 as Parameters<typeof renderFetalGrowthModule>[0],
  30,
  0,
);
assert.match(renderedStage2.conclusao.join(" "), /estágio II/i);

const adapted = adaptarObstetrica(estadoWebStage2);
const obstetricaParsed = ObstetricaFindingsSchema.parse(adapted.dados);
assert.equal(
  ((adapted.dados.fetos as Array<Record<string, unknown>>)[0]?.percentil),
  6,
);

for (const objetivo of [false, true]) {
  const fullReport = renderObstetrica(obstetricaParsed, null, { objetivo });
  assert.match(fullReport, /CRESCIMENTO FETAL:/);
  assert.match(fullReport, /restrição do crescimento fetal, estágio II/i);
  assert.match(fullReport, /Fetal Medicine Barcelona/i);
  assert.match(fullReport, /Fluxo diastólico ausente na artéria umbilical/i);
  assert.doesNotMatch(fullReport, /Perfil hemodinâmico fetal é normal/i);
}

const adaptedMorph = adaptarMorfologico(estadoWebStage2, { trimestre: "2t" });
const morphParsed = MorfologicoFindingsSchema.parse(adaptedMorph.dados);
for (const objetivo of [false, true]) {
  const fullReport = renderMorfologico(morphParsed, null, { objetivo });
  assert.match(fullReport, /CRESCIMENTO FETAL:/);
  assert.match(fullReport, /restrição do crescimento fetal, estágio II/i);
  assert.match(fullReport, /Fetal Medicine Barcelona/i);
  assert.match(fullReport, /Fluxo diastólico ausente na artéria umbilical/i);
  assert.doesNotMatch(fullReport, /Perfil hemodinâmico fetal é normal/i);
}

console.log("fetal-growth: 54 verificações clínicas e de integração aprovadas");
