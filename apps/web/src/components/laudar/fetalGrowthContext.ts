/**
 * PERCENTIL MANUAL preso ao peso e à IG em que foi informado.
 *
 * O percentil do crescimento fetal é digitado (ou vem do aparelho) para um peso
 * e uma idade gestacional. Se um deles muda depois, o valor antigo não pode
 * seguir para o laudo em silêncio: o campo é limpo e, com `avaliar=sim`, a
 * pendência bloqueante de `fetalGrowthDaTela` exige um novo valor.
 *
 * Só o percentil é limpo — `avaliar`, fonte, confirmações e demais seções ficam.
 */

import type { ExamState } from '@/lib/deterministic'
import type { CompanionStructuredPayload } from '@/lib/companionStructured'

const GROWTH = 'crescimento_fetal'
const PERCENTIL = 'avaliar.sim.percentil'

/** Campos de que o percentil depende, com as chaves reais do estado. */
const CONTEXTO: ReadonlyArray<readonly [section: string, key: string]> = [
  ['biometria', 'peso'],
  ['ig', 'bio_sem'],
  ['ig', 'bio_dias'],
]

/** Vírgula/ponto e espaços não mudam o valor; texto não numérico compara aparado. */
function valorSemantico(value: unknown): string {
  const texto = typeof value === 'string' ? value.trim() : ''
  return /^-?\d+(?:[.,]\d+)?$/.test(texto) ? String(Number(texto.replace(',', '.'))) : texto
}

export function contextoPercentilMudou(anterior: ExamState | undefined, proximo: ExamState | undefined): boolean {
  return CONTEXTO.some(([section, key]) =>
    valorSemantico(anterior?.[section]?.[key]) !== valorSemantico(proximo?.[section]?.[key]))
}

/** Espelha `applyCompanionStructured`: só OBST/MORFO gravam percentil, e só com dígito. */
export function companionReenviaPercentil(payload: CompanionStructuredPayload): boolean {
  return (payload.category === 'OBSTETRICA' || payload.category === 'MORFOLOGICO') &&
    /\d/.test(String(payload.data?.percentile ?? ''))
}

export function invalidarPercentilManual(
  anterior: ExamState | undefined,
  proximo: ExamState,
  percentilReenviado = false,
): ExamState {
  const growth = proximo[GROWTH]
  const percentil = growth?.[PERCENTIL]
  if (percentilReenviado || !growth || typeof percentil !== 'string' || percentil.trim() === '') return proximo
  // Percentil trocado na mesma atualização é o valor novo, não resíduo.
  if (valorSemantico(percentil) !== valorSemantico(anterior?.[GROWTH]?.[PERCENTIL])) return proximo
  if (!contextoPercentilMudou(anterior, proximo)) return proximo
  return { ...proximo, [GROWTH]: { ...growth, [PERCENTIL]: '' } }
}
