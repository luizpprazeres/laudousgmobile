import type { OrganState } from '../../lib/deterministic'
import { pesoHadlock1985DaBiometria, type ChaveFemur, arredondarPesoGramas, parseMedidaMm } from '../../lib/calculators/fetalWeight'
import { calcularPesoHadlock3 } from '../../lib/calculators/intergrowthBiometry'

const MODE = '_pesoModo'
const LAST = '_pesoAutomatico'
const INPUTS = '_pesoMedidas'
const measurementSignature = (state: OrganState) => JSON.stringify(
  ['dbp', 'cc', 'ca', 'cf', 'femur'].map((key) => parseMedidaMm(state[key])),
)
export type WeightMode = 'automatico' | 'manual'

/** Valores antigos/importados são manuais, inclusive quando coincidem com Hadlock.
 * A marca do último cálculo impede sobrescrever um peso recebido externamente.
 */
export function biometryWeightMode(state: OrganState): WeightMode {
  if (state[MODE] === 'manual') return 'manual'
  if (state[MODE] === 'automatico' && state.peso === state[LAST] && state[INPUTS] === measurementSignature(state)) return 'automatico'
  return typeof state.peso === 'string' && state.peso.trim() !== '' ? 'manual' : 'automatico'
}

/** Uma única atualização passa pelo callback existente (incluindo invalidação do percentil).
 * Ao apagar uma medida, apaga também o peso automático; nunca retém cálculo obsoleto.
 */
export function updateBiometryMeasurements(previous: OrganState, next: OrganState, femur: ChaveFemur | null): OrganState {
  return setBiometryWeightMode(next, femur, biometryWeightMode(previous))
}

export function setBiometryWeightMode(state: OrganState, femur: ChaveFemur | null, mode: WeightMode): OrganState {
  if (mode === 'manual') return { ...state, [MODE]: mode, [LAST]: '', [INPUTS]: '' }
  const peso = pesoHadlock1985DaBiometria(state, femur)?.valor ?? ''
  return { ...state, peso, [MODE]: mode, [LAST]: peso, [INPUTS]: measurementSignature(state) }
}

/** Peso da curva disponível antes da IG, reutilizando exclusivamente Hadlock 3 existente. */
export function progressiveIntergrowthWeight(state: Readonly<Record<string, unknown>>, femur: ChaveFemur | null): string | null {
  if (!femur) return null
  const ccMm = parseMedidaMm(state.cc)
  const caMm = parseMedidaMm(state.ca)
  const cfMm = parseMedidaMm(state[femur])
  if (ccMm === null || caMm === null || cfMm === null) return null
  const weight = calcularPesoHadlock3({ ccMm, caMm, cfMm })
  return weight === null ? null : arredondarPesoGramas(weight)
}
