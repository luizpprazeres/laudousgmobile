import { z } from "zod";

/**
 * Primitivos dos contratos vasculares candidatos.
 *
 * Este diretório não possui index e não é exportado por `@laudousg/shared`.
 * Os contratos permanecem dormentes até revisão médica e integração explícita.
 */
export const SideSchema = z.enum(["right", "left"]);
export const LateralitySchema = z.enum(["right", "left", "bilateral"]);
export const AssessmentStateSchema = z.enum([
  "not_assessed",
  "normal",
  "abnormal",
  "limited",
]);

export const SourceOriginSchema = z.enum([
  "dictation",
  "manual_selection",
  "device_import",
]);

export const SourceEvidenceSchema = z.object({
  sourceId: z.string().trim().min(1).max(200),
  /** Fragmento sintético ou referência interna; nunca texto integral de concorrente. */
  evidence: z.string().trim().min(1).max(500),
}).strict();

export const MeasurementIdentitySchema = z.object({
  id: z.string().trim().min(1).max(120),
  origin: SourceOriginSchema,
  source: SourceEvidenceSchema,
  physicianConfirmed: z.boolean(),
}).strict();

export const LimitationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  territory: z.string().trim().min(1).max(200),
}).strict();

export type ContractIssueSeverity = "blocker" | "pending";
export type ContractIssue = {
  code: string;
  path: string;
  severity: ContractIssueSeverity;
};

export function contractIssue(
  code: string,
  path: string,
  severity: ContractIssueSeverity = "blocker",
): ContractIssue {
  return { code, path, severity };
}

export function isRequestedSide(
  laterality: z.infer<typeof LateralitySchema>,
  side: z.infer<typeof SideSchema>,
): boolean {
  return laterality === "bilateral" || laterality === side;
}

export function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function nearlyEqual(actual: number, expected: number): boolean {
  return Number.isFinite(actual) && Number.isFinite(expected) &&
    Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(actual), Math.abs(expected));
}
