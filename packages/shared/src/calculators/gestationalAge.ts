/**
 * Cálculo de Idade Gestacional (IG) — port literal do LaudoUSG original
 * (lib/gestationalAgeCalc.ts).
 *
 * Referências clínicas:
 *  - Naegele
 *  - ACOG Practice Bulletin No. 700 (2022) — regras de concordância DUM vs USG
 *
 * Lógica pura, client-side. Sem dependência de Date timezone (sempre normalize
 * input antes — parseDateBR aceita DD/MM/YYYY ou YYYY-MM-DD).
 */

export interface DUMInput {
  dum: Date;
  today?: Date;
}

export interface UsgCorrectionInput {
  usgDate: Date;
  usgWeeks: number;
  usgDays: number;
  today?: Date;
}

export interface IGResult {
  weeks: number;
  days: number;
  dpp: Date;
  method: "DUM" | "USG";
  /** Ex: "12 semanas e 3 dias" */
  label: string;
  /** Frase pronta para inserir no laudo. */
  insertBloco: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function igLabel(weeks: number, days: number): string {
  const wStr = `${weeks} semana${weeks === 1 ? "" : "s"}`;
  const dStr = days === 0 ? "" : ` e ${days} dia${days === 1 ? "" : "s"}`;
  return `${wStr}${dStr}`;
}

export function calcByDUM({
  dum,
  today = new Date(),
}: DUMInput): IGResult | null {
  const totalDays = diffDays(today, dum);
  if (totalDays < 0) return null;

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const dpp = addDays(dum, 280);
  const label = igLabel(weeks, days);

  const insertBloco = `Idade gestacional de ${label} (DUM: ${formatDate(dum)}). DPP: ${formatDate(dpp)}.`;

  return { weeks, days, dpp, method: "DUM", label, insertBloco };
}

export function calcByUSG({
  usgDate,
  usgWeeks,
  usgDays,
  today = new Date(),
}: UsgCorrectionInput): IGResult | null {
  const usgTotalDays = usgWeeks * 7 + usgDays;
  const daysSinceUSG = diffDays(today, usgDate);
  if (daysSinceUSG < 0) return null;

  const currentTotalDays = usgTotalDays + daysSinceUSG;
  const weeks = Math.floor(currentTotalDays / 7);
  const days = currentTotalDays % 7;
  const dpp = addDays(usgDate, 280 - usgTotalDays);
  const label = igLabel(weeks, days);

  const insertBloco = `Primeira ultrassonografia realizada em ${formatDate(usgDate)}. Hoje com ${label}.`;

  return { weeks, days, dpp, method: "USG", label, insertBloco };
}

/**
 * Regras de concordância DUM vs USG — ACOG PB 700 (2022).
 * Retorna concordant=true se a diferença é aceitável (manter DUM como base),
 * concordant=false se deve trocar pra USG.
 *
 * Threshold por idade gestacional (semanas medidas na USG):
 *  ≤ 8 sem:   5 dias
 *  9-13 sem:  7 dias
 *  14-21 sem: 10 dias
 *  22-27 sem: 14 dias
 *  ≥ 28 sem:  21 dias
 */
export interface ConcordanceResult {
  concordant: boolean;
  /** Threshold aplicado, em dias. */
  threshold: number;
  /** Diferença absoluta entre DPP do DUM e DPP do USG, em dias. */
  diff: number;
}

export function checkConcordance(
  dumResult: IGResult,
  usgResult: IGResult,
): ConcordanceResult {
  const usgWeeksAtExam = usgResult.weeks;
  const diff = Math.abs(diffDays(dumResult.dpp, usgResult.dpp));

  let threshold: number;
  if (usgWeeksAtExam <= 8) threshold = 5;
  else if (usgWeeksAtExam <= 13) threshold = 7;
  else if (usgWeeksAtExam <= 21) threshold = 10;
  else if (usgWeeksAtExam <= 27) threshold = 14;
  else threshold = 21;

  return { concordant: diff <= threshold, threshold, diff };
}

/**
 * Helper: parse de data em pt-BR (DD/MM/YYYY) OU formato ISO (YYYY-MM-DD).
 * Retorna null em qualquer formato inválido. Adiciona T12:00:00 pra evitar
 * problemas de timezone que poderiam mudar o dia.
 */
export function parseDateBR(value: string): Date | null {
  if (!value) return null;
  if (value.includes("-")) {
    const d = new Date(value + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return null;
  const d = new Date(`${year}-${month}-${day}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
