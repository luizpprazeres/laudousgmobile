import {
  ClinicalModelInputSchema,
  createInitialClinicalModelInput,
  renderClinicalModelReport,
  validateClinicalModelInput,
  type ClinicalModelCode,
  type ClinicalModelInput,
  type ClinicalModelIssue,
} from "@laudousg/shared";

export type ClinicalDraftResult =
  | { success: true; data: ClinicalModelInput; issues: ClinicalModelIssue[] }
  | { success: false; issues: ClinicalModelIssue[] };

export function createAndroidClinicalDraft(code: ClinicalModelCode): ClinicalModelInput {
  return createInitialClinicalModelInput(code);
}

/** Toda alteração clínica invalida uma revisão anterior. */
export function updateAndroidClinicalDraft(next: ClinicalModelInput): ClinicalModelInput {
  return { ...next, physicianReviewed: false } as ClinicalModelInput;
}

/**
 * Valida os achados para gerar a prévia, sem transformar geração em aprovação.
 * O estado original permanece physicianReviewed=false.
 */
export function validateAndroidClinicalDraft(value: ClinicalModelInput): ClinicalDraftResult {
  return validateClinicalModelInput(value, { requirePhysicianReview: false });
}

export function generateAndroidClinicalPreview(value: ClinicalModelInput): string {
  const draft = validateAndroidClinicalDraft(value);
  if (!draft.success) throw new Error(draft.issues.map((entry) => entry.message).join(" "));
  return renderClinicalModelReport(value);
}

/** A revisão confiável ocorre na API, depois de persistir texto e revisão. */
export function canReleaseAndroidClinicalDraft(value: ClinicalModelInput): boolean {
  return validateAndroidClinicalDraft(value).success;
}

export function serializeAndroidClinicalDraft(value: ClinicalModelInput): string {
  return JSON.stringify(ClinicalModelInputSchema.parse(value));
}

export function deserializeAndroidClinicalDraft(serialized: string): ClinicalModelInput {
  return ClinicalModelInputSchema.parse(JSON.parse(serialized));
}
