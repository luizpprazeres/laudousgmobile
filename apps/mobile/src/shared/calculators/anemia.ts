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
