import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLINICAL_MODEL_CODES,
  HEPATIC_CONTRACT_VERSION,
  confirmHepaticIntegratedInterpretation,
  confirmHepaticModuleInterpretation,
  deriveHepaticIqrRatio,
  renderHepaticDopplerReport,
  renderHepaticElastographyReport,
  renderHepaticMultiparametricReport,
  type HepaticAssessment,
  type HepaticModule,
} from "../../packages/shared/src";

const reference = {
  id: "synthetic-renderer-protocol",
  version: "test-only-v1",
  citation: "Protocolo sintético para teste",
};
const timestamp = "2026-10-02T15:00:00Z";
const inactive: HepaticModule = { status: "not_performed", measurements: [], derived: [] };

function activeModule(
  method: "2D-SWE" | "CAP",
  unit: "kPa" | "dB/m",
  median: number,
  iqr: number,
): HepaticModule {
  return {
    status: "performed",
    method,
    equipment: { manufacturer: "Fabricante sintético", model: "Modelo de teste" },
    acquisition: {
      count: 5,
      lobe: "right",
      depthCm: 3.2,
      capsuleDistanceCm: 1.5,
      roi: "parênquima hepático, sem estruturas vasculares",
      position: "decúbito dorsal",
      protocol: reference,
    },
    fasting: { status: "fasting", hours: 4 },
    confounders: { reviewed: true, items: [], etiologicContext: "contexto sintético" },
    quality: {
      assessment: "adequate",
      physicianId: "synthetic-doctor",
      assessedAt: timestamp,
      criterion: {
        reference,
        method,
        manufacturer: "Fabricante sintético",
        equipmentModel: "Modelo de teste",
        unit,
        minimumAcquisitions: 5,
        requiredMetrics: ["quality-reviewed"],
      },
      metrics: [{ code: "quality-reviewed", value: 1, unit: "boolean" }],
    },
    measurements: [
      { id: `${method}-median`, role: "median", value: median, unit, origin: "manual", source: reference },
      { id: `${method}-iqr`, role: "iqr", value: iqr, unit, origin: "manual", source: reference },
    ],
    derived: [],
  };
}

function confirmModule(value: HepaticAssessment, key: "fat" | "stiffness", text: string): HepaticAssessment {
  return confirmHepaticModuleInterpretation(value, key, {
    text,
    physicianId: "synthetic-doctor",
    confirmedAt: timestamp,
    reference,
  });
}

function elastography(): HepaticAssessment {
  let value: HepaticAssessment = {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId: "d91d9e82-a692-4491-bac8-3f3847d7f809",
    revision: 0,
    purpose: "elastography",
    indication: "Avaliação sintética da rigidez hepática",
    modules: { fat: inactive, stiffness: activeModule("2D-SWE", "kPa", 5.2, 0.6) },
  };
  value = deriveHepaticIqrRatio(value, "stiffness");
  return confirmModule(value, "stiffness", "Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado.");
}

function multiparametric(): HepaticAssessment {
  let value: HepaticAssessment = {
    contractVersion: HEPATIC_CONTRACT_VERSION,
    examId: "117f3a3b-2ed7-4580-b763-ab876065041a",
    revision: 0,
    purpose: "multiparametric",
    indication: "Avaliação hepática sintética",
    modules: {
      fat: activeModule("CAP", "dB/m", 240, 20),
      stiffness: activeModule("2D-SWE", "kPa", 5.2, 0.6),
    },
    correlation: {
      modeB: "Fígado de dimensões normais, contornos regulares e ecotextura homogênea",
      doppler: "Fluxos preservados nos vasos avaliados",
      concordance: "concordant",
    },
  };
  value = deriveHepaticIqrRatio(value, "fat");
  value = deriveHepaticIqrRatio(value, "stiffness");
  value = confirmModule(value, "fat", "Quantificação de gordura revisada pelo médico.");
  value = confirmModule(value, "stiffness", "Rigidez hepática revisada pelo médico.");
  return confirmHepaticIntegratedInterpretation(value, {
    text: "Avaliação multiparamétrica hepática sem alterações significativas nos parâmetros examinados.",
    physicianId: "synthetic-doctor",
    confirmedAt: timestamp,
    reference,
  });
}

const offVessel = { evaluated: false as const };
function doppler(physicianReviewed = true) {
  return {
    schemaVersion: 1 as const,
    categoryCode: "ABDOMEN_TOTAL_DOPPLER" as const,
    physicianReviewed,
    documentationPhoto: "omit" as const,
    abdomenReport: "Texto abdominal sintético suficientemente longo para satisfazer o contrato compartilhado sem ser inserido no laudo Doppler hepático independente.",
    portalVein: { caliberCm: 1.1, velocityCms: 24, flow: "hepatopetal" as const },
    hepaticVeins: { evaluated: true as const, caliberCm: 0.8, velocityCms: 28, flow: "hepatopetal" as const },
    splenicVein: offVessel,
    superiorMesentericVein: offVessel,
    commonHepaticArtery: offVessel,
    portalPathology: { status: "absent" as const, physicianConfirmed: false },
  };
}

