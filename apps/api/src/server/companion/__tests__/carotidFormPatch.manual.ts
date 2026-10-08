import assert from "node:assert/strict";
import { COMPANION_FORM_PATCH_CONTRACT_VERSION } from "@laudousg/shared";
import {
  CompanionFormPatchNoFindingsError,
  companionFormPatchCategoryEnabled,
  extractCompanionCarotidFormPatch,
  toCompanionCarotidFormPatch,
} from "../carotidFormPatch";

const emptySide = () => ({
  emi_mm: null,
  comum: { vps_cms: null, vdf_cms: null },
  interna: { vps_cms: null, vdf_cms: null },
  externa: { vps_cms: null, vdf_cms: null },
  vertebral: { vps_cms: null, direcao: null },
  placas: [],
});

const findings = {
  direita: {
    ...emptySide(),
    emi_mm: 0.8,
    interna: { vps_cms: 82, vdf_cms: 0 },
    placas: [{
      localizacao: "bulbo carotídeo",
      composicao: "mista",
      superficie: "regular",
      espessura_mm: 2.1,
      estenose_percentual: 35,
      descricao_raw: "placa mista de superfície regular",
    }],
  },
  esquerda: {
    ...emptySide(),
    vertebral: { vps_cms: 41, direcao: "anterogrado" },
  },
  classificacao_explicita: "estenose_menor_50",
  lado_classificacao: "direita",
  conclusao_livre: "Estenoses inferiores a 50% bilateralmente",
  achados_adicionais: "Tortuosidade da carótida interna direita",
};

const patch = toCompanionCarotidFormPatch(findings, "transcript");
assert.equal(patch.contractVersion, COMPANION_FORM_PATCH_CONTRACT_VERSION);
assert.deepEqual(patch.data.carotidMeasurements, [
  { side: "direita", vessel: "comum", emi: "0.8" },
  { side: "direita", vessel: "interna", psv: "82", vdf: "0" },
  { side: "esquerda", vessel: "vertebral", psv: "41", flowDirection: "anterogrado" },
]);
assert.equal("ir" in patch.data.carotidMeasurements[1]!, false, "não inventa IR a partir das velocidades");
assert.deepEqual(patch.data.carotidPlaques[0], {
  side: "direita",
  location: "bulbo carotídeo",
  composition: "mista",
  surface: "regular",
  thickness: "2.1",
  stenosisPercent: "35",
  description: "placa mista de superfície regular",
});
assert.deepEqual(patch.data.carotidClassifications, [
  { side: "direita", classification: "estenose_menor_50" },
]);
assert.equal(patch.data.carotidConclusion, "Estenoses inferiores a 50% bilateralmente");
assert.equal(patch.data.carotidAdditionalFindings, "Tortuosidade da carótida interna direita");

assert.throws(
  () => toCompanionCarotidFormPatch({
    direita: emptySide(), esquerda: emptySide(),
    classificacao_explicita: "normal", lado_classificacao: null,
    conclusao_livre: null, achados_adicionais: null,
  }, "text"),
  (error) => error instanceof CompanionFormPatchNoFindingsError
    && error.warnings[0]?.code === "CLASSIFICATION_SIDE_MISSING",
  "normalidade sem lado não pode virar classificação bilateral",
);

const semLado = toCompanionCarotidFormPatch({
  direita: { ...emptySide(), interna: { vps_cms: 120, vdf_cms: null } },
  esquerda: emptySide(),
  classificacao_explicita: "estenose_50_69", lado_classificacao: null,
  conclusao_livre: null, achados_adicionais: null,
}, "text");
assert.equal(semLado.data.carotidClassifications.length, 0);
assert.equal(semLado.warnings[0]?.code, "CLASSIFICATION_SIDE_MISSING");
assert.equal(semLado.warnings[0]?.blocking, true);

