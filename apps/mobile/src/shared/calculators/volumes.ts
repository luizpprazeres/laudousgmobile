/**
 * Volumes por fórmula do elipsoide (W × H × L × 0,523).
 *
 * Port literal do LaudoUSG iOS:
 *  - Services/VolumeProstaticoCalculator.swift
 *  - Services/VolumeResidualCalculator.swift
 *  - Services/VolumeTireoideanoCalculator.swift
 *  - Services/VolumeUterinoCalculator.swift
 *
 * A constante do elipsoide é 0,523 (idêntica ao Swift). O volume tireoideano
 * usa 0,523 por lobo internamente (LobeInput.volume).
 */

const ELIPSOIDE = 0.523;

// Formata "%.1f" com vírgula (idêntico ao Swift).
function fmt1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

// Formata "%.0f" (inteiro arredondado, sem casas decimais).
function fmt0(v: number): string {
  return v.toFixed(0);
}

// Formata "%.2f" com vírgula.
function fmt2(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

// Dimensões "%.1f × %.1f × %.1f" com vírgula.
function dims(w: number, h: number, l: number): string {
  return `${fmt1(w)} × ${fmt1(h)} × ${fmt1(l)}`;
}

/* ============================================================
 * VOLUME PROSTÁTICO
 * ============================================================ */

export type VPClassification =
  | "normal"
  | "levementeAumentado"
  | "moderadamenteAumentado"
  | "acentuadamenteAumentado";

export function vpLabel(c: VPClassification): string {
  switch (c) {
    case "normal":
      return "Volume dentro da normalidade";
    case "levementeAumentado":
      return "Próstata levemente aumentada";
    case "moderadamenteAumentado":
      return "Próstata moderadamente aumentada";
    case "acentuadamenteAumentado":
      return "Próstata acentuadamente aumentada";
  }
}

export interface VPInput {
  widthCm: number; // transverso (L1)
  heightCm: number; // AP (L2)
  lengthCm: number; // crânio-caudal (L3)
  psaNgPerMl?: number | null; // opcional
}

export interface VPResult {
  volumeCc: number;
  classification: VPClassification;
  psaDensity: number | null;
  psaDensityElevated: boolean;
  insertBloco: string;
}

export function calcularVolumeProstatico(input: VPInput): VPResult | null {
  if (!(input.widthCm > 0 && input.heightCm > 0 && input.lengthCm > 0))
    return null;
  const vol = input.widthCm * input.heightCm * input.lengthCm * ELIPSOIDE;

  let cls: VPClassification;
  if (vol < 30) cls = "normal";
  else if (vol < 50) cls = "levementeAumentado";
  else if (vol < 80) cls = "moderadamenteAumentado";
  else cls = "acentuadamenteAumentado";

  let density: number | null = null;
  let densityElevated = false;
  const psa = input.psaNgPerMl;
  if (psa != null && psa > 0 && vol > 0) {
    density = psa / vol;
    densityElevated = density >= 0.15;
  }

  let bloco = `Próstata com dimensões de ${dims(
    input.widthCm,
    input.heightCm,
    input.lengthCm,
  )} cm.
Volume calculado (elipsoide): ${fmt1(vol)} cm³.

Conclusão: ${vpLabel(cls)}.`;

  if (density != null) {
    const suffix = densityElevated
      ? " — acima do limiar de 0,15 ng/mL/cc (sugere maior risco de Ca clinicamente significativo)."
      : ".";
    bloco += `\n\nPSA: ${fmt2(psa ?? 0)} ng/mL — densidade do PSA: ${fmt2(
      density,
    )} ng/mL/cc${suffix}`;
  }

  return {
    volumeCc: vol,
    classification: cls,
    psaDensity: density,
    psaDensityElevated: densityElevated,
    insertBloco: bloco,
  };
}

/* ============================================================
 * VOLUME RESIDUAL PÓS-MICCIONAL
 * ============================================================ */

export type VRClassification =
  | "ausente"
  | "borderline"
  | "moderado"
  | "significativo";

export function vrLabel(c: VRClassification): string {
  switch (c) {
    case "ausente":
      return "Sem retenção urinária significativa";
    case "borderline":
      return "Resíduo pós-miccional limítrofe";
    case "moderado":
      return "Resíduo pós-miccional aumentado (retenção urinária moderada)";
    case "significativo":
      return "Retenção urinária significativa";
  }
}

function vrRecomendacao(c: VRClassification): string {
  switch (c) {
    case "ausente":
      return "";
    case "borderline":
      return " Convém, a critério clínico, correlacionar com queixas urinárias.";
    case "moderado":
      return " Recomenda-se correlação clínico-urológica.";
    case "significativo":
      return " Recomenda-se avaliação urológica.";
  }
}

export interface VRInput {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
}

export interface VRResult {
  volumeMl: number;
  classification: VRClassification;
  insertBloco: string;
}

export function calcularVolumeResidual(input: VRInput): VRResult | null {
  if (!(input.widthCm > 0 && input.heightCm > 0 && input.lengthCm > 0))
    return null;
  const vol = input.widthCm * input.heightCm * input.lengthCm * ELIPSOIDE;

  let cls: VRClassification;
  if (vol < 50) cls = "ausente";
  else if (vol < 100) cls = "borderline";
  else if (vol < 200) cls = "moderado";
  else cls = "significativo";

  const bloco = `Bexiga após esvaziamento com dimensões de ${dims(
    input.widthCm,
    input.heightCm,
    input.lengthCm,
  )} cm.
Volume residual pós-miccional: ${fmt0(vol)} mL.

Conclusão: ${vrLabel(cls)}.${vrRecomendacao(cls)}`;

  return { volumeMl: vol, classification: cls, insertBloco: bloco };
}

/* ============================================================
 * VOLUME TIREOIDEANO
 * ============================================================ */

export type VTSex = "feminino" | "masculino";

export function vtSexLabel(s: VTSex): string {
  return s === "feminino" ? "Feminino" : "Masculino";
}

export function vtLimiteSuperior(s: VTSex): number {
  return s === "feminino" ? 18.0 : 25.0;
}

export type VTClassification = "normal" | "aumentado" | "reduzido";

export function vtLabel(c: VTClassification): string {
  switch (c) {
    case "normal":
      return "Volume tireoideano dentro da normalidade";
    case "aumentado":
      return "Volume tireoideano aumentado (compatível com bócio)";
    case "reduzido":
      return "Volume tireoideano reduzido";
  }
}

export interface VTLobeInput {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
}

function lobeVolume(l: VTLobeInput): number {
  return (
    Math.max(0, l.widthCm) *
    Math.max(0, l.heightCm) *
    Math.max(0, l.lengthCm) *
    ELIPSOIDE
  );
}

export interface VTInput {
  sex: VTSex;
  direito: VTLobeInput;
  esquerdo: VTLobeInput;
}

export interface VTResult {
  volumeDireito: number;
  volumeEsquerdo: number;
  volumeTotal: number;
  classification: VTClassification;
  insertBloco: string;
}

function lobeFmt(l: VTLobeInput): string {
  return `${fmt1(l.widthCm)} × ${fmt1(l.heightCm)} × ${fmt1(l.lengthCm)} cm`;
}

export function calcularVolumeTireoideano(input: VTInput): VTResult | null {
  const d = lobeVolume(input.direito);
  const e = lobeVolume(input.esquerdo);
  if (!(d > 0 || e > 0)) return null;
  const total = d + e;

  let cls: VTClassification;
  if (total < 4) cls = "reduzido";
  else if (total <= vtLimiteSuperior(input.sex)) cls = "normal";
  else cls = "aumentado";

  const bloco = `Lobo direito: ${lobeFmt(input.direito)} — volume: ${fmt1(
    d,
  )} mL.
Lobo esquerdo: ${lobeFmt(input.esquerdo)} — volume: ${fmt1(e)} mL.
Volume tireoideano total: ${fmt1(total)} mL (limite superior para ${vtSexLabel(
    input.sex,
  ).toLowerCase()}: ${fmt0(vtLimiteSuperior(input.sex))} mL).

Conclusão: ${vtLabel(cls)}.`;

  return {
    volumeDireito: d,
    volumeEsquerdo: e,
    volumeTotal: total,
    classification: cls,
    insertBloco: bloco,
  };
}

/* ============================================================
 * VOLUME UTERINO
 * ============================================================ */

export type VUHormonalStatus =
  | "preMenarca"
  | "nulipara"
  | "multipara"
  | "menopausa";

export const VU_STATUS: VUHormonalStatus[] = [
  "preMenarca",
  "nulipara",
  "multipara",
  "menopausa",
];

export function vuStatusLabel(s: VUHormonalStatus): string {
  switch (s) {
    case "preMenarca":
      return "Pré-menarca";
    case "nulipara":
      return "Menacme / nulípara";
    case "multipara":
      return "Menacme / multípara";
    case "menopausa":
      return "Menopausa";
  }
}

function vuFaixaNormal(s: VUHormonalStatus): [number, number] {
  switch (s) {
    case "preMenarca":
      return [0, 25];
    case "nulipara":
      return [40, 90];
    case "multipara":
      return [80, 130];
    case "menopausa":
      return [10, 60];
  }
}

export type VUClassification = "normal" | "acimaReferencia" | "abaixoReferencia";

export function vuClassLabel(
  c: VUClassification,
  status: VUHormonalStatus,
): string {
  const st = vuStatusLabel(status).toLowerCase();
  switch (c) {
    case "normal":
      return `Volume uterino dentro da normalidade para ${st}`;
    case "acimaReferencia":
      return `Volume uterino acima da referência para ${st}`;
    case "abaixoReferencia":
      return `Volume uterino abaixo da referência para ${st}`;
  }
}

export interface VUInput {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  status: VUHormonalStatus;
}

export interface VUResult {
  volumeCc: number;
  classification: VUClassification;
  conclusao: string;
  insertBloco: string;
}

export function calcularVolumeUterino(input: VUInput): VUResult | null {
  if (!(input.widthCm > 0 && input.heightCm > 0 && input.lengthCm > 0))
    return null;
  const vol = input.widthCm * input.heightCm * input.lengthCm * ELIPSOIDE;
  const [low, high] = vuFaixaNormal(input.status);

  let cls: VUClassification;
  if (vol < low) cls = "abaixoReferencia";
  else if (vol > high) cls = "acimaReferencia";
  else cls = "normal";

  const conclusao = vuClassLabel(cls, input.status);
  const bloco = `Útero com dimensões de ${dims(
    input.widthCm,
    input.heightCm,
    input.lengthCm,
  )} cm.
Volume calculado (elipsoide): ${fmt1(vol)} mL (referência para ${vuStatusLabel(
    input.status,
  ).toLowerCase()}: ${fmt0(low)}-${fmt0(high)} mL).

Conclusão: ${conclusao}.`;

  return { volumeCc: vol, classification: cls, conclusao, insertBloco: bloco };
}
