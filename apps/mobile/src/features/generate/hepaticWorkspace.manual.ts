import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HepaticAssessmentSchema,
  evaluateHepaticConclusion,
  renderHepaticElastographyReport,
  renderHepaticMultiparametricReport,
  type HepaticAssessment,
  type HepaticModule,
} from "@laudousg/shared";
import { createInitialHepaticAssessment } from "./hepaticModels";
import {
  HEPATIC_ISSUE_LABELS,
  HEPATIC_METHODS,
  HEPATIC_UNITS,
  buildHepaticCorrelation,
  buildHepaticQuality,
  buildHepaticTechniquePatch,
  calculateHepaticIqrRatio,
  canCalculateHepaticIqrRatio,
  changeHepaticMethod,
  changeHepaticModuleStatus,
  changeHepaticUnit,
  clearHepaticMeasurement,
  editHepaticModule,
  hepaticWorkspaceReadiness,
  optionalHepaticText,
  parseHepaticNumber,
  replaceHepaticAssessmentContext,
  reviewHepaticAssessment,
  reviewHepaticModule,
  tryHepaticEdit,
  upsertHepaticMeasurement,
  type HepaticQualityConfiguration,
} from "./hepaticWorkspace";

// Tudo SINTÉTICO: referências, critério de qualidade e mínimos existem só para
// exercitar o gate. Não são recomendação clínica nem limiar aprovado.
const reference = { id: "synthetic-android", version: "test-v1", citation: "Referência sintética de teste" };
const doctor = "synthetic-doctor";
const at = "2026-10-02T15:00:00Z";
const review = (text: string) => ({ text, physicianId: doctor, confirmedAt: at, reference });
const syntheticQuality: HepaticQualityConfiguration = {
  reference,
  minimumAcquisitions: 5,
  metrics: [{ code: "quality-reviewed", label: "Revisão sintética", unit: "boolean" }],
};
const technique = {
  manufacturer: "Fabricante sintético", model: "Modelo de teste", probe: "", count: "5", lobe: "right" as const,
  depthCm: "3,2", roi: "parênquima hepático", position: "decúbito dorsal",
};
const EXAM = "c2c4c302-2f31-424c-92df-08265908a158";

/** Monta um módulo completo SÓ pelas operações do workspace, como a tela faz. */
function fillModule(
  start: HepaticAssessment,
  key: "fat" | "stiffness",
  method: "2D-SWE" | "CAP",
  unit: "kPa" | "dB/m",
  median: number,
  iqr: number,
): HepaticAssessment {
  let value = changeHepaticModuleStatus(start, key, "performed");
  value = changeHepaticMethod(value, key, method);
  value = editHepaticModule(value, key, buildHepaticTechniquePatch(technique, reference)!);
  value = editHepaticModule(value, key, { fasting: { status: "fasting", hours: 4 } });
  value = editHepaticModule(value, key, { confounders: { reviewed: true, items: [], etiologicContext: "contexto sintético" } });
  value = upsertHepaticMeasurement(value, key, { id: `${key}-median`, role: "median", value: median, unit, origin: "manual", source: reference });
  value = upsertHepaticMeasurement(value, key, { id: `${key}-iqr`, role: "iqr", value: iqr, unit, origin: "manual", source: reference });
  const quality = buildHepaticQuality({
    module: value.modules[key], unit, configuration: syntheticQuality,
    metricDrafts: { "quality-reviewed": "1" }, physicianId: doctor, assessedAt: at,
  });
  assert.ok(quality, "qualidade sintética deveria montar");
  value = editHepaticModule(value, key, { quality: quality! });
  value = calculateHepaticIqrRatio(value, key);
  return reviewHepaticModule(value, key, review(`Interpretação sintética do módulo ${key}.`));
}

function elastography(): HepaticAssessment {
  let value = createInitialHepaticAssessment("ELASTOGRAFIA_HEPATICA", EXAM);
  value = replaceHepaticAssessmentContext(value, { indication: "Indicação sintética" });
  return fillModule(value, "stiffness", "2D-SWE", "kPa", 5.2, 0.6);
}

test("métodos e unidades nativas por módulo, sem conversão", () => {
  assert.deepEqual(HEPATIC_METHODS.stiffness, ["2D-SWE", "pSWE/ARFI", "TE"]);
  assert.deepEqual(HEPATIC_METHODS.fat, ["ATI", "UGAP"]);
  assert.deepEqual(HEPATIC_UNITS.TE, ["kPa"]);
  assert.deepEqual(HEPATIC_UNITS["2D-SWE"], ["kPa", "m/s"]);
  assert.deepEqual(HEPATIC_UNITS.CAP, ["dB/m"]);
  assert.equal(parseHepaticNumber("7,2"), 7.2);
  assert.equal(parseHepaticNumber(""), null);
  assert.equal(parseHepaticNumber("abc"), null);
  assert.equal(parseHepaticNumber("-1"), null);
});

