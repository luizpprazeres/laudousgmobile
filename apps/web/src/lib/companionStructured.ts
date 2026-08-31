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
export type CompanionBreastFinding = {
  side: 'direita' | 'esquerda'
  type: 'cisto_simples' | 'multiplos_cistos' | 'nodulo' | 'calcificacoes'
  c1?: string; c2?: string; c3?: string; location?: string; hour?: string
  distanceSkin?: string; distanceNipple?: string; echogenicity?: string
  shape?: string; margin?: string; orientation?: string; posterior?: string
  calcifications?: string
}
export type CompanionCarotidMeasurement = {
  side: 'direita' | 'esquerda'; vessel: 'comum' | 'interna' | 'externa' | 'vertebral'
  psv?: string; vdf?: string; ir?: string; emi?: string
  flowDirection?: 'anterogrado' | 'retrogrado' | 'ausente'
}
export type CompanionCarotidPlaque = {
  side: 'direita' | 'esquerda'; location?: string; thickness?: string; stenosisPercent?: string
}
export type CompanionBiometricData = Partial<Record<ObstetricField, string>> & {
  thyroidRightLobe?: CompanionThyroidMeasurements
  thyroidLeftLobe?: CompanionThyroidMeasurements
  thyroidIsthmus?: CompanionThyroidMeasurements
  thyroidNodules?: CompanionThyroidNodule[]
  breastFindings?: CompanionBreastFinding[]
  carotidMeasurements?: CompanionCarotidMeasurement[]
  carotidPlaques?: CompanionCarotidPlaque[]
}

export type CompanionStructuredPayload = {
  category: 'OBSTETRICA' | 'DOPPLER_OBSTETRICO' | 'MORFOLOGICO' | 'TIREOIDE' | 'MAMARIA' | 'DOPPLER_CAROTIDAS'
  data: CompanionBiometricData
  summary?: string
}

export function applyCompanionCarotids(current: ExamState, payload: CompanionStructuredPayload): ExamState {
  if (payload.category !== 'DOPPLER_CAROTIDAS') return current
  const next: ExamState = { ...current }
  for (const side of ['direita', 'esquerda'] as const) {
    const section: OrganState = { ...(current[side] ?? {}) }
    const conflicts: string[] = []
    const measurements = (payload.data.carotidMeasurements ?? []).filter((item) => item.side === side)
    const applyUnique = (target: string, values: unknown[]) => {
      const distinct = [...new Set(values.map(clean).filter(Boolean))]
      const existing = clean(section[target])
      if (distinct.length === 1 && !existing) section[target] = distinct[0]!
      else if (distinct.length === 1 && existing !== distinct[0]) conflicts.push(`${target}: digitado ${existing} / imagem ${distinct[0]}`)
      else if (distinct.length > 1) conflicts.push(`${target}: ${distinct.join(' / ')}`)
    }
    for (const vessel of ['comum', 'interna', 'externa', 'vertebral'] as const) {
      const rows = measurements.filter((item) => item.vessel === vessel)
      if (vessel === 'vertebral') {
        applyUnique('vertebral_vps', rows.map((item) => item.psv))
        applyUnique('vertebral_direcao', rows.map((item) => item.flowDirection))
      } else {
        applyUnique(`${vessel}_vps`, rows.map((item) => item.psv))
        applyUnique(`${vessel}_vdf`, rows.map((item) => item.vdf))
      }
    }
    applyUnique('emi', measurements.map((item) => item.emi))
    const ids = Array.isArray(section.placas_ids) ? [...section.placas_ids] : []
    const known = new Set(ids.map((id) => `${section[`placas.${id}.localizacao`]}|${section[`placas.${id}.espessura`]}|${section[`placas.${id}.estenose`]}`))
    for (const plaque of (payload.data.carotidPlaques ?? []).filter((item) => item.side === side)) {
      const signature = `${clean(plaque.location)}|${clean(plaque.thickness)}|${clean(plaque.stenosisPercent)}`
      if (known.has(signature) || signature === '||') continue
      known.add(signature)
      const id = crypto.randomUUID(); ids.push(id)
      if (clean(plaque.location)) section[`placas.${id}.localizacao`] = clean(plaque.location)
      if (clean(plaque.thickness)) section[`placas.${id}.espessura`] = clean(plaque.thickness)
      if (clean(plaque.stenosisPercent)) section[`placas.${id}.estenose`] = clean(plaque.stenosisPercent)
    }
    section.placas_ids = ids
    section.companion_conflitos = conflicts
    next[side] = section
  }
  return next
}

