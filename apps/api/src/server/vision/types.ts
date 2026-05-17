/**
 * Tipos para análise de imagens de ultrassom (Vision API).
 * Port do laudousg/lib/types.ts — categorias suportadas e schema BiometricData.
 */

export type Category = "OBSTETRICA" | "DOPPLER_OBSTETRICO" | "MORFOLOGICO";

export const SUPPORTED_IMAGING_CATEGORIES: Category[] = [
  "OBSTETRICA",
  "DOPPLER_OBSTETRICO",
  "MORFOLOGICO",
];

export interface BiometricData {
  // Standard obstetric measurements (all categories)
  dbp?: string;
  cc?: string;
  ca?: string;
  cf?: string;
  weight?: string;
  weightVariation?: string;
  percentile?: string;
  gestAge?: string;
  gestAgeLMP?: string;
  gestAgeBiometry?: string;

  // Doppler-specific measurements (DOPPLER_OBSTETRICO only — IP only)
  ipRightUterine?: string;
  ipLeftUterine?: string;
  ipUmbilical?: string;
  ipMCA?: string;
  ipDuctusVenosus?: string;

  // Morfológico 2T additional measurements
  tibia?: string;
  fibula?: string;
  humerus?: string;
  radius?: string;
  ulna?: string;
  cerebellum?: string;
  cisternaMagna?: string;
  binocularDistance?: string;
  ila?: string;
  gender?: string;
}