test("elastografia usa somente a conclusão confirmada, preserva unidade e não duplica a frase aprovada", () => {
  const report = renderHepaticElastographyReport(elastography());
  assert.match(report, /^ELASTOGRAFIA HEPÁTICA/);
  assert.match(report, /5,2 kPa/);
  assert.match(report, /após jejum de 4 horas/);
  assert.match(report, /razão IQR\/mediana de 11,538%/);
  assert.equal(report.match(/Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado\./g)?.length, 1);
  assert.doesNotMatch(report, /fibrose|F[0-4]|limiar/i);
});

test("elastografia bloqueia interpretação ausente, alterada ou finalidade incompatível", () => {
  const absent = elastography();
  delete absent.modules.stiffness.interpretation;
  assert.throws(() => renderHepaticElastographyReport(absent), /PHYSICIAN_INTERPRETATION_REQUIRED/);

  const stale = elastography();
  stale.modules.stiffness.measurements[0]!.value = 8;
  assert.throws(() => renderHepaticElastographyReport(stale), /STALE_INTERPRETATION|INVALID_CONFIRMATION_ATTESTATION/);

  const wrongPurpose = elastography();
  wrongPurpose.purpose = "abdomen_total";
  const renewed = confirmModule(wrongPurpose, "stiffness", "Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado.");
  assert.throws(() => renderHepaticElastographyReport(renewed), /Finalidade incompatível/);
});

test("avaliação multiparamétrica reúne correlação, módulos nativos e conclusão integrada confirmada", () => {
  const report = renderHepaticMultiparametricReport(multiparametric());
  assert.match(report, /^AVALIAÇÃO MULTIPARAMÉTRICA HEPÁTICA/);
  assert.match(report, /Modo B: Fígado de dimensões normais/);
  assert.match(report, /Doppler: Fluxos preservados/);
  assert.match(report, /240 dB\/m/);
  assert.match(report, /5,2 kPa/);
  assert.match(report, /CONCLUSÃO:\nAvaliação multiparamétrica hepática sem alterações significativas/);
  assert.doesNotMatch(report, /Quantificação de gordura revisada pelo médico|Rigidez hepática revisada pelo médico/);
});

test("avaliação multiparamétrica falha sem correlação ou revisão integrada atual", () => {
  const noCorrelation = multiparametric();
  delete noCorrelation.correlation;
  assert.throws(() => renderHepaticMultiparametricReport(noCorrelation), /CORRELATION_REVIEW_REQUIRED|INTEGRATED_REVIEW_REQUIRED/);

  const noIntegrated = multiparametric();
  delete noIntegrated.integratedInterpretation;
  assert.throws(() => renderHepaticMultiparametricReport(noIntegrated), /INTEGRATED_REVIEW_REQUIRED/);
});

test("Doppler hepático reutiliza somente vasos avaliados e exige revisão médica", () => {
  const report = renderHepaticDopplerReport(doppler());
  assert.match(report, /^DOPPLER HEPÁTICO/);
  assert.match(report, /Tronco da veia porta com calibre de 1,1 cm/);
  assert.match(report, /Veias hepáticas com calibre de 0,8 cm/);
  assert.doesNotMatch(report, /Veia esplênica|Artéria hepática comum|Texto abdominal sintético/);
  assert.match(report, /Estudo Doppler hepático sem alterações hemodinâmicas significativas nos vasos avaliados\./);
  assert.throws(() => renderHepaticDopplerReport(doppler(false)), /MODEL_NOT_REVIEWED/);
});

test("Doppler hepático bloqueia vaso incompleto e alteração portal sem confirmação", () => {
  const incomplete = doppler();
  incomplete.portalVein.velocityCms = undefined as never;
  assert.throws(() => renderHepaticDopplerReport(incomplete), /PORTAL_VEIN_REQUIRED/);

  const altered = doppler();
  altered.portalPathology = {
    status: "suspected",
    kind: "portal_thrombosis",
    evidence: "Material ecogênico sintético no tronco portal",
    physicianConfirmed: false,
  } as never;
  assert.throws(() => renderHepaticDopplerReport(altered), /PORTAL_CONCLUSION_INCOMPLETE/);

  const incompatibleNormal = doppler();
  incompatibleNormal.hepaticVeins.flow = "ausente";
  // O contrato compartilhado já barra antes do renderer hepático; ambos falham fechados.
  assert.throws(() => renderHepaticDopplerReport(incompatibleNormal), /hepaticVeins\.flow:ABNORMAL_FLOW_WITHOUT_PORTAL_FINDING|incompatível com conclusão normal/);

  const undescribed = doppler();
  undescribed.hepaticVeins.flow = "outro";
  assert.throws(() => renderHepaticDopplerReport(undescribed), /hepaticVeins\.flow:ABNORMAL_FLOW_WITHOUT_PORTAL_FINDING|exige descrição estruturada/);

  const undescribedAltered = doppler();
  undescribedAltered.hepaticVeins.flow = "outro";
  undescribedAltered.portalPathology = { status: "suspected", kind: "other", evidence: "Padrão sintético descrito", physicianConfirmed: true } as never;
  assert.throws(() => renderHepaticDopplerReport(undescribedAltered), /exige descrição estruturada/);
});

test("renderizadores hepáticos não registram nem ativam novas categorias", () => {
  assert.equal(CLINCAL_CODES_HAS_HEPATIC(), false);
});

function CLINCAL_CODES_HAS_HEPATIC() {
  return CLINICAL_MODEL_CODES.some((code) => code === ("ELASTOGRAFIA_HEPATICA" as never) || code === ("DOPPLER_HEPATICO" as never));
}
