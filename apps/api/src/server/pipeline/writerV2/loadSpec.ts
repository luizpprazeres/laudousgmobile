import { reportSpecSchema, type ReportSpec } from "./types";
import abdomenTotalRaw from "./specs/abdomenTotal.json";

/**
 * Carrega o ReportSpec de uma categoria (dado tipado, validado por Zod).
 * v1 = spec embutido no código (abdome). No futuro (Fase 6) isto vem do DB por
 * (médico × categoria), na versão `published`.
 */
const SPECS: Record<string, unknown> = {
  ABDOMEN_TOTAL: abdomenTotalRaw,
};

export function loadSpecV2(categoryCode: string): ReportSpec | null {
  const raw = SPECS[categoryCode];
  if (!raw) return null;
  return reportSpecSchema.parse(raw);
}
