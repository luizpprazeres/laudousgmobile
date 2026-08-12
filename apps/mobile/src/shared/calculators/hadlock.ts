/**
 * Peso fetal estimado (Hadlock 4, 1985) + percentil por curva de referência.
 * Port literal do LaudoUSG iOS (Services/HadlockCalculator.swift +
 * PercentileTable+Hadlock/Intergrowth/WHOMulticentre.swift).
 *
 * Fidelidade numérica absoluta ao Swift: fórmula log10(EFW), tabelas de
 * percentil completas, interpolação linear entre semanas, z→percentil via
 * a mesma zTable do Doppler Barcelona, arredondamentos idênticos.
 *
 * Peso: Hadlock 4 (1985) — usa DBP, CC, CA, CF (todos em cm).
 * Percentil: Intergrowth-21st (default), Hadlock 1991 ou WHO Multicentre 2017.
 */

// ─── Tipos ────────────────────────────────────────────────────────────

export type Sex = "male" | "female" | "unisex";

export const SexDisplayName: Record<Sex, string> = {
  male: "masculino",
  female: "feminino",
  unisex: "não informado",
};

export type WeightFormula = "hadlock4_1985";

export const WeightFormulaDisplayName: Record<WeightFormula, string> = {
  hadlock4_1985: "Hadlock 4 (1985)",
};

export type PercentileSource =
  | "intergrowth21st"
  | "hadlock1991"
  | "whoMulticentre2017";

export const PercentileSourceDisplayName: Record<PercentileSource, string> = {
  intergrowth21st: "Intergrowth-21st",
  hadlock1991: "Hadlock 1991",
  whoMulticentre2017: "WHO Multicentre 2017",
};

export interface BiometryInput {
  /** Diâmetro biparietal (mm ou cm — normaliza automático). */
  dbp: number;
  /** Circunferência da cabeça. */
  cc: number;
  /** Circunferência abdominal. */
  ca: number;
  /** Comprimento do fêmur. */
  cf: number;
  igWeeks: number;
  igDays: number;
  sex?: Sex;
}

export interface BiometryResult {
  weightGrams: number;
  weightVariation: number;
  percentileValue: number;
  percentileLabel: string;
  isSGA: boolean;
  isLGA: boolean;
  insertBloco: string;
  formulaUsed: WeightFormula;
  percentileSourceUsed: PercentileSource;
  sexDetected: Sex;
  sexUsedInLookup: Sex;
  sourceVersion: string;
}

// ─── PercentileBand + z→percentil ─────────────────────────────────────

interface PercentileBand {
  p3: number;
  p10: number;
  p50: number;
  p90: number;
  p97: number;
}

// zTable idêntica ao DopplerCalculator.swift (Barcelona FMF).
const Z_TABLE: [number, number][] = [
  [-3.719, 0.01], [-3.09, 0.1], [-2.576, 0.5], [-2.326, 1], [-2.054, 2],
  [-1.96, 2.5], [-1.881, 3], [-1.751, 4], [-1.645, 5], [-1.555, 6],
  [-1.476, 7], [-1.405, 8], [-1.341, 9], [-1.282, 10], [-1.227, 11],
  [-1.175, 12], [-1.126, 13], [-1.08, 14], [-1.036, 15], [-0.994, 16],
  [-0.954, 17], [-0.915, 18], [-0.878, 19], [-0.842, 20], [-0.806, 21],
  [-0.772, 22], [-0.739, 23], [-0.706, 24], [-0.674, 25], [-0.643, 26],
  [-0.613, 27], [-0.583, 28], [-0.553, 29], [-0.524, 30], [-0.496, 31],
  [-0.468, 32], [-0.44, 33], [-0.412, 34], [-0.385, 35], [-0.358, 36],
  [-0.332, 37], [-0.305, 38], [-0.279, 39], [-0.253, 40], [-0.228, 41],
  [-0.202, 42], [-0.176, 43], [-0.151, 44], [-0.126, 45], [-0.1, 46],
  [-0.075, 47], [-0.05, 48], [-0.025, 49], [0, 50], [0.025, 51],
  [0.05, 52], [0.075, 53], [0.1, 54], [0.126, 55], [0.151, 56],
  [0.176, 57], [0.202, 58], [0.228, 59], [0.253, 60], [0.279, 61],
  [0.305, 62], [0.332, 63], [0.358, 64], [0.385, 65], [0.412, 66],
  [0.44, 67], [0.468, 68], [0.496, 69], [0.524, 70], [0.553, 71],
  [0.583, 72], [0.613, 73], [0.643, 74], [0.674, 75], [0.706, 76],
  [0.739, 77], [0.772, 78], [0.806, 79], [0.842, 80], [0.878, 81],
  [0.915, 82], [0.954, 83], [0.994, 84], [1.036, 85], [1.08, 86],
  [1.126, 87], [1.175, 88], [1.227, 89], [1.282, 90], [1.341, 91],
  [1.405, 92], [1.476, 93], [1.555, 94], [1.645, 95], [1.751, 96],
  [1.881, 97], [1.96, 97.5], [2.054, 98], [2.326, 99], [2.576, 99.5],
  [3.09, 99.9], [3.719, 99.99],
];

