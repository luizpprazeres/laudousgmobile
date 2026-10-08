import assert from "node:assert/strict";
import {
  COMPANION_FORM_PATCH_CONTRACT_VERSION,
  CompanionFormPatchErrorSchema,
  CompanionFormPatchRequestSchema,
  CompanionFormPatchResponseSchema,
} from "../schemas/companionFormPatch";

const request = {
  contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
  category: "DOPPLER_CAROTIDAS",
  sourceKind: "transcript",
  text: "Carótida interna direita com VPS de 82 cm/s.",
};

assert.equal(CompanionFormPatchRequestSchema.safeParse(request).success, true);
assert.equal(CompanionFormPatchRequestSchema.safeParse({ ...request, text: "x".repeat(2_000) }).success, true);
assert.equal(CompanionFormPatchRequestSchema.safeParse({ ...request, text: "x".repeat(2_001) }).success, false);
assert.equal(CompanionFormPatchRequestSchema.safeParse({ ...request, category: "OBSTETRICA" }).success, false);
assert.equal(CompanionFormPatchRequestSchema.safeParse({ ...request, extra: true }).success, false);

const response = {
  contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
  category: "DOPPLER_CAROTIDAS",
  sourceKind: "transcript",
  data: {
    carotidMeasurements: [{ side: "direita", vessel: "interna", psv: "82", vdf: "0" }],
    carotidPlaques: [{
      side: "direita",
      location: "bulbo",
      composition: "mista",
      surface: "regular",
      thickness: "2.1",
      stenosisPercent: "35",
      description: "placa de contornos regulares",
    }],
    carotidClassifications: [{ side: "direita", classification: "estenose_menor_50" }],
    carotidConclusion: "Ateromatose carotídea à direita.",
    carotidAdditionalFindings: "Sem achados adicionais.",
  },
  warnings: [],
};

assert.equal(CompanionFormPatchResponseSchema.safeParse(response).success, true);
assert.equal(CompanionFormPatchResponseSchema.safeParse({
  ...response,
  data: { carotidMeasurements: [], carotidPlaques: [], carotidClassifications: [] },
}).success, false);
assert.equal(CompanionFormPatchResponseSchema.safeParse({
  ...response,
  data: { ...response.data, carotidMeasurements: [{ side: "direita", vessel: "interna", ir: "0.7" }] },
}).success, false, "IR isolado não pertence ao contrato aplicável");
assert.equal(CompanionFormPatchResponseSchema.safeParse({
  ...response,
  data: { ...response.data, carotidMeasurements: [{ side: "direita", vessel: "interna", psv: "30", vdf: "40" }] },
}).success, false, "VDF maior que PSV é rejeitada na fronteira");
assert.equal(CompanionFormPatchResponseSchema.safeParse({
  ...response,
  data: { ...response.data, carotidPlaques: [{ side: "direita", stenosisPercent: "101" }] },
}).success, false, "percentual de estenose fora de 0 a 100 é rejeitado");
assert.equal(CompanionFormPatchErrorSchema.safeParse({
  error: "no_applicable_findings",
  warnings: [{ code: "CLASSIFICATION_SIDE_MISSING", message: "lado ausente", blocking: true }],
}).success, true);

console.log("companion-form-patch contract: 12 verificações aprovadas");