export function applyCompanionBreast(current: ExamState, payload: CompanionStructuredPayload): ExamState {
  if (payload.category !== 'MAMARIA') return current
  const section: OrganState = { ...(current.mamas ?? {}) }
  const ids = Array.isArray(section.achados_ids) ? [...section.achados_ids] : []
  const bySignature = new Map(ids.map((id) => [[
    section[`achados.${id}.lado`], section[`achados.${id}.tipo`], section[`achados.${id}.medidas`],
    section[`achados.${id}.local`], section[`achados.${id}.horario`],
  ].join('|'), id]))
  const conflicts = Array.isArray(section.companion_conflitos) ? [...section.companion_conflitos as string[]] : []
  for (const finding of payload.data.breastFindings ?? []) {
    if (!['direita', 'esquerda'].includes(finding.side) || !['cisto_simples', 'multiplos_cistos', 'nodulo', 'calcificacoes'].includes(finding.type)) continue
    const medidas = [clean(finding.c1), clean(finding.c2), clean(finding.c3)].filter(Boolean).join(' x ')
    if (!medidas && finding.type !== 'calcificacoes') continue
    const signature = [finding.side, finding.type, medidas, clean(finding.location), clean(finding.hour)].join('|')
    const existingId = bySignature.get(signature)
    const id = existingId ?? crypto.randomUUID()
    if (!existingId) { ids.push(id); bySignature.set(signature, id) }
    const put = (key: string, value: unknown) => {
      const cleaned = clean(value)
      if (!cleaned) return
      const target = `achados.${id}.${key}`
      const existing = clean(section[target])
      if (!existing) section[target] = cleaned
      else if (existing !== cleaned) conflicts.push(`Achado ${ids.indexOf(id) + 1} · ${key}: digitado ${existing} / imagem ${cleaned}`)
    }
    section[`achados.${id}.lado`] = finding.side
    section[`achados.${id}.tipo`] = finding.type
    put('medidas', medidas); put('local', finding.location); put('horario', finding.hour)
    put('dist_pele', finding.distanceSkin); put('dist_mamilo', finding.distanceNipple)
    put('eco', finding.echogenicity); put('forma', finding.shape); put('margem', finding.margin)
    put('orientacao', finding.orientation); put('posterior', finding.posterior)
    if (finding.calcifications === 'microcalc') section[`achados.${id}.calc`] = ['microcalc']
    else put('calc_sub', finding.calcifications)
  }
  section.achados_ids = ids
  section.companion_conflitos = [...new Set(conflicts)]
  return { ...current, mamas: section }
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
  const conflicts = [...(current.companionConflitos ?? [])]
  const mergeLobe = (id: LoboId, incoming?: CompanionThyroidMeasurements) => {
    const next = { ...current[id] }
    for (const [axis, value] of Object.entries(cleanMeasurements(incoming))) {
      const key = axis as 'a' | 'b' | 'c'
      const existing = clean(next[key])
      if (!existing) next[key] = value
      else if (existing !== value) conflicts.push(`${id.replaceAll('_', ' ')} · eixo ${key.toUpperCase()}: digitado ${existing} / imagem ${value}`)
    }
    return next
  }
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
  const mergedNodules = current.nodulos.map((n) => ({ ...n }))
  const known = new Map(mergedNodules.map((n) => [`${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`, n]))
  const newNodules = extracted.filter((n) => {
    const key = `${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`
    const existing = known.get(key)
    if (existing) {
      for (const descriptor of ['ecogenicidade', 'margem', 'halo', 'forma', 'calcificacoes', 'vascularizacao'] as const) {
        if (!existing[descriptor] && n[descriptor]) existing[descriptor] = n[descriptor]
        else if (existing[descriptor] && n[descriptor] && existing[descriptor] !== n[descriptor]) conflicts.push(`Nódulo ${mergedNodules.indexOf(existing) + 1} · ${descriptor}: digitado ${existing[descriptor]} / imagem ${n[descriptor]}`)
      }
      return false
    }
    known.set(key, n)
    return true
  })
  const loboDireito = mergeLobe('lobo_direito', data.thyroidRightLobe)
  const loboEsquerdo = mergeLobe('lobo_esquerdo', data.thyroidLeftLobe)
  const istmo = mergeLobe('istmo', data.thyroidIsthmus)
  return {
    ...current,
    companionConflitos: [...new Set(conflicts)],
    lobo_direito: loboDireito,
    lobo_esquerdo: loboEsquerdo,
    istmo,
    nodulos: [...mergedNodules, ...newNodules],
  }
}

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : ''

type GestationalAge = { weeks: string; days: string }

/**
 * As telas dos aparelhos misturam mm/cm e g/kg. Os formulários da web usam
 * somente o número na unidade indicada pelo próprio campo, então o Companion
 * precisa converter antes de preencher. Sem isto, valores como `49.8 mm`
 * chegavam ao formulário, mas o renderer os recusava como número inválido.
 */
