/**
 * Tipos para análise de imagens de ultrassom (Vision API).
 * Port do laudousg/lib/types.ts — categorias suportadas e schema BiometricData.
 */

export type Category = "OBSTETRICA" | "DOPPLER_OBSTETRICO" | "MORFOLOGICO" | "TIREOIDE" | "MAMARIA" | "DOPPLER_CAROTIDAS";
export type ImagingModule = "DOPPLER_OBSTETRICO";

export const SUPPORTED_IMAGING_CATEGORIES: Category[] = [
  "OBSTETRICA",
  "DOPPLER_OBSTETRICO",
  "MORFOLOGICO",
  "TIREOIDE",
  "MAMARIA",
  "DOPPLER_CAROTIDAS",
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

export interface BreastFinding {
  side: "direita" | "esquerda";
  type: "cisto_simples" | "multiplos_cistos" | "nodulo" | "calcificacoes";
  c1?: string;
  c2?: string;
  c3?: string;
  location?: string;
  hour?: string;
  distanceSkin?: string;
  distanceNipple?: string;
  echogenicity?: string;
  shape?: string;
  margin?: string;
  orientation?: string;
  posterior?: string;
  calcifications?: string;
}

export interface CarotidMeasurement {
  side: "direita" | "esquerda";
  vessel: "comum" | "interna" | "externa" | "vertebral";
  psv?: string;
  vdf?: string;
  ir?: string;
  emi?: string;
  flowDirection?: "anterogrado" | "retrogrado" | "ausente";
}

export interface CarotidPlaque {
  side: "direita" | "esquerda";
  location?: string;
  thickness?: string;
  stenosisPercent?: string;
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

  // Mamas — múltiplos achados, sem classificação BI-RADS automática pela visão.
  breastFindings?: BreastFinding[];
  carotidMeasurements?: CarotidMeasurement[];
  carotidPlaques?: CarotidPlaque[];
}