const patologicaBilateral = toCompanionCarotidFormPatch({
  direita: { ...emptySide(), interna: { vps_cms: 120, vdf_cms: null } },
  esquerda: emptySide(),
  classificacao_explicita: "estenose_50_69", lado_classificacao: "bilateral",
  conclusao_livre: null, achados_adicionais: null,
}, "text");
assert.equal(patologicaBilateral.data.carotidClassifications.length, 0);
assert.equal(patologicaBilateral.warnings[0]?.code, "BILATERAL_PATHOLOGIC_CLASSIFICATION_REVIEW");

assert.throws(
  () => toCompanionCarotidFormPatch({
    direita: emptySide(), esquerda: emptySide(),
    classificacao_explicita: "estenose_50_69", lado_classificacao: null,
    conclusao_livre: null, achados_adicionais: null,
  }, "text"),
  (error) => error instanceof CompanionFormPatchNoFindingsError
    && error.warnings[0]?.code === "CLASSIFICATION_SIDE_MISSING",
);

assert.equal(companionFormPatchCategoryEnabled("DOPPLER_CAROTIDAS", ""), false);
assert.equal(companionFormPatchCategoryEnabled("DOPPLER_CAROTIDAS", " OBSTETRICA, doppler_carotidas "), true);

async function main() {
  let received: { categoryCode?: string; rawInput?: string; signal?: AbortSignal } = {};
  const controller = new AbortController();
  const extracted = await extractCompanionCarotidFormPatch({
    request: {
      contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
      category: "DOPPLER_CAROTIDAS",
      sourceKind: "transcript",
      text: "VPS de 82 cm/s na carótida interna direita",
    },
    signal: controller.signal,
    extract: async (args) => {
      received = args;
      return { findings };
    },
  });
  assert.equal(received.categoryCode, "DOPPLER_CAROTIDAS");
  assert.equal(received.rawInput, "VPS de 82 cm/s na carótida interna direita");
  assert.equal(received.signal, controller.signal);
  assert.equal(extracted.data.carotidMeasurements.length, 3);

  const withIsolatedIr = await extractCompanionCarotidFormPatch({
    request: {
      contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
      category: "DOPPLER_CAROTIDAS",
      sourceKind: "text",
      text: "ACI direita com VPS 82 e IR 0,72",
    },
    extract: async () => ({ findings: {
      ...findings,
      direita: { ...findings.direita, interna: { vps_cms: 82, vdf_cms: null } },
    } }),
  });
  assert.equal(withIsolatedIr.warnings.at(-1)?.code, "ISOLATED_IR_NOT_APPLICABLE");
  assert.equal(withIsolatedIr.warnings.at(-1)?.blocking, true);

  const irPorExtenso = await extractCompanionCarotidFormPatch({
    request: {
      contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
      category: "DOPPLER_CAROTIDAS",
      sourceKind: "text",
      text: "Índice de resistividade da ACI direita 0,72",
    },
    extract: async () => ({ findings: {
      ...findings,
      direita: { ...findings.direita, interna: { vps_cms: 82, vdf_cms: null } },
    } }),
  });
  assert.equal(irPorExtenso.warnings.at(-1)?.code, "ISOLATED_IR_NOT_APPLICABLE");

  const irComParCompleto = await extractCompanionCarotidFormPatch({
    request: {
      contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
      category: "DOPPLER_CAROTIDAS",
      sourceKind: "text",
      text: "ACI direita PSV 82, VDF 24 e IR 0,71",
    },
    extract: async () => ({ findings }),
  });
  assert.equal(irComParCompleto.warnings.at(-1)?.code, "ISOLATED_IR_NOT_APPLICABLE");
  assert.equal(irComParCompleto.warnings.at(-1)?.blocking, false);
  assert.match(irComParCompleto.warnings.at(-1)?.message ?? "", /calculado/);

  const verboIr = await extractCompanionCarotidFormPatch({
    request: {
      contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
      category: "DOPPLER_CAROTIDAS",
      sourceKind: "text",
      text: "Não consegui ir além do bulbo; VPS 82",
    },
    extract: async () => ({ findings }),
  });
  assert.equal(verboIr.warnings.some((warning) => warning.code === "ISOLATED_IR_NOT_APPLICABLE"), false);

  console.log("companion carotid form patch: 21 verificações aprovadas");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
