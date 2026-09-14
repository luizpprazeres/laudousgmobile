import type { OrganSchema, OrganState } from '@/lib/deterministic'

export const RENAL_MEASUREMENT_KEYS = ['medidas', 'espessura'] as const
const ENABLED = 'medidas_renais.informar'
const draftKey = (key: string) => `medidas_renais.rascunho.${key}`

export function hasRenalMeasurementsGroup(schema: OrganSchema): boolean {
  return schema.category === 'ABDOMEN_TOTAL' &&
    (schema.id === 'rim_direito' || schema.id === 'rim_esquerdo')
}

export function renalMeasurementsEnabled(state: OrganState): boolean {
  return state[ENABLED] === 'true' || RENAL_MEASUREMENT_KEYS.some(key =>
    typeof state[key] === 'string' && state[key].trim().length > 0)
}

export function toggleRenalMeasurements(state: OrganState, enabled: boolean): OrganState {
  if (enabled === renalMeasurementsEnabled(state)) return state
  const next: OrganState = { ...state, [ENABLED]: enabled ? 'true' : 'false' }
  for (const key of RENAL_MEASUREMENT_KEYS) {
    if (enabled) {
      next[key] = state[draftKey(key)] ?? ''
    } else {
      // O adaptador le apenas as chaves ativas; o rascunho nao entra no laudo.
      next[draftKey(key)] = state[key] ?? ''
      next[key] = ''
    }
  }
  return next
}