test("técnica e correlação incompletas ficam fora do payload clínico", () => {
  const empty = { manufacturer: "", model: "", probe: "", count: "", lobe: "right" as const, depthCm: "", roi: "", position: "" };
  assert.equal(buildHepaticTechniquePatch(empty, reference), null);
  assert.equal(buildHepaticTechniquePatch({ ...technique, count: "5.5" }, reference), null, "aquisições inteiras");
  assert.equal(buildHepaticTechniquePatch({ ...technique, count: "0" }, reference), null);
  assert.equal(buildHepaticTechniquePatch({ ...technique, depthCm: "abc" }, reference), null);
  assert.equal(buildHepaticTechniquePatch({ ...technique, roi: "  " }, reference), null);
  const patch = buildHepaticTechniquePatch(technique, reference)!;
  assert.equal(patch.acquisition?.count, 5);
  assert.equal(patch.acquisition?.depthCm, 3.2);
  assert.equal(patch.equipment?.probe, undefined);
  assert.equal(patch.quality, undefined, "técnica nova invalida a qualidade anterior");

  const correlation = { modeB: "", doppler: "", concordance: "not_assessed" as const, physicianResolution: "" };
  assert.equal(buildHepaticCorrelation(correlation), null);
  assert.equal(buildHepaticCorrelation({ ...correlation, modeB: "Sintético", doppler: "Sintético", concordance: "not_assessed" }), null);
  assert.equal(buildHepaticCorrelation({ ...correlation, modeB: "Sintético", doppler: "Sintético", concordance: "discordant" }), null, "discordância exige resolução");
  assert.equal(buildHepaticCorrelation({ ...correlation, modeB: "Sintético", doppler: "Sintético", concordance: "concordant" })?.physicianResolution, undefined);
});

test("qualidade: sem critério versionado configurado não há registro (fail-closed)", () => {
  let value = createInitialHepaticAssessment("ELASTOGRAFIA_HEPATICA", EXAM);
  value = changeHepaticModuleStatus(value, "stiffness", "performed");
  value = changeHepaticMethod(value, "stiffness", "2D-SWE");
  value = editHepaticModule(value, "stiffness", buildHepaticTechniquePatch(technique, reference)!);
  const base = { module: value.modules.stiffness, unit: "kPa" as const, metricDrafts: { "quality-reviewed": "1" }, physicianId: doctor, assessedAt: at };
  assert.equal(buildHepaticQuality({ ...base, configuration: undefined }), null);
  assert.equal(buildHepaticQuality({ ...base, configuration: syntheticQuality, unit: undefined }), null);
  assert.equal(buildHepaticQuality({ ...base, configuration: syntheticQuality, metricDrafts: {} }), null, "métrica exigida ausente");
  const quality = buildHepaticQuality({ ...base, configuration: syntheticQuality })!;
  assert.equal(quality.criterion.method, "2D-SWE");
  assert.equal(quality.criterion.manufacturer, "Fabricante sintético");
  assert.equal(quality.criterion.unit, "kPa");
  assert.deepEqual(quality.criterion.requiredMetrics, ["quality-reviewed"]);
});

test("elastografia completa conclui e renderiza; IQR/mediana é só aritmética", () => {
  const value = elastography();
  assert.equal(HepaticAssessmentSchema.safeParse(value).success, true);
  const readiness = hepaticWorkspaceReadiness(value);
  assert.equal(readiness.canConclude, true, JSON.stringify(readiness.issues));
  const ratio = value.modules.stiffness.derived[0]!;
  assert.equal(ratio.algorithm, "iqr/median*100/v1");
  assert.ok(Math.abs(ratio.value - (0.6 / 5.2) * 100) < 1e-9);
  const text = renderHepaticElastographyReport(value);
  assert.match(text, /mediana de 5,2 kPa/);
  assert.equal(value.modules.fat.status, "not_performed", "módulo não realizado permanece omitido");
});