function zToPercentile(z: number): number {
  const first = Z_TABLE[0]!;
  const last = Z_TABLE[Z_TABLE.length - 1]!;
  if (z <= first[0]) return first[1];
  if (z >= last[0]) return last[1];
  for (let i = 0; i < Z_TABLE.length - 1; i++) {
    const a = Z_TABLE[i]!;
    const b = Z_TABLE[i + 1]!;
    if (z >= a[0] && z < b[0]) {
      const t = (z - a[0]) / (b[0] - a[0]);
      const p = a[1] + t * (b[1] - a[1]);
      return Math.round(p);
    }
  }
  return 50;
}

function percentileForBand(weight: number, band: PercentileBand): number {
  const sigma = (band.p90 - band.p10) / 2.5631;
  if (sigma <= 0) return 50;
  const z = (weight - band.p50) / sigma;
  return Math.round(zToPercentile(z));
}

function percentileLabel(p: number): string {
  if (p < 3) return "percentil < 3";
  if (p > 97) return "percentil > 97";
  return `percentil ${p}`;
}

function interpolateBand(
  a: PercentileBand,
  b: PercentileBand,
  fraction: number,
): PercentileBand {
  return {
    p3: a.p3 + (b.p3 - a.p3) * fraction,
    p10: a.p10 + (b.p10 - a.p10) * fraction,
    p50: a.p50 + (b.p50 - a.p50) * fraction,
    p90: a.p90 + (b.p90 - a.p90) * fraction,
    p97: a.p97 + (b.p97 - a.p97) * fraction,
  };
}

// ─── Tabela Intergrowth-21st (Stirnemann 2016) ────────────────────────

const INTERGROWTH_VERSION = "intergrowth21st-2016-stirnemann";
const INTERGROWTH_UNISEX: Record<number, PercentileBand> = {
  22: { p3: 463, p10: 481, p50: 525, p90: 578, p97: 607 },
  23: { p3: 516, p10: 538, p50: 592, p90: 658, p97: 694 },
  24: { p3: 575, p10: 602, p50: 668, p90: 751, p97: 796 },
  25: { p3: 642, p10: 675, p50: 756, p90: 857, p97: 913 },
  26: { p3: 716, p10: 757, p50: 856, p90: 980, p97: 1048 },
  27: { p3: 800, p10: 848, p50: 969, p90: 1119, p97: 1202 },
  28: { p3: 892, p10: 951, p50: 1097, p90: 1277, p97: 1376 },
  29: { p3: 994, p10: 1064, p50: 1239, p90: 1453, p97: 1570 },
  30: { p3: 1105, p10: 1189, p50: 1396, p90: 1648, p97: 1784 },
  31: { p3: 1226, p10: 1325, p50: 1568, p90: 1861, p97: 2017 },
  32: { p3: 1356, p10: 1472, p50: 1755, p90: 2090, p97: 2267 },
  33: { p3: 1495, p10: 1630, p50: 1954, p90: 2332, p97: 2529 },
  34: { p3: 1641, p10: 1796, p50: 2162, p90: 2582, p97: 2798 },
  35: { p3: 1794, p10: 1969, p50: 2378, p90: 2836, p97: 3069 },
  36: { p3: 1951, p10: 2146, p50: 2594, p90: 3086, p97: 3331 },
  37: { p3: 2109, p10: 2323, p50: 2806, p90: 3324, p97: 3578 },
  38: { p3: 2266, p10: 2496, p50: 3006, p90: 3540, p97: 3798 },
  39: { p3: 2416, p10: 2658, p50: 3186, p90: 3726, p97: 3982 },
  40: { p3: 2554, p10: 2805, p50: 3338, p90: 3871, p97: 4121 },
};

