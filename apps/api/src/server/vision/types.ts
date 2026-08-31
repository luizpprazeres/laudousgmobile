/**
 * Tipos para análise de imagens de ultrassom (Vision API).
 * Port do laudousg/lib/types.ts — categorias suportadas e schema BiometricData.
 */

export type Category = "OBSTETRICA" | "DOPPLER_OBSTETRICO" | "MORFOLOGICO" | "TIREOIDE";
export type ImagingModule = "DOPPLER_OBSTETRICO";

export const SUPPORTED_IMAGING_CATEGORIES: Category[] = [
  "OBSTETRICA",
  "DOPPLER_OBSTETRICO",
  "MORFOLOGICO",
  "TIREOIDE",
];

export type ThyroidLobe = "lobo_direito" | "lobo_esquerdo" | "istmo";

export interface ThyroidMeasurements {
  a?: string;
  b?: string;
  c?: string;
}

export interface ThyroidNodule {
  lobe: ThyroidLobe;
  c1?: string;
  c2?: string;
  c3?: string;
  location?: string;
  echogenicity?: string;
  margin?: string;
  halo?: string;
  shape?: string;
  calcifications?: string;
  vascularization?: string;
}

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

  // Doppler obstétrico — módulo reutilizável em qualquer exame obstétrico.
  irRightUterine?: string;
  ipRightUterine?: string;
  irLeftUterine?: string;
  ipLeftUterine?: string;
  irUmbilical?: string;
  ipUmbilical?: string;
  irMCA?: string;
  ipMCA?: string;
  irDuctusVenosus?: string;
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

  // Tireoide — medidas em cm e descritores visíveis, sempre sujeitos a revisão.
  thyroidRightLobe?: ThyroidMeasurements;
  thyroidLeftLobe?: ThyroidMeasurements;
  thyroidIsthmus?: ThyroidMeasurements;
  thyroidNodules?: ThyroidNodule[];
}
