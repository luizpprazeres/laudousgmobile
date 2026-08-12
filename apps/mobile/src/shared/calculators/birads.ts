/**
 * BI-RADS (Breast Imaging Reporting and Data System) — categorias 0-6 com
 * recomendação clínica de conduta/seguimento por categoria.
 * ACR BI-RADS 5th Edition (2013).
 *
 * Port literal do LaudoUSG iOS (Services/BIRADSCalculator.swift).
 */

export type BIRADSCategory =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4A"
  | "4B"
  | "4C"
  | "5"
  | "6";

export const BIRADS_CATEGORIES: BIRADSCategory[] = [
  "0",
  "1",
  "2",
  "3",
  "4A",
  "4B",
  "4C",
  "5",
  "6",
];

export function biradsLabel(cat: BIRADSCategory): string {
  return `BI-RADS ${cat}`;
}

export function biradsDescricao(cat: BIRADSCategory): string {
  switch (cat) {
    case "0":
      return "Avaliação incompleta — necessária avaliação complementar";
    case "1":
      return "Negativo";
    case "2":
      return "Achados benignos";
    case "3":
      return "Provavelmente benigno";
    case "4A":
      return "Suspeita baixa de malignidade";
    case "4B":
      return "Suspeita moderada de malignidade";
    case "4C":
      return "Suspeita alta de malignidade";
    case "5":
      return "Altamente sugestivo de malignidade";
    case "6":
      return "Malignidade comprovada por biópsia";
  }
}

export function biradsRecomendacao(cat: BIRADSCategory): string {
  switch (cat) {
    case "0":
      return "Recomenda-se avaliação por imagem complementar (mamografia, ressonância ou ultrassom adicional).";
    case "1":
      return "Recomenda-se seguimento de rotina conforme idade da paciente.";
    case "2":
      return "Recomenda-se seguimento de rotina conforme idade da paciente.";
    case "3":
      return "Recomenda-se seguimento por imagem em 6 meses.";
    case "4A":
      return "Recomenda-se biópsia (PAAF ou core biopsy) para avaliação histopatológica.";
    case "4B":
      return "Recomenda-se biópsia (core biopsy) para avaliação histopatológica.";
    case "4C":
      return "Recomenda-se biópsia (core biopsy) e correlação com avaliação clínica multidisciplinar.";
    case "5":
      return "Recomenda-se biópsia obrigatória e encaminhamento à mastologia/oncologia para conduta.";
    case "6":
      return "Manejo conforme protocolo oncológico vigente.";
  }
}

export function biradsProbMalignidade(cat: BIRADSCategory): string {
  switch (cat) {
    case "0":
      return "—";
    case "1":
      return "0%";
    case "2":
      return "0%";
    case "3":
      return "≤ 2%";
    case "4A":
      return "2-10%";
    case "4B":
      return "10-50%";
    case "4C":
      return "50-95%";
    case "5":
      return "≥ 95%";
    case "6":
      return "100% (comprovada)";
  }
}

/** Categorias que sinalizam suspeição (destaque de alerta no card). */
export const BIRADS_SERIOUS: BIRADSCategory[] = ["4A", "4B", "4C", "5", "6"];

export interface BIRADSResult {
  category: BIRADSCategory;
  insertBloco: string;
}

export function calcularBIRADS(
  category: BIRADSCategory,
  lateralidade?: string,
): BIRADSResult {
  const lateralidadeText = (lateralidade ?? "").trim();
  const mama = lateralidadeText === "" ? "" : ` — ${lateralidadeText}`;

  const bloco = `Conclusão: ${biradsLabel(category)}${mama} — ${biradsDescricao(
    category,
  )} (probabilidade de malignidade: ${biradsProbMalignidade(category)}).

${biradsRecomendacao(category)}`;

  return { category, insertBloco: bloco };
}
