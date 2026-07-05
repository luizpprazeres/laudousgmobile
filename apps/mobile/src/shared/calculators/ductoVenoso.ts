/**
 * Z-score do índice de pulsatilidade (IP) do ducto venoso fetal — marcador de
 * função cardíaca direita / oxigenação fetal. Baseado em Hecher 2001.
 *
 * Port literal de Services/DuctoVenosoCalculator.swift.
 *
 * Mediana decresce com IG: ~1.00 (20 sem) → ~0.55 (40 sem). SD ~ 0.16.
 *
 * Classificação:
 * - Z < 1.5: normal
 * - 1.5 ≤ Z < 2.0: limítrofe — vigilância
 * - Z ≥ 2.0: alterado (sugere comprometimento)
 * - Onda A reversa/ausente: padrão patológico independente do Z
 */

export type OndaA = "positiva" | "ausente" | "reversa";

export type DuctoVenosoClassification =
  | "normal"
  | "limitrofe"
  | "alterado"
  | "ondaPatologica";

export interface DuctoVenosoInput {
  igWeeks: number;
  pi: number;
  ondaA: OndaA;
}

export interface DuctoVenosoResult {
  pi: number;
  medianExpected: number;
  zScore: number;
  percentile: number;
  classification: DuctoVenosoClassification;
  insertBloco: string;
}

const ONDA_A_LABEL: Record<OndaA, string> = {
  positiva: "Onda A positiva",
  ausente: "Onda A ausente",
  reversa: "Onda A reversa",
};

const CLASSIFICATION_LABEL: Record<DuctoVenosoClassification, string> = {
  normal: "Doppler do ducto venoso dentro da normalidade",
  limitrofe: "Doppler do ducto venoso limítrofe — recomenda-se vigilância",
  alterado:
    "Doppler do ducto venoso alterado — sugere comprometimento hemodinâmico fetal",
  ondaPatologica:
    "Padrão patológico ao Doppler do ducto venoso — sugere descompensação cardíaca direita",
};

// Lookup table: z-score → percentile (compartilhada com a calculadora Barcelona
// FMF; idêntica à do doppler.ts / DopplerCalculator.swift).
const Z_TABLE: [number, number][] = [
  [-3.719, 0.01],
  [-3.09, 0.1],
  [-2.576, 0.5],
  [-2.326, 1],
  [-2.054, 2],
  [-1.96, 2.5],
  [-1.881, 3],
  [-1.751, 4],
  [-1.645, 5],
  [-1.555, 6],
  [-1.476, 7],
  [-1.405, 8],
  [-1.341, 9],
  [-1.282, 10],
  [-1.227, 11],
  [-1.175, 12],
  [-1.126, 13],
  [-1.08, 14],
  [-1.036, 15],
  [-0.994, 16],
  [-0.954, 17],
  [-0.915, 18],
  [-0.878, 19],
  [-0.842, 20],
  [-0.806, 21],
  [-0.772, 22],
  [-0.739, 23],
  [-0.706, 24],
  [-0.674, 25],
  [-0.643, 26],
  [-0.613, 27],
  [-0.583, 28],
  [-0.553, 29],
  [-0.524, 30],
  [-0.496, 31],
  [-0.468, 32],
  [-0.44, 33],
  [-0.412, 34],
  [-0.385, 35],
  [-0.358, 36],
  [-0.332, 37],
  [-0.305, 38],
  [-0.279, 39],
  [-0.253, 40],
  [-0.228, 41],
  [-0.202, 42],
  [-0.176, 43],
  [-0.151, 44],
  [-0.126, 45],
  [-0.1, 46],
  [-0.075, 47],
  [-0.05, 48],
  [-0.025, 49],
  [0.0, 50],
  [0.025, 51],
  [0.05, 52],
  [0.075, 53],
  [0.1, 54],
  [0.126, 55],
  [0.151, 56],
  [0.176, 57],
  [0.202, 58],
  [0.228, 59],
  [0.253, 60],
  [0.279, 61],
  [0.305, 62],
  [0.332, 63],
  [0.358, 64],
  [0.385, 65],
  [0.412, 66],
  [0.44, 67],
  [0.468, 68],
  [0.496, 69],
  [0.524, 70],
  [0.553, 71],
  [0.583, 72],
  [0.613, 73],
  [0.643, 74],
  [0.674, 75],
  [0.706, 76],
  [0.739, 77],
  [0.772, 78],
  [0.806, 79],
  [0.842, 80],
  [0.878, 81],
  [0.915, 82],
  [0.954, 83],
  [0.994, 84],
  [1.036, 85],
  [1.08, 86],
  [1.126, 87],
  [1.175, 88],
  [1.227, 89],
  [1.282, 90],
  [1.341, 91],
  [1.405, 92],
  [1.476, 93],
  [1.555, 94],
  [1.645, 95],
  [1.751, 96],
  [1.881, 97],
  [1.96, 97.5],
  [2.054, 98],
  [2.326, 99],
  [2.576, 99.5],
  [3.09, 99.9],
  [3.719, 99.99],
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

/** Mediana de PI do ducto venoso por IG (Hecher 2001, regressão linear). */
function medianFor(igWeeks: number): number {
  // Linear approximation: 0.92 - 0.014 * IG (cm/s decresce com idade)
  return Math.max(0.4, 0.92 - 0.014 * igWeeks);
}

const SD = 0.16;

// Formata com 2 casas e vírgula decimal (equivalente a String(format: "%.2f")).
function fmt2(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

// Equivalente a String(format: "%+.2f") — sinal sempre visível.
function fmtSigned2(v: number): string {
  const s = v.toFixed(2);
  return (v >= 0 ? "+" + s : s).replace(".", ",");
}

export function calcularDuctoVenoso(
  input: DuctoVenosoInput,
): DuctoVenosoResult | null {
  if (!(input.igWeeks >= 20 && input.igWeeks <= 40 && input.pi > 0)) {
    return null;
  }

  const median = medianFor(input.igWeeks);
  const z = (input.pi - median) / SD;
  const percentile = Math.round(zToPercentile(z));

  let cls: DuctoVenosoClassification;
  if (input.ondaA !== "positiva") {
    cls = "ondaPatologica";
  } else if (z < 1.5) {
    cls = "normal";
  } else if (z < 2.0) {
    cls = "limitrofe";
  } else {
    cls = "alterado";
  }

  const piFmt = fmt2(input.pi);
  const medFmt = fmt2(median);
  const zFmt = fmtSigned2(z);

  const bloco = `Doppler do ducto venoso:
- IP: ${piFmt} (mediana esperada para ${input.igWeeks} sem: ${medFmt}).
- Z-score: ${zFmt} (percentil ${percentile}).
- ${ONDA_A_LABEL[input.ondaA]}.

Conclusão: ${CLASSIFICATION_LABEL[cls]}.`;

  return {
    pi: input.pi,
    medianExpected: median,
    zScore: z,
    percentile,
    classification: cls,
    insertBloco: bloco,
  };
}

export function ductoVenosoClassificationLabel(
  cls: DuctoVenosoClassification,
): string {
  return CLASSIFICATION_LABEL[cls];
}