test("toda edição clínica apaga confirmações e bloqueia a conclusão", () => {
  const done = elastography();
  const edits: Array<[string, HepaticAssessment]> = [
    ["indicação", replaceHepaticAssessmentContext(done, { indication: "Outra indicação sintética" })],
    ["mediana", upsertHepaticMeasurement(done, "stiffness", { id: "stiffness-median", role: "median", value: 5.3, unit: "kPa", origin: "manual", source: reference })],
    ["apagar IQR", clearHepaticMeasurement(done, "stiffness", "iqr")],
    ["unidade", changeHepaticUnit(done, "stiffness")],
    ["método", changeHepaticMethod(done, "stiffness", "pSWE/ARFI")],
    ["jejum", editHepaticModule(done, "stiffness", { fasting: { status: "unknown" } })],
  ];
  for (const [label, edited] of edits) {
    assert.ok(edited.revision > done.revision, `${label}: revisão incrementada`);
    assert.equal(edited.modules.stiffness.interpretation, undefined, `${label}: confirmação apagada`);
    assert.equal(evaluateHepaticConclusion(edited).canConclude, false, `${label}: conclusão bloqueada`);
  }
  // Apagar a fonte remove a derivação dependente (sem valor residual).
  assert.deepEqual(clearHepaticMeasurement(done, "stiffness", "iqr").modules.stiffness.derived, []);
  // Trocar unidade não reaproveita o número com outra unidade.
  const unitChanged = changeHepaticUnit(done, "stiffness");
  assert.deepEqual(unitChanged.modules.stiffness.measurements, []);
  assert.equal(unitChanged.modules.stiffness.quality, undefined);
  // Reaplicar uma confirmação antiga não libera: precisa nova confirmação explícita.
  const replay = { ...unitChanged, modules: { ...unitChanged.modules, stiffness: { ...unitChanged.modules.stiffness, interpretation: done.modules.stiffness.interpretation } } };
  assert.equal(evaluateHepaticConclusion(replay).canConclude, false);
});

test("não realizável/não realizado limpam medidas e exigem motivo quando inviável", () => {
  const done = elastography();
  const notPerformed = changeHepaticModuleStatus(done, "stiffness", "not_performed");
  assert.deepEqual(notPerformed.modules.stiffness.measurements, []);
  assert.deepEqual(notPerformed.modules.stiffness.derived, []);
  assert.equal(evaluateHepaticConclusion(notPerformed).canConclude, false, "elastografia sem rigidez não conclui");
  const notFeasible = changeHepaticModuleStatus(done, "stiffness", "not_feasible");
  assert.deepEqual(notFeasible.modules.stiffness.measurements, []);
  const issues = evaluateHepaticConclusion(notFeasible).issues.map((issue) => issue.code);
  assert.ok(issues.includes("LIMITATION_REASON_REQUIRED"), JSON.stringify(issues));
  assert.equal(evaluateHepaticConclusion(notFeasible).canConclude, false, "inviável não vira resultado quantitativo");
});

test("multiparamétrica exige correlação aplicada e conclusão integrada confirmada", () => {
  let value = createInitialHepaticAssessment("AVALIACAO_MULTIPARAMETRICA_HEPATICA", EXAM);
  value = replaceHepaticAssessmentContext(value, { indication: "Indicação sintética" });
  value = fillModule(value, "stiffness", "2D-SWE", "kPa", 5.2, 0.6);
  value = fillModule(value, "fat", "CAP", "dB/m", 240, 20);
  assert.equal(evaluateHepaticConclusion(value).canConclude, false, "sem correlação/integrada");

  const correlation = buildHepaticCorrelation({ modeB: "Achado sintético do modo B", doppler: "Achado sintético do Doppler", concordance: "concordant", physicianResolution: "" })!;
  value = replaceHepaticAssessmentContext(value, { correlation });
  // Contexto novo derruba as confirmações dos módulos: reconfirmar explicitamente.
  assert.equal(value.modules.stiffness.interpretation, undefined);
  value = reviewHepaticModule(value, "stiffness", review("Interpretação sintética do módulo stiffness."));
  value = reviewHepaticModule(value, "fat", review("Interpretação sintética do módulo fat."));
  assert.equal(evaluateHepaticConclusion(value).canConclude, false, "falta a integrada");
  value = reviewHepaticAssessment(value, review("Conclusão integrada sintética."));
  const readiness = evaluateHepaticConclusion(value);
  assert.equal(readiness.canConclude, true, JSON.stringify(readiness.issues));
  assert.ok(renderHepaticMultiparametricReport(value).length > 80);

  // Confirmar de novo um módulo remove a integrada (depende de ambos).
  const reconfirmed = reviewHepaticModule(value, "fat", review("Interpretação sintética revista."));
  assert.equal(reconfirmed.integratedInterpretation, undefined);
  assert.equal(evaluateHepaticConclusion(reconfirmed).canConclude, false);
});

