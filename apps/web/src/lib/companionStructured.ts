import type { ExamState, OrganState } from '@/lib/deterministic'

export type CompanionBiometricData = Partial<Record<
  | 'dbp' | 'cc' | 'ca' | 'cf' | 'weight' | 'weightVariation' | 'percentile'
  | 'gestAge' | 'gestAgeLMP' | 'gestAgeBiometry'
  | 'irRightUterine' | 'ipRightUterine' | 'irLeftUterine' | 'ipLeftUterine'
  | 'irUmbilical' | 'ipUmbilical' | 'irMCA' | 'ipMCA'
  | 'irDuctusVenosus' | 'ipDuctusVenosus'
  | 'tibia' | 'fibula' | 'humerus' | 'radius' | 'ulna'
  | 'cerebellum' | 'cisternaMagna' | 'binocularDistance' | 'ila' | 'gender',
  string
>>

export type CompanionStructuredPayload = {
  category: 'OBSTETRICA' | 'DOPPLER_OBSTETRICO' | 'MORFOLOGICO'
  data: CompanionBiometricData
  summary?: string
}

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : ''

function dopplerPatch(data: CompanionBiometricData, addon: boolean): OrganState | null {
  const prefix = addon ? 'realizado.sim.' : ''
  const pairs: Array<[string, keyof CompanionBiometricData]> = [
    ['ir_ut_dir', 'irRightUterine'], ['ip_ut_dir', 'ipRightUterine'],
    ['ir_ut_esq', 'irLeftUterine'], ['ip_ut_esq', 'ipLeftUterine'],
    ['ir_umb', 'irUmbilical'], ['ip_umb', 'ipUmbilical'],
    ['ir_acm', 'irMCA'], ['ip_acm', 'ipMCA'],
    ['ir_dv', 'irDuctusVenosus'], ['ip_dv', 'ipDuctusVenosus'],
  ]
  const patch: OrganState = {}
  for (const [target, source] of pairs) {
    const value = clean(data[source])
    if (value) patch[`${prefix}${target}`] = value
  }
  const right = Number.parseFloat(clean(data.ipRightUterine).replace(',', '.'))
  const left = Number.parseFloat(clean(data.ipLeftUterine).replace(',', '.'))
  if (Number.isFinite(right) && Number.isFinite(left)) {
    patch[`${prefix}ip_ut_medio`] = ((right + left) / 2).toFixed(2).replace('.', ',')
  }
  if (Object.keys(patch).length === 0) return null
  if (addon) patch.realizado = 'sim'
  return patch
}

export function applyCompanionStructured(
  current: ExamState,
  payload: CompanionStructuredPayload,
): ExamState {
  const data = payload.data ?? {}
  const next: ExamState = { ...current }
  const mergeSection = (id: string, patch: OrganState | null) => {
    if (!patch) return
    next[id] = { ...(current[id] ?? {}), ...patch }
  }

  if (payload.category === 'OBSTETRICA') {
    mergeSection('biometria', {
      ...(clean(data.dbp) ? { dbp: clean(data.dbp) } : {}),
      ...(clean(data.cc) ? { cc: clean(data.cc) } : {}),
      ...(clean(data.ca) ? { ca: clean(data.ca) } : {}),
      ...(clean(data.cf) ? { cf: clean(data.cf) } : {}),
      ...(clean(data.weight) ? { peso: clean(data.weight) } : {}),
    })
    mergeSection('doppler', dopplerPatch(data, true))
  } else if (payload.category === 'MORFOLOGICO') {
    mergeSection('biometria', {
      ...(clean(data.dbp) ? { dbp: clean(data.dbp) } : {}),
      ...(clean(data.cc) ? { cc: clean(data.cc) } : {}),
      ...(clean(data.ca) ? { ca: clean(data.ca) } : {}),
      ...(clean(data.cf) ? { femur: clean(data.cf) } : {}),
      ...(clean(data.weight) ? { peso: clean(data.weight) } : {}),
      ...(clean(data.tibia) ? { tibia: clean(data.tibia) } : {}),
      ...(clean(data.fibula) ? { fibula: clean(data.fibula) } : {}),
      ...(clean(data.humerus) ? { umero: clean(data.humerus) } : {}),
      ...(clean(data.radius) ? { radio: clean(data.radius) } : {}),
      ...(clean(data.ulna) ? { ulna: clean(data.ulna) } : {}),
      ...(clean(data.cerebellum) ? { cerebelo: clean(data.cerebellum) } : {}),
      ...(clean(data.cisternaMagna) ? { cisterna: clean(data.cisternaMagna) } : {}),
      ...(clean(data.binocularDistance) ? { binocular: clean(data.binocularDistance) } : {}),
    })
    if (clean(data.ila)) mergeSection('extrafetal', { ila: clean(data.ila) })
    mergeSection('doppler', dopplerPatch(data, true))
  } else if (payload.category === 'DOPPLER_OBSTETRICO') {
    mergeSection('doppler', dopplerPatch(data, false))
  }
  return next
}
