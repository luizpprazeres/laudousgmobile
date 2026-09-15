/**
 * Idade decimal na DPP e mapeamento do diabetes tri-estado para o motor de
 * pré-eclâmpsia — extraído de `PreEclampsiaCalculatorSheet.tsx` só pra poder
 * testar sem montar o componente (React Native não roda em `tsx` puro).
 *
 * O motor (`packages/shared/calculators/preEclampsiaFmf.ts`) exige a idade
 * DECIMAL na data provável do parto (DPP), não a idade inteira no exame — é o
 * que o app oficial da FMF usa. Aqui:
 *   DPP = data do exame + (280 − IG em dias)
 *   idade = (DPP − nascimento) / 365,25
 */

const DIA_MS = 86_400_000;

/** Idade decimal, em anos, na data provável do parto. */
export function idadeNaDppAnos(nascimento: Date, gaDias: number, dataExame: Date = new Date()): number {
  const dpp = new Date(dataExame);
  dpp.setDate(dpp.getDate() + (280 - gaDias));
  const dias = (dpp.getTime() - nascimento.getTime()) / DIA_MS;
  return dias / 365.25;
}

export type DiabetesEstado = "nao" | "tipo1" | "tipo2";

/** `diabetes = tipo1 || tipo2`; `diabetesTipo1` só afeta a mediana do IP uterino (requer `diabetes: true`). */
export function diabetesParaEngine(estado: DiabetesEstado): { diabetes: boolean; diabetesTipo1: boolean } {
  return { diabetes: estado !== "nao", diabetesTipo1: estado === "tipo1" };
}