test("pendências do gate têm rótulo em português", () => {
  const issues = evaluateHepaticConclusion(createInitialHepaticAssessment("ELASTOGRAFIA_HEPATICA", EXAM)).issues;
  assert.ok(issues.length > 0);
  for (const code of Object.keys(HEPATIC_ISSUE_LABELS)) assert.ok(HEPATIC_ISSUE_LABELS[code]!.trim());
  // Uma elastografia ainda sem rigidez cita algo acionável.
  assert.ok(issues.some((issue) => HEPATIC_ISSUE_LABELS[issue.code]), JSON.stringify(issues));
});

test("módulo parcialmente limitado exige motivo", () => {
  const limited = changeHepaticModuleStatus(elastography(), "stiffness", "partially_limited");
  const codes = evaluateHepaticConclusion(limited).issues.map((issue) => issue.code);
  assert.ok(codes.includes("LIMITATION_REASON_REQUIRED"), JSON.stringify(codes));
  const module: HepaticModule = limited.modules.stiffness;
  assert.equal(module.interpretation, undefined);
});

// ---- Regressões da revisão adversarial (02/10): texto livre e exceções ----
test("texto livre: espaço não lança nem some; vazio vira undefined", () => {
  assert.equal(optionalHepaticText(""), undefined);
  assert.equal(optionalHepaticText("   "), undefined);
  assert.equal(optionalHepaticText(" Rastreio de "), "Rastreio de".trim());
  // O defeito: mandar " " direto ao contrato lança (schema trim + min(1)).
  const limited = changeHepaticModuleStatus(elastography(), "stiffness", "partially_limited");
  assert.throws(() => editHepaticModule(limited, "stiffness", { reason: " " }));
  assert.throws(() => replaceHepaticAssessmentContext(limited, { indication: " " }));
  // Com a normalização, a mesma digitação é aceita e não grava nada.
  const ok = tryHepaticEdit(() => editHepaticModule(limited, "stiffness", { reason: optionalHepaticText(" ") }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.modules.stiffness.reason, undefined);
  // "Rastreio de" (com espaço digitado no fim) não perde palavras: o campo mostra o rascunho, o contrato o texto aparado.
  const typed = replaceHepaticAssessmentContext(limited, { indication: optionalHepaticText("Rastreio de ") });
  assert.equal(typed.indication, "Rastreio de");
});

test("entrada fora do schema vira mensagem, não exceção no toque", () => {
  const done = elastography();
  const cases: Array<[string, () => HepaticAssessment]> = [
    ["texto acima de 2000", () => replaceHepaticAssessmentContext(done, { indication: "x".repeat(2001) })],
    ["mais de 50 fatores", () => editHepaticModule(done, "stiffness", { confounders: { reviewed: true, etiologicContext: "contexto", items: Array.from({ length: 51 }, (_, i) => `fator ${i}`) } })],
    ["IQR/mediana com mediana zero", () => calculateHepaticIqrRatio(upsertHepaticMeasurement(done, "stiffness", { id: "stiffness-median", role: "median", value: 0, unit: "kPa", origin: "manual", source: reference }), "stiffness")],
    ["interpretação vazia", () => reviewHepaticModule(done, "stiffness", review("   "))],
  ];
  for (const [label, edit] of cases) {
    const result = tryHepaticEdit(edit);
    assert.equal(result.ok, false, label);
    if (!result.ok) assert.match(result.message, /não é aceita/);
  }
  assert.equal(tryHepaticEdit(() => done).ok, true);
});

test("botão IQR/mediana só com mediana positiva e mesma unidade", () => {
  const done = elastography();
  assert.equal(canCalculateHepaticIqrRatio(done.modules.stiffness), true);
  const zero = upsertHepaticMeasurement(done, "stiffness", { id: "stiffness-median", role: "median", value: 0, unit: "kPa", origin: "manual", source: reference });
  assert.equal(canCalculateHepaticIqrRatio(zero.modules.stiffness), false);
  assert.equal(canCalculateHepaticIqrRatio(clearHepaticMeasurement(done, "stiffness", "iqr").modules.stiffness), false);
  const mixed = upsertHepaticMeasurement(done, "stiffness", { id: "stiffness-iqr", role: "iqr", value: 0.6, unit: "m/s", origin: "manual", source: reference });
  assert.equal(canCalculateHepaticIqrRatio(mixed.modules.stiffness), false);
});
