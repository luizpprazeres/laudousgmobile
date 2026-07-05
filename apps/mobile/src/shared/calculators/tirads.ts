/**
 * ACR TI-RADS (Thyroid Imaging Reporting and Data System) — pontuação por 5
 * features ecográficas do nódulo, total → categoria TR1-TR5 + recomendação
 * de seguimento ou punção baseado no tamanho do nódulo.
 *
 * Pontuação: composição + ecogenicidade + forma + margem + focos ecogênicos.
 *
 * Port literal do LaudoUSG iOS (Services/TIRADSCalculator.swift).
 */

export type TIComposicao =
  | "Cístico ou quase totalmente cístico"
  | "Espongiforme"
  | "Misto cístico-sólido"
  | "Sólido ou quase totalmente sólido";

export type TIEcogenicidade =
  | "Anecoico"
  | "Hiperecoico ou isoecoico"
  | "Hipoecoico"
  | "Muito hipoecoico";

export type TIForma = "Mais larga que alta" | "Mais alta que larga";

export type TIMargem =
  | "Lisa ou mal definida"
  | "Lobulada ou irregular"
  | "Extensão extra-tireoideana";

export type TIFocos =
  | "Nenhum ou caudas de cometa grandes"
  | "Macrocalcificações"
  | "Periféricas (contínuas)"
  | "Punctiformes ecogênicos (microcalcificações)";

export const TI_COMPOSICAO: TIComposicao[] = [
  "Cístico ou quase totalmente cístico",
  "Espongiforme",
  "Misto cístico-sólido",
  "Sólido ou quase totalmente sólido",
];

export const TI_ECOGENICIDADE: TIEcogenicidade[] = [
  "Anecoico",
  "Hiperecoico ou isoecoico",
  "Hipoecoico",
  "Muito hipoecoico",
];

export const TI_FORMA: TIForma[] = [
  "Mais larga que alta",
  "Mais alta que larga",
];

export const TI_MARGEM: TIMargem[] = [
  "Lisa ou mal definida",
  "Lobulada ou irregular",
  "Extensão extra-tireoideana",
];

export const TI_FOCOS: TIFocos[] = [
  "Nenhum ou caudas de cometa grandes",
  "Macrocalcificações",
  "Periféricas (contínuas)",
  "Punctiformes ecogênicos (microcalcificações)",
];

export function pontosComposicao(v: TIComposicao): number {
  switch (v) {
    case "Cístico ou quase totalmente cístico":
    case "Espongiforme":
      return 0;
    case "Misto cístico-sólido":
      return 1;
    case "Sólido ou quase totalmente sólido":
      return 2;
  }
}

export function pontosEcogenicidade(v: TIEcogenicidade): number {
  switch (v) {
    case "Anecoico":
      return 0;
    case "Hiperecoico ou isoecoico":
      return 1;
    case "Hipoecoico":
      return 2;
    case "Muito hipoecoico":
      return 3;
  }
}

export function pontosForma(v: TIForma): number {
  return v === "Mais alta que larga" ? 3 : 0;
}

export function pontosMargem(v: TIMargem): number {
  switch (v) {
    case "Lisa ou mal definida":
      return 0;
    case "Lobulada ou irregular":
      return 2;
    case "Extensão extra-tireoideana":
      return 3;
  }
}

export function pontosFocos(v: TIFocos): number {
  switch (v) {
    case "Nenhum ou caudas de cometa grandes":
      return 0;
    case "Macrocalcificações":
      return 1;
    case "Periféricas (contínuas)":
      return 2;
    case "Punctiformes ecogênicos (microcalcificações)":
      return 3;
  }
}

export type TIRADSCategoria = "tr1" | "tr2" | "tr3" | "tr4" | "tr5";

export function tiradsLabel(cat: TIRADSCategoria): string {
  switch (cat) {
    case "tr1":
      return "TR1 — Benigno";
    case "tr2":
      return "TR2 — Não suspeito";
    case "tr3":
      return "TR3 — Minimamente suspeito";
    case "tr4":
      return "TR4 — Moderadamente suspeito";
    case "tr5":
      return "TR5 — Altamente suspeito";
  }
}

export interface TIRADSInput {
  composicao: TIComposicao;
  ecogenicidade: TIEcogenicidade;
  forma: TIForma;
  margem: TIMargem;
  focosEcogenicos: TIFocos;
  maiorEixoCm: number;
}

export interface TIRADSResult {
  pontos: number;
  categoria: TIRADSCategoria;
  recomendacao: string;
  insertBloco: string;
}

// Formata "%.1f" com vírgula, idêntico ao Swift.
function fmt1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function recomendar(cat: TIRADSCategoria, rawTamanho: number): string {
  // #8: arredonda a 1 casa antes de comparar com os cutoffs — evita que
  // 1,5 cm vire 1,4999 por imprecisão de parsing e perca a indicação.
  const tamanho = Math.round(rawTamanho * 10) / 10;
  switch (cat) {
    case "tr1":
    case "tr2":
      return "Sem necessidade de seguimento adicional ou punção.";
    case "tr3":
      if (tamanho >= 2.5)
        return "Recomenda-se punção aspirativa por agulha fina (PAAF).";
      if (tamanho >= 1.5)
        return "Recomenda-se seguimento ultrassonográfico em 1, 3 e 5 anos.";
      return "Sem necessidade de PAAF ou seguimento.";
    case "tr4":
      if (tamanho >= 1.5) return "Recomenda-se PAAF.";
      if (tamanho >= 1.0)
        return "Recomenda-se seguimento ultrassonográfico em 1, 2, 3 e 5 anos.";
      return "Sem necessidade de PAAF — seguimento clínico.";
    case "tr5":
      if (tamanho >= 1.0)
        return "Recomenda-se PAAF — alta suspeita de malignidade.";
      if (tamanho >= 0.5)
        return "Recomenda-se seguimento ultrassonográfico anual.";
      return "Acompanhamento clínico — nódulo abaixo do limiar de intervenção.";
  }
}

export function calcularTIRADS(input: TIRADSInput): TIRADSResult {
  const pC = pontosComposicao(input.composicao);
  const pE = pontosEcogenicidade(input.ecogenicidade);
  const pF = pontosForma(input.forma);
  const pM = pontosMargem(input.margem);
  const pFoc = pontosFocos(input.focosEcogenicos);
  const total = pC + pE + pF + pM + pFoc;

  let cat: TIRADSCategoria;
  if (total === 0) cat = "tr1";
  else if (total <= 2) cat = "tr2";
  else if (total <= 3) cat = "tr3";
  else if (total <= 6) cat = "tr4";
  else cat = "tr5";

  const recomendacao = recomendar(cat, input.maiorEixoCm);
  const bloco = `Avaliação TI-RADS (ACR) do nódulo (${fmt1(
    input.maiorEixoCm,
  )} cm em maior eixo):
- Composição: ${input.composicao} (${pC} pts)
- Ecogenicidade: ${input.ecogenicidade} (${pE} pts)
- Forma: ${input.forma} (${pF} pts)
- Margem: ${input.margem} (${pM} pts)
- Focos ecogênicos: ${input.focosEcogenicos} (${pFoc} pts)
- Pontuação total: ${total} pontos.

Conclusão: ${tiradsLabel(cat)}. ${recomendacao}`;

  return { pontos: total, categoria: cat, recomendacao, insertBloco: bloco };
}
