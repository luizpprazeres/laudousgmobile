/**
 * Índice de Líquido Amniótico (ILA) pela técnica dos 4 quadrantes
 * (Phelan, 1987). Port literal do LaudoUSG iOS (Services/ILA4QCalculator.swift).
 *
 * Soma das medidas verticais dos maiores bolsões em cada quadrante
 * (Q1+Q2+Q3+Q4).
 *
 * Classificação:
 *  - <5 cm: oligoidrâmnio (reduzido)
 *  - 5-8 cm: tendência a oligo
 *  - 8-24 cm: normal
 *  - >24 cm: polidrâmnio (aumentado)
 */

export type ILAClassification =
  | "oligoSevero" // <5 cm
  | "oligoModerado" // 5-8 cm
  | "normal" // 8-24 cm
  | "poli"; // >24 cm

export interface ILAInput {
  q1: number; // cm
  q2: number;
  q3: number;
  q4: number;
}

export interface ILAResult {
  total: number; // soma dos 4 quadrantes
  classification: ILAClassification;
  insertBloco: string; // snippet pra inserir no laudo
}

export const ILALabel: Record<ILAClassification, string> = {
  oligoSevero: "Líquido amniótico em quantidade reduzida (oligoidrâmnio)",
  oligoModerado:
    "Líquido amniótico em quantidade reduzida (tendência a oligoidrâmnio)",
  normal: "Líquido amniótico em quantidade normal",
  poli: "Líquido amniótico em quantidade aumentada (polidrâmnio)",
};

// Arredonda a 1 casa; inteiro vira "N", decimal vira "N,N" (idêntico ao Swift).
function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded % 1 === 0) return `${Math.trunc(rounded)}`;
  return rounded.toFixed(1).replace(".", ",");
}

export function calcularILA(input: ILAInput): ILAResult | null {
  if (!(input.q1 >= 0 && input.q2 >= 0 && input.q3 >= 0 && input.q4 >= 0)) {
    return null;
  }
  const total = input.q1 + input.q2 + input.q3 + input.q4;
  if (!(total > 0)) return null;

  let cls: ILAClassification;
  if (total < 5) cls = "oligoSevero";
  else if (total < 8) cls = "oligoModerado";
  else if (total <= 24) cls = "normal";
  else cls = "poli";

  const totalFmt = formatNumber(total);
  const bloco = `Índice do líquido amniótico (ILA) = ${formatNumber(input.q1)} + ${formatNumber(input.q2)} + ${formatNumber(input.q3)} + ${formatNumber(input.q4)} = ${totalFmt} cm.

Conclusão: ${ILALabel[cls]} (ILA mede ${totalFmt} cm).`;

  return { total, classification: cls, insertBloco: bloco };
}
