/**
 * Anemia Fetal por PSV-ACM — port literal do LaudoUSG original
 * (lib/anemiaCalculator.ts).
 *
 * Fórmulas extraídas da Fetal Medicine Barcelona (fetalmedicinebarcelona.org),
 * função anemia_doppler_cerebral() em calc.js.
 *
 * Uso: avaliação de anemia fetal por dopplervelocimetria da ACM.
 *   Velocidade esperada (cm/s) = exp(2.31 + 0.046 × GA)
 *   MoM = PSV_ACM / velocidade_esperada
 *
 * Cutoffs Barcelona FMF:
 *   > 1.6 MoM → grave
 *   > 1.5 MoM → moderada
 *   > 1.3 MoM → leve
 *   ≤ 1.3 MoM → normal
 */

export type AnemiaGrau = "normal" | "leve" | "moderada" | "grave";

export interface AnemiaInput {
  /** Idade gestacional em semanas decimais (weeks + days/7). */
  ga: number;
  /** Pico da velocidade sistólica da ACM em cm/s. */
  psvACM: number;
}

export interface AnemiaResult {
  psvACM: number;
  psvEsperado: number;
  mom: number;
  grau: AnemiaGrau;
  semSinais: boolean;
  descricao: string;
  blocoTexto: string;
}

function calcVelocidadeEsperada(ga: number): number {
  return Math.exp(2.31 + 0.046 * ga);
}

function classificarAnemia(mom: number): AnemiaGrau {
  if (mom > 1.6) return "grave";
  if (mom > 1.5) return "moderada";
  if (mom > 1.3) return "leve";
  return "normal";
}

export function calcularAnemia(input: AnemiaInput): AnemiaResult {
  const { ga, psvACM } = input;
  const psvEsperado = calcVelocidadeEsperada(ga);
  const mom = psvACM / psvEsperado;
  const grau = classificarAnemia(mom);
  const semSinais = grau === "normal";

  const descricaoGrau: Record<AnemiaGrau, string> = {
    normal: "sem sinais de anemia",
    leve: "com sinais de anemia leve",
    moderada: "com sinais de anemia moderada",
    grave: "com sinais de anemia grave",
  };

  const descricao = descricaoGrau[grau];
  const blocoTexto = formatarBlocoAnemia(psvACM, psvEsperado, mom, grau);

  return { psvACM, psvEsperado, mom, grau, semSinais, descricao, blocoTexto };
}

function formatarBlocoAnemia(
  psv: number,
  psvEsperado: number,
  mom: number,
  grau: AnemiaGrau,
): string {
  const grauLabel: Record<AnemiaGrau, string> = {
    normal: "Sem sinais de anemia",
    leve: "Anemia leve (MoM > 1,3)",
    moderada: "Anemia moderada (MoM > 1,5)",
    grave: "Anemia grave (MoM > 1,6)",
  };

  return [
    "AVALIAÇÃO DE ANEMIA FETAL (PSV-ACM):",
    `Pico da velocidade sistólica da ACM: ${psv.toFixed(1)} cm/s`,
    `Valor esperado para a IG: ${psvEsperado.toFixed(1)} cm/s`,
    `MoM: ${mom.toFixed(2)}`,
    `Resultado: ${grauLabel[grau]}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Variante MCA-PSV (Mari, 2000) — port literal do LaudoUSG iOS
// (Services/AnemiaMCAPSVCalculator.swift). Usa a tabela explícita de
// medianas por IG (evita erros de cálculo em produção) e os cutoffs de
// MoM 1,29 / 1,50 de Mari 2000. É a variante consumida pela sheet nativa,
// distinta da fórmula Barcelona FMF acima (mantida para o Doppler web).
// ─────────────────────────────────────────────────────────────────────

export type AnemiaSeverity = "normal" | "mild" | "moderateSevere";

export interface AnemiaMCAPSVInput {
  igWeeks: number;
  igDays: number;
  /** Velocidade de pico sistólico da ACM em cm/s. */
  psvCmSec: number;
}

export interface AnemiaMCAPSVResult {
  psv: number;
  medianExpected: number;
  mom: number;
  severity: AnemiaSeverity;
  insertBloco: string;
}

export const AnemiaSeverityLabel: Record<AnemiaSeverity, string> = {
  normal: "MCA-PSV dentro da normalidade — sem evidência de anemia fetal",
  mild: "MCA-PSV elevado — suspeita de anemia fetal leve",
  moderateSevere:
    "MCA-PSV ≥ 1,50 MoM — suspeita de anemia fetal moderada a severa; considerar transfusão intrauterina",
};

const AnemiaSeverityRecomendacao: Record<AnemiaSeverity, string> = {
  normal: "",
  mild: " Reavaliar em 1-2 semanas com novo Doppler.",
  moderateSevere:
    " Convém, a critério clínico, encaminhar a centro de referência em medicina fetal para avaliação imediata.",
};

/**
 * Mediana MCA-PSV (cm/s) por IG (Mari 2000, simplificado).
 * Fórmula: mediana = e^(2.31 + 0.046 × IG_decimal), tabelada explicitamente.
 */
const MCAPSV_MEDIAN_TABLE: Record<number, number> = {
  18: 23.2, 19: 24.3, 20: 25.5, 21: 26.7, 22: 28.0,
  23: 29.3, 24: 30.7, 25: 32.1, 26: 33.6, 27: 35.2,
  28: 36.9, 29: 38.7, 30: 40.5, 31: 42.4, 32: 44.4,
  33: 46.5, 34: 48.7, 35: 51.0, 36: 53.4, 37: 55.9,
  38: 58.5, 39: 61.3, 40: 64.1,
};

// Arredonda a 1 casa e formata sempre com 1 decimal + vírgula (idêntico ao Swift).
function formatNumberBR(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}

export function calcularAnemiaMCAPSV(
  input: AnemiaMCAPSVInput,
): AnemiaMCAPSVResult | null {
  if (!(input.igWeeks >= 18 && input.igWeeks <= 40 && input.psvCmSec > 0)) {
    return null;
  }

  const clampedWeek = Math.max(18, Math.min(40, input.igWeeks));
  const median = MCAPSV_MEDIAN_TABLE[clampedWeek];
  if (median === undefined) return null;

  const mom = input.psvCmSec / median;

  let severity: AnemiaSeverity;
  if (mom < 1.29) severity = "normal";
  else if (mom < 1.5) severity = "mild";
  else severity = "moderateSevere"; // ≥1.50 MoM (Mari 2000)

  const psvFmt = formatNumberBR(input.psvCmSec);
  const medianFmt = formatNumberBR(median);
  const momFmt = mom.toFixed(2).replace(".", ",");

  const bloco = `Doppler da artéria cerebral média:
- Velocidade de pico sistólico (PSV): ${psvFmt} cm/s (mediana esperada para ${input.igWeeks} semanas: ${medianFmt} cm/s).
- MoM (Multiples of Median): ${momFmt}.

Conclusão: ${AnemiaSeverityLabel[severity]}.${AnemiaSeverityRecomendacao[severity]}`;

  return {
    psv: input.psvCmSec,
    medianExpected: median,
    mom,
    severity,
    insertBloco: bloco,
  };
}
