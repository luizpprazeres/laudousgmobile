import { reportSpecSchema, type ReportSpec } from "./types";
import abdomenTotalRaw from "./specs/abdomenTotal.json";
import pelveRaw from "./specs/PELVE_FEMININA.json";
import obstetricaRaw from "./specs/OBSTETRICA.json";
import dopplerObstetricoRaw from "./specs/DOPPLER_OBSTETRICO.json";
import morfologicoRaw from "./specs/MORFOLOGICO.json";

/**
 * Carrega o ReportSpec de uma categoria (dado tipado, validado por Zod).
 * v1 = spec embutido no código. No futuro (Fase 6) isto vem do DB por
 * (médico × categoria × estilo), na versão `published`.
 */
const SPECS: Record<string, unknown> = {
  ABDOMEN_TOTAL: abdomenTotalRaw,
  PELVE_FEMININA: pelveRaw,
  OBSTETRICA: obstetricaRaw,
  DOPPLER_OBSTETRICO: dopplerObstetricoRaw,
  MORFOLOGICO: morfologicoRaw,
};

export function loadSpecV2(categoryCode: string): ReportSpec | null {
  const raw = SPECS[categoryCode];
  if (!raw) return null;
  return reportSpecSchema.parse(raw);
}