function intergrowthLookup(igWeeks: number, igDays: number): PercentileBand | null {
  const totalDays = igWeeks * 7 + igDays;
  const clampedWeek = Math.max(22, Math.min(40, Math.trunc(totalDays / 7)));
  const fraction = (totalDays - clampedWeek * 7) / 7;
  const band = INTERGROWTH_UNISEX[clampedWeek];
  if (!band) return null;
  if (fraction === 0) return band;
  const nextBand = INTERGROWTH_UNISEX[clampedWeek + 1];
  if (clampedWeek >= 40 || !nextBand) return band;
  return interpolateBand(band, nextBand, fraction);
}

// ─── Tabela Hadlock 1991 (Gardosi/Mikolajczyk 2011) ───────────────────

const HADLOCK_VERSION = "hadlock-1991-gardosi-mikolajczyk-2011";
const HADLOCK_UNISEX: Record<number, PercentileBand> = {
  24: { p3: 537, p10: 582, p50: 678, p90: 775, p97: 820 },
  25: { p3: 627, p10: 680, p50: 792, p90: 905, p97: 957 },
  26: { p3: 727, p10: 788, p50: 918, p90: 1049, p97: 1110 },
  27: { p3: 837, p10: 907, p50: 1057, p90: 1207, p97: 1278 },
  28: { p3: 957, p10: 1037, p50: 1209, p90: 1380, p97: 1460 },
  29: { p3: 1086, p10: 1177, p50: 1372, p90: 1567, p97: 1658 },
  30: { p3: 1224, p10: 1327, p50: 1546, p90: 1766, p97: 1868 },
  31: { p3: 1370, p10: 1485, p50: 1730, p90: 1976, p97: 2091 },
  32: { p3: 1522, p10: 1650, p50: 1923, p90: 2196, p97: 2323 },
  33: { p3: 1679, p10: 1820, p50: 2121, p90: 2423, p97: 2563 },
  34: { p3: 1840, p10: 1994, p50: 2324, p90: 2654, p97: 2808 },
  35: { p3: 2002, p10: 2169, p50: 2528, p90: 2887, p97: 3055 },
  36: { p3: 2162, p10: 2343, p50: 2731, p90: 3119, p97: 3300 },
  37: { p3: 2319, p10: 2513, p50: 2929, p90: 3345, p97: 3540 },
  38: { p3: 2470, p10: 2677, p50: 3120, p90: 3562, p97: 3770 },
  39: { p3: 2612, p10: 2831, p50: 3299, p90: 3767, p97: 3986 },
  40: { p3: 2742, p10: 2972, p50: 3464, p90: 3956, p97: 4186 },
  41: { p3: 2859, p10: 3099, p50: 3611, p90: 4124, p97: 4364 },
};

function hadlockLookup(igWeeks: number, igDays: number): PercentileBand | null {
  const totalDays = igWeeks * 7 + igDays;
  const clampedWeek = Math.max(24, Math.min(41, Math.trunc(totalDays / 7)));
  const fraction = (totalDays - clampedWeek * 7) / 7;
  const band = HADLOCK_UNISEX[clampedWeek];
  if (!band) return null;
  if (fraction === 0) return band;
  const nextBand = HADLOCK_UNISEX[clampedWeek + 1];
  if (clampedWeek >= 41 || !nextBand) return band;
  return interpolateBand(band, nextBand, fraction);
}

// ─── Tabela WHO Multicentre 2017 (Kiserud) — pendente de curadoria ────
// Sexo-específica quando tabelas populadas; hoje vazia (fallback → null).
const WHO_VERSION = "who-multicentre-kiserud-2017-PENDING-CURATION";
const WHO_UNISEX: Record<number, PercentileBand> = {};
const WHO_BOYS: Record<number, PercentileBand> = {};
const WHO_GIRLS: Record<number, PercentileBand> = {};

function whoLookup(
  igWeeks: number,
  igDays: number,
  sex: Sex,
): PercentileBand | null {
  let table: Record<number, PercentileBand>;
  switch (sex) {
    case "male":
      table = Object.keys(WHO_BOYS).length === 0 ? WHO_UNISEX : WHO_BOYS;
      break;
    case "female":
      table = Object.keys(WHO_GIRLS).length === 0 ? WHO_UNISEX : WHO_GIRLS;
      break;
    default:
      table = WHO_UNISEX;
  }
  if (Object.keys(table).length === 0) return null;
  const totalDays = igWeeks * 7 + igDays;
  const clampedWeek = Math.max(14, Math.min(40, Math.trunc(totalDays / 7)));
  return table[clampedWeek] ?? null;
}

