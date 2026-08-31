import type { ExamState, OrganState } from '@/lib/deterministic'
import type { LoboId, TireoideState } from '@/lib/deterministic/organs/tireoide'

type ObstetricField =
  | 'dbp' | 'cc' | 'ca' | 'cf' | 'weight' | 'weightVariation' | 'percentile'
  | 'gestAge' | 'gestAgeLMP' | 'gestAgeBiometry'
  | 'irRightUterine' | 'ipRightUterine' | 'irLeftUterine' | 'ipLeftUterine'
  | 'irUmbilical' | 'ipUmbilical' | 'irMCA' | 'ipMCA'
  | 'irDuctusVenosus' | 'ipDuctusVenosus'
  | 'tibia' | 'fibula' | 'humerus' | 'radius' | 'ulna'
  | 'cerebellum' | 'cisternaMagna' | 'binocularDistance' | 'ila' | 'gender'

export type CompanionThyroidMeasurements = { a?: string; b?: string; c?: string }
export type CompanionThyroidNodule = {
  lobe: LoboId
  c1?: string; c2?: string; c3?: string; location?: string
  echogenicity?: string; margin?: string; halo?: string; shape?: string
  calcifications?: string; vascularization?: string
}
export type CompanionBiometricData = Partial<Record<ObstetricField, string>> & {
  thyroidRightLobe?: CompanionThyroidMeasurements
  thyroidLeftLobe?: CompanionThyroidMeasurements
  thyroidIsthmus?: CompanionThyroidMeasurements
  thyroidNodules?: CompanionThyroidNodule[]
}

export type CompanionStructuredPayload = {
  category: 'OBSTETRICA' | 'DOPPLER_OBSTETRICO' | 'MORFOLOGICO' | 'TIREOIDE'
  data: CompanionBiometricData
  summary?: string
}

function cleanMeasurements(value: CompanionThyroidMeasurements | undefined) {
  return {
    ...(clean(value?.a) ? { a: clean(value?.a) } : {}),
    ...(clean(value?.b) ? { b: clean(value?.b) } : {}),
    ...(clean(value?.c) ? { c: clean(value?.c) } : {}),
  }
}

export function applyCompanionThyroid(
  current: TireoideState,
  payload: CompanionStructuredPayload,
): TireoideState {
  if (payload.category !== 'TIREOIDE') return current
  const data = payload.data ?? {}
  const mergeLobe = (id: LoboId, incoming?: CompanionThyroidMeasurements) => ({
    ...current[id],
    ...cleanMeasurements(incoming),
  })
  const extracted = (data.thyroidNodules ?? []).flatMap((nodule) => {
    if (!['lobo_direito', 'lobo_esquerdo', 'istmo'].includes(nodule.lobe)) return []
    const dimensions = [clean(nodule.c1), clean(nodule.c2), clean(nodule.c3)]
    if (!dimensions.some(Boolean)) return []
    return [{
      id: crypto.randomUUID(),
      lobo: nodule.lobe,
      ecogenicidade: clean(nodule.echogenicity) || null,
      margem: clean(nodule.margin) || null,
      halo: clean(nodule.halo) || null,
      forma: clean(nodule.shape) || null,
      calcificacoes: clean(nodule.calcifications) || null,
      vascularizacao: clean(nodule.vascularization) || null,
      c1: dimensions[0]!, c2: dimensions[1]!, c3: dimensions[2]!,
      localizacao: clean(nodule.location),
    }]
  })
  const known = new Set(current.nodulos.map((n) => `${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`))
  const newNodules = extracted.filter((n) => {
    const key = `${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`
    if (known.has(key)) return false
    known.add(key)
    return true
  })
  return {
    ...current,
    lobo_direito: mergeLobe('lobo_direito', data.thyroidRightLobe),
    lobo_esquerdo: mergeLobe('lobo_esquerdo', data.thyroidLeftLobe),
    istmo: mergeLobe('istmo', data.thyroidIsthmus),
    nodulos: [...current.nodulos, ...newNodules],
  }
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