function measurement(value: unknown, target: 'mm' | 'cm' | 'g' | 'index'): string {
  const raw = clean(value).toLowerCase().replace(/\s+/g, '')
  const match = raw.match(/[-+]?\d+(?:[.,]\d+)?/)
  if (!match) return ''
  let numeric = Number.parseFloat(match[0]!.replace(',', '.'))
  if (!Number.isFinite(numeric)) return ''
  if (target === 'g' && /^\d{1,2}\.\d{3}(?:g|gramas?)?$/.test(raw)) {
    numeric = Number.parseInt(raw.replace(/\D/g, ''), 10)
  }
  if (target === 'mm' && raw.includes('cm')) numeric *= 10
  if (target === 'cm' && raw.includes('mm')) numeric /= 10
  if (target === 'g' && raw.includes('kg')) numeric *= 1000
  const decimals = target === 'g' ? 0 : 2
  const formatted = numeric.toFixed(decimals)
  return (formatted.includes('.') ? formatted.replace(/0+$/, '').replace(/\.$/, '') : formatted).replace('.', ',')
}

function gestationalAge(value: unknown): GestationalAge | null {
  const raw = clean(value).toLowerCase()
  const match = raw.match(/(\d{1,2})\s*(?:s(?:emanas?)?|w(?:eeks?)?)?\s*(?:\+|e|,|\s)?\s*(\d)?\s*(?:d(?:ias?)?)?/)
  if (!match?.[1]) return null
  const weeks = Number(match[1])
  const days = Number(match[2] ?? 0)
  if (weeks < 4 || weeks > 45 || days < 0 || days > 6) return null
  return { weeks: String(weeks), days: String(days) }
}

function biometricPatch(data: CompanionBiometricData, morphologic: boolean): OrganState {
  const patch: OrganState = {}
  const pairs: Array<[string, keyof CompanionBiometricData]> = [
    ['dbp', 'dbp'], ['cc', 'cc'], ['ca', 'ca'],
    [morphologic ? 'femur' : 'cf', 'cf'], ['peso', 'weight'],
  ]
  if (morphologic) pairs.push(
    ['tibia', 'tibia'], ['fibula', 'fibula'], ['umero', 'humerus'],
    ['radio', 'radius'], ['ulna', 'ulna'], ['cerebelo', 'cerebellum'],
    ['cisterna', 'cisternaMagna'], ['binocular', 'binocularDistance'],
  )
  for (const [target, source] of pairs) {
    const value = measurement(data[source], source === 'weight' ? 'g' : 'mm')
    if (value) patch[target] = value
  }
  return patch
}

function gestationalAgePatch(data: CompanionBiometricData, dopplerOnly = false): OrganState | null {
  const parsed = gestationalAge(
    dopplerOnly
      ? data.gestAge ?? data.gestAgeLMP ?? data.gestAgeBiometry
      : data.gestAgeBiometry ?? data.gestAge,
  )
  if (!parsed) return null
  return dopplerOnly
    ? { ig_sem: parsed.weeks, ig_dias: parsed.days }
    : { bio_sem: parsed.weeks, bio_dias: parsed.days }
}

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
    const value = measurement(data[source], 'index')
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
    next[id] = { ...(next[id] ?? {}), ...patch }
  }

  if (payload.category === 'OBSTETRICA') {
    mergeSection('biometria', biometricPatch(data, false))
    mergeSection('ig', gestationalAgePatch(data))
    if (measurement(data.percentile, 'index')) mergeSection('crescimento_fetal', {
      avaliar: 'sim',
      'avaliar.sim.percentil': measurement(data.percentile, 'index'),
      'avaliar.sim.fonte': 'outra',
      'avaliar.sim.fonte_outra': 'informado pelo aparelho',
    })
    mergeSection('doppler', dopplerPatch(data, true))
  } else if (payload.category === 'MORFOLOGICO') {
    mergeSection('biometria', biometricPatch(data, true))
    mergeSection('ig', gestationalAgePatch(data))
    const ila = measurement(data.ila, 'cm')
    if (ila) mergeSection('extrafetal', { ila })
    const gender = clean(data.gender).toLowerCase()
    if (/masculin/.test(gender)) mergeSection('anatomia', { genitalia: 'masculina' })
    else if (/feminin/.test(gender)) mergeSection('anatomia', { genitalia: 'feminina' })
    if (measurement(data.percentile, 'index')) mergeSection('crescimento_fetal', {
      avaliar: 'sim',
      'avaliar.sim.percentil': measurement(data.percentile, 'index'),
      'avaliar.sim.fonte': 'outra',
      'avaliar.sim.fonte_outra': 'informado pelo aparelho',
    })
    mergeSection('doppler', dopplerPatch(data, true))
  } else if (payload.category === 'DOPPLER_OBSTETRICO') {
    mergeSection('doppler', dopplerPatch(data, false))
    mergeSection('doppler', gestationalAgePatch(data, true))
  }
  return next
}