function whoUsedSex(requested: Sex): Sex {
  switch (requested) {
    case "male":
      return Object.keys(WHO_BOYS).length === 0 ? "unisex" : "male";
    case "female":
      return Object.keys(WHO_GIRLS).length === 0 ? "unisex" : "female";
    default:
      return "unisex";
  }
}

// ─── Lookup unificado ─────────────────────────────────────────────────

interface PercentileLookup {
  percentile: number;
  sexUsed: Sex;
  version: string;
}

function percentileLookup(
  source: PercentileSource,
  weight: number,
  igWeeks: number,
  igDays: number,
  sex: Sex,
): PercentileLookup | null {
  switch (source) {
    case "intergrowth21st": {
      const band = intergrowthLookup(igWeeks, igDays);
      return {
        percentile: band ? percentileForBand(weight, band) : 50,
        sexUsed: "unisex",
        version: INTERGROWTH_VERSION,
      };
    }
    case "hadlock1991": {
      const band = hadlockLookup(igWeeks, igDays);
      return {
        percentile: band ? percentileForBand(weight, band) : 50,
        sexUsed: "unisex",
        version: HADLOCK_VERSION,
      };
    }
    case "whoMulticentre2017": {
      const band = whoLookup(igWeeks, igDays, sex);
      if (!band) return null;
      return {
        percentile: percentileForBand(weight, band),
        sexUsed: whoUsedSex(sex),
        version: WHO_VERSION,
      };
    }
  }
}

// ─── Normalização de medidas ──────────────────────────────────────────

// Se >20, assume mm → converte pra cm (idêntico ao Swift normalizeCm).
function normalizeCm(value: number): number {
  return value > 20 ? value / 10 : value;
}

// ─── Bloco de inserção (texto IDÊNTICO ao Swift) ──────────────────────

function insertBlock(
  weight: number,
  variation: number,
  label: string,
  source: PercentileSource,
  sexDetected: Sex,
  sexUsedInLookup: Sex,
): string {
  let suffix = "";
  if (sexUsedInLookup !== "unisex" && source === "whoMulticentre2017") {
    suffix = ` — curva ${SexDisplayName[sexUsedInLookup]}`;
  }
  let text = `Peso fetal estimado em ${weight} g (±${variation} g, ${label} ${PercentileSourceDisplayName[source]}${suffix}).`;
  if (sexDetected !== "unisex") {
    text += ` Sexo ${SexDisplayName[sexDetected]} detectado nos achados.`;
  }
  return text;
}

/**
 * Peso fetal estimado + percentil. Retorna null se alguma medida (após
 * normalização pra cm) for <= 1, ou se o lookup WHO falhar (tabela vazia).
 */
export function calcularHadlock(
  input: BiometryInput,
  weightFormula: WeightFormula = "hadlock4_1985",
  percentileSource: PercentileSource = "intergrowth21st",
): BiometryResult | null {
  const sex = input.sex ?? "unisex";
  const dbpCm = normalizeCm(input.dbp);
  const ccCm = normalizeCm(input.cc);
  const caCm = normalizeCm(input.ca);
  const cfCm = normalizeCm(input.cf);

  if (!(dbpCm > 1 && ccCm > 1 && caCm > 1 && cfCm > 1)) return null;

  // Hadlock 4 (1985): log10(EFW) com DBP, CC, CA, CF em cm.
  const logEFW =
    1.3596 -
    0.00386 * caCm * cfCm +
    0.0064 * ccCm +
    0.00061 * dbpCm * caCm +
    0.0424 * caCm +
    0.174 * cfCm;

  const efw = Math.pow(10, logEFW);
  const weight = Math.round(efw);
  const variation = Math.round(efw * 0.15);

  const lookup = percentileLookup(
    percentileSource,
    weight,
    input.igWeeks,
    input.igDays,
    sex,
  );
  if (!lookup) return null;

  const percentileValue = lookup.percentile;
  const label = percentileLabel(percentileValue);
  const bloco = insertBlock(
    weight,
    variation,
    label,
    percentileSource,
    sex,
    lookup.sexUsed,
  );

  return {
    weightGrams: weight,
    weightVariation: variation,
    percentileValue,
    percentileLabel: label,
    isSGA: percentileValue < 10,
    isLGA: percentileValue > 90,
    insertBloco: bloco,
    formulaUsed: weightFormula,
    percentileSourceUsed: percentileSource,
    sexDetected: sex,
    sexUsedInLookup: lookup.sexUsed,
    sourceVersion: lookup.version,
  };
}
