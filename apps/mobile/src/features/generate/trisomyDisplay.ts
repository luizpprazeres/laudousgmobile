/**
 * Idade decimal na data do exame e exibição de risco da calculadora de
 * trissomias (Android) — a parte pura, testável sem montar o componente
 * (React Native não roda em `tsx` puro). Espelha
 * `apps/web/src/lib/calculators/trisomyFmf.ts` (mesma lógica, mesmos nomes).
 *
 * O motor (`packages/shared/src/calculators/fmfTrisomy.ts`) exige a idade
 * DECIMAL na data do EXAME — (exame − nascimento)/365,25 — e converte
 * internamente para a idade na DPP, como o app oficial da FMF. Diferente da
 * pré-eclâmpsia (que já pede a idade na DPP), aqui a tela sempre usa "hoje"
 * como data do exame.
 *
 *   pnpm exec tsx src/features/generate/trisomyDisplay.manual.ts
 */
import {
  arredondarDoisAlgarismos as arredondarDoisAlgarismosShared,
  basalRatioT18T13 as basalRatioT18T13Shared,
  formatarRazaoTrissomia,
  type FmfResult,
  type TrisomyRisk,
} from "@laudousg/shared";

const DIA_MS = 86_400_000;

/** Idade decimal, em anos, na data do exame (hoje, se `dataExame` omitida). */
export function idadeNaDataExameAnos(nascimento: Date, dataExame: Date = new Date()): number {
  const dias = (dataExame.getTime() - nascimento.getTime()) / DIA_MS;
  return dias / 365.25;
}

/**
 * Arredonda para 2 algarismos significativos, como o app oficial da FMF
 * exibe o denominador N de "1 in N" (ex.: 3.287 → 3.300, 549 → 550, 63 → 63).
 * Reexporta a implementação do shared (mesma lógica da web/iOS).
 */
export function arredondarDoisAlgarismos(n: number): number {
  return arredondarDoisAlgarismosShared(n);
}

/**
 * Formata um risco como "1 em N", aplicando o teto/piso de exibição do app
 * da FMF (`displayCapRatio`/`displayFloorRatio`) e arredondando N para 2
 * algarismos significativos — igual à web (`formatarRiscoExibicao`), via
 * `formatarRazaoTrissomia` do shared.
 */
export function formatarRiscoExibicao(
  risco: TrisomyRisk,
  limites: Pick<FmfResult, "displayCapRatio" | "displayFloorRatio">,
): string {
  return formatarRazaoTrissomia(risco.ratio, limites.displayCapRatio, limites.displayFloorRatio);
}

/**
 * Risco BASAL combinado T13/18 (soma das probabilidades basais de T13 e
 * T18), para exibir ao lado do basal de T21 — o motor só expõe a combinação
 * pós-marcadores em `result.t18t13`. Reexporta a implementação do shared.
 */
export function basalRatioT18T13(result: FmfResult): number {
  return basalRatioT18T13Shared(result);
}
