import assert from "node:assert/strict";
import { test } from "node:test";
import { HepaticAssessmentSchema, evaluateHepaticConclusion } from "@laudousg/shared";
import { CATS, HEPATIC_PENDING_CATS } from "../../ui/tokens";
import {
  HEPATIC_ANDROID_CONFIGURATION,
  HEPATIC_ANDROID_MODELS,
  HEPATIC_ANDROID_MODELS_ENABLED,
  createHepaticExamId,
  createInitialHepaticAssessment,
  hasApprovedHepaticQualityConfiguration,
  isEnabledHepaticAndroidModel,
  isHepaticAndroidModelCode,
} from "./hepaticModels";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("gate hepático desligado: categorias preparadas, fora do seletor e sem roteamento", () => {
  assert.equal(HEPATIC_ANDROID_MODELS_ENABLED, false);
  // Mesmos códigos da Web e de /api/v1/hepatic-reports.
  assert.deepEqual(HEPATIC_ANDROID_MODELS.map((model) => model.id), ["AVALIACAO_MULTIPARAMETRICA_HEPATICA", "ELASTOGRAFIA_HEPATICA"]);
  assert.deepEqual(HEPATIC_PENDING_CATS.map((category) => category.id), HEPATIC_ANDROID_MODELS.map((model) => model.id));
  for (const model of HEPATIC_ANDROID_MODELS) {
    assert.equal(CATS.some((category) => category.id === model.id), false, `${model.id} apareceu no seletor com o gate desligado`);
    assert.equal(isHepaticAndroidModelCode(model.id), true);
    assert.equal(isEnabledHepaticAndroidModel(model.id), false, "desligado não pode rotear para o fluxo hepático");
    assert.equal(isEnabledHepaticAndroidModel(model.id, true), true);
  }
  assert.equal(isEnabledHepaticAndroidModel("ABDOMEN_TOTAL", true), false);
  for (const category of HEPATIC_PENDING_CATS) {
    assert.ok(category.label.trim() && category.sub.trim());
  }
});

test("rascunho inicial: finalidade da categoria, nada presumido e conclusão bloqueada", () => {
  const multi = createInitialHepaticAssessment("AVALIACAO_MULTIPARAMETRICA_HEPATICA", "c2c4c302-2f31-424c-92df-08265908a158");
  const elasto = createInitialHepaticAssessment("ELASTOGRAFIA_HEPATICA", "d91d9e82-a692-4491-bac8-3f3847d7f809");
  assert.equal(multi.purpose, "multiparametric");
  assert.equal(elasto.purpose, "elastography");
  for (const value of [multi, elasto]) {
    assert.equal(HepaticAssessmentSchema.safeParse(value).success, true);
    assert.equal(value.revision, 0);
    for (const key of ["fat", "stiffness"] as const) {
      assert.deepEqual(value.modules[key], { status: "not_performed", measurements: [], derived: [] });
    }
    assert.equal(value.indication, undefined);
    assert.equal(value.correlation, undefined);
    assert.equal(evaluateHepaticConclusion(value).canConclude, false);
  }
  assert.throws(() => createInitialHepaticAssessment("ABDOMEN_TOTAL" as never));
});

test("examId é UUID v4 válido para o contrato, único e determinístico com bytes injetados", () => {
  const ids = new Set(Array.from({ length: 200 }, () => createHepaticExamId()));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, UUID_V4);
  const fixed = createHepaticExamId((bytes) => bytes.fill(0xff));
  assert.equal(fixed, "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.match(createHepaticExamId((bytes) => bytes.fill(0)), UUID_V4);
  // Sem Web Crypto (Hermes), o fallback ainda gera UUID v4 válido.
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  try {
    assert.match(createHepaticExamId(), UUID_V4);
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
  }
});

test("nenhum critério de qualidade nasce aprovado no cliente", () => {
  assert.equal(hasApprovedHepaticQualityConfiguration(HEPATIC_ANDROID_CONFIGURATION), false);
  for (const key of ["fat", "stiffness"] as const) {
    assert.deepEqual(HEPATIC_ANDROID_CONFIGURATION[key].qualityByMethod, {});
  }
});
