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
  side: 'direita' | 'esquerda'; location?: string
  composition?: 'calcificada' | 'lipidica' | 'mista'
  surface?: 'regular' | 'irregular' | 'ulcerada'
  thickness?: string; stenosisPercent?: string; description?: string
}
export type CompanionCarotidClassification = {
  side: 'direita' | 'esquerda'
  classification: 'normal' | 'ateromatose_sem_estenose_significativa' | 'estenose_menor_50' | 'estenose_50_69' | 'estenose_70_99' | 'oclusao'
}
export type CompanionBiometricData = Partial<Record<ObstetricField, string>> & {
  thyroidRightLobe?: CompanionThyroidMeasurements
  thyroidLeftLobe?: CompanionThyroidMeasurements
  thyroidIsthmus?: CompanionThyroidMeasurements
  thyroidNodules?: CompanionThyroidNodule[]
  breastFindings?: CompanionBreastFinding[]
  carotidMeasurements?: CompanionCarotidMeasurement[]
  carotidPlaques?: CompanionCarotidPlaque[]
  carotidClassifications?: CompanionCarotidClassification[]
  carotidConclusion?: string
  carotidAdditionalFindings?: string
}

export type CompanionStructuredPayload = {
  contractVersion?: 'companion-form-patch/v1'
  category: 'OBSTETRICA' | 'DOPPLER_OBSTETRICO' | 'MORFOLOGICO' | 'TIREOIDE' | 'MAMARIA' | 'DOPPLER_CAROTIDAS'
  data: CompanionBiometricData
  summary?: string
  warnings?: string[]
}

const COMPANION_TOUCHED = '__companion_touched'

function companionFieldTouched(state: OrganState, key: string): boolean {
  return Array.isArray(state[COMPANION_TOUCHED]) && (state[COMPANION_TOUCHED] as string[]).includes(key)
}

function currentValueLabel(value: string, touched: boolean): string {
  return value || (touched ? 'campo revisado em branco' : 'vazio')
}

export function applyCompanionCarotids(current: ExamState, payload: CompanionStructuredPayload): ExamState {
  if (payload.category !== 'DOPPLER_CAROTIDAS') return current
  const next: ExamState = { ...current }
  for (const side of ['direita', 'esquerda'] as const) {
    const section: OrganState = { ...(current[side] ?? {}) }
    const conflicts: string[] = Array.isArray(section.companion_conflitos)
      ? [...section.companion_conflitos as string[]]
      : []
    const measurements = (payload.data.carotidMeasurements ?? []).filter((item) => item.side === side)
    const labels: Record<string, string> = {
      comum_vps: 'Carótida comum · PSV', comum_vdf: 'Carótida comum · VDF',
      interna_vps: 'Carótida interna · PSV', interna_vdf: 'Carótida interna · VDF',
      externa_vps: 'Carótida externa · PSV', externa_vdf: 'Carótida externa · VDF',
      vertebral_vps: 'Artéria vertebral · PSV', vertebral_direcao: 'Artéria vertebral · direção',
      emi: 'Espessura médio-intimal',
    }
    const applyUnique = (target: string, values: unknown[]) => {
      const distinct = [...new Set(values.map(clean).filter(Boolean))]
      const existing = clean(section[target])
      const touched = companionFieldTouched(section, target)
      if (distinct.length === 1 && !existing && !touched) section[target] = distinct[0]!
      else if (distinct.length === 1 && ((touched && !existing) || !companionValuesEqual(existing, distinct[0]!))) conflicts.push(`${target}::${labels[target] ?? target}: ${currentValueLabel(existing, touched)} / recebido ${distinct[0]}`)
      else if (distinct.length > 1) conflicts.push(`${target}::${labels[target] ?? target}: recebidos valores divergentes (${distinct.join(' / ')})`)
    }
    for (const vessel of ['comum', 'interna', 'externa', 'vertebral'] as const) {
      const rows = measurements.filter((item) => item.vessel === vessel)
      const targets: Array<[string, unknown[]]> = vessel === 'vertebral'
        ? [['vertebral_vps', rows.map((item) => item.psv)], ['vertebral_direcao', rows.map((item) => item.flowDirection)]]
        : [[`${vessel}_vps`, rows.map((item) => item.psv)], [`${vessel}_vdf`, rows.map((item) => item.vdf)]]
      const incoming = targets.map(([target, values]) => ({
        target,
        values: [...new Set(values.map(clean).filter(Boolean))],
      }))
      let groupConflict = false
      for (const item of incoming) {
        const existing = clean(section[item.target])
        const touched = companionFieldTouched(section, item.target)
        if (item.values.length > 1 || (item.values.length === 1 && ((touched && !existing) || (existing && !companionValuesEqual(existing, item.values[0]!))))) {
          groupConflict = true
        }
      }
      if (groupConflict) {
        for (const item of incoming) {
          const existing = clean(section[item.target])
          const touched = companionFieldTouched(section, item.target)
          if (item.values.length > 1) conflicts.push(`${item.target}::${labels[item.target] ?? item.target}: recebidos valores divergentes (${item.values.join(' / ')})`)
          else if (item.values.length === 1 && ((touched && !existing) || (existing && !companionValuesEqual(existing, item.values[0]!)))) {
            conflicts.push(`${item.target}::${labels[item.target] ?? item.target}: ${currentValueLabel(existing, touched)} / recebido ${item.values[0]}`)
          } else if (item.values.length === 1 && !existing) {
            conflicts.push(`${item.target}::${labels[item.target] ?? item.target}: valor recebido ${item.values[0]} não aplicado porque outra medida do mesmo vaso diverge`)
          }
        }
      } else {
        for (const item of incoming) if (item.values.length === 1 && !clean(section[item.target]) && !companionFieldTouched(section, item.target)) section[item.target] = item.values[0]!
      }
    }
    applyUnique('emi', measurements.map((item) => item.emi))
    const ids = Array.isArray(section.placas_ids) ? [...section.placas_ids] : []
    const plaques = (payload.data.carotidPlaques ?? []).filter((item) => item.side === side)
    const signaturePart = (value: unknown) => {
      const normalized = clean(value).toLocaleLowerCase('pt-BR')
      return /^[-+]?\d+(?:[.,]\d+)?$/.test(normalized)
        ? String(Number(normalized.replace(',', '.')))
        : normalized
    }
    const coreSignature = (location: unknown, thickness: unknown, stenosis: unknown) =>
      [location, thickness, stenosis].map(signaturePart).join('|')
    const fullSignature = (id: string) => [
      section[`placas.${id}.localizacao`], section[`placas.${id}.composicao`],
      section[`placas.${id}.superficie`], section[`placas.${id}.espessura`],
      section[`placas.${id}.estenose`], section[`placas.${id}.descricao`],
    ].map(signaturePart).join('|')
    const existingPlaques = ids.map((id) => ({
      id,
      core: [section[`placas.${id}.localizacao`], section[`placas.${id}.espessura`], section[`placas.${id}.estenose`]].map(signaturePart),
      full: fullSignature(id),
    }))
    const consumedExisting = new Set<string>()
    const plaqueStatus = clean(section.placas_status)
    if (plaques.length && plaqueStatus === 'ausentes') {
      conflicts.push('placas_status::Placas ateromatosas: digitado ausentes / recebido placa presente')
    } else if (plaques.length && !plaqueStatus && companionFieldTouched(section, 'placas_status')) {
      conflicts.push('placas_status::Placas ateromatosas: campo revisado em branco / recebida placa presente')
    } else if (plaques.length && !plaqueStatus) {
      section.placas_status = 'presentes'
    }
    for (const plaque of plaques) {
      const core = coreSignature(plaque.location, plaque.thickness, plaque.stenosisPercent)
      const incomingCore = core.split('|')
      const full = [plaque.location, plaque.composition, plaque.surface, plaque.thickness, plaque.stenosisPercent, plaque.description].map(signaturePart).join('|')
      if (!full.replaceAll('|', '')) continue
      const exact = existingPlaques.find((item) => !consumedExisting.has(item.id) && item.full === full)
      const compatible = existingPlaques.find((item) => {
        if (consumedExisting.has(item.id)) return false
        let matching = 0
        for (let index = 0; index < incomingCore.length; index += 1) {
          const incoming = incomingCore[index]
          const existing = item.core[index]
          if (incoming && existing && incoming !== existing) return false
          if (incoming && existing && incoming === existing) matching += 1
        }
        return matching >= 2
      })
      const existingId = exact?.id ?? compatible?.id
      const id = existingId ?? crypto.randomUUID()
      if (!existingId) ids.push(id)
      else consumedExisting.add(existingId)
      const fields: Array<[string, unknown, string]> = [
        ['localizacao', plaque.location, 'localização'], ['composicao', plaque.composition, 'composição'],
        ['superficie', plaque.surface, 'superfície'], ['espessura', plaque.thickness, 'espessura'],
        ['estenose', plaque.stenosisPercent, 'estenose'], ['descricao', plaque.description, 'descrição'],
      ]
      for (const [field, incoming, label] of fields) {
        const value = clean(incoming)
        if (!value) continue
        const target = `placas.${id}.${field}`
        const existing = clean(section[target])
        const touched = companionFieldTouched(section, target)
        if (!existing && !touched) section[target] = value
        else if ((touched && !existing) || !companionValuesEqual(existing, value)) conflicts.push(`${target}::Placa ${ids.indexOf(id) + 1} · ${label}: ${currentValueLabel(existing, touched)} / recebido ${value}`)
      }
    }
    section.placas_ids = ids
    if (conflicts.length) section.companion_conflitos = [...new Set(conflicts)]
    else delete section.companion_conflitos
    next[side] = section
  }
  const conclusion: OrganState = { ...(current.conclusao ?? {}) }
  const conclusionConflicts = Array.isArray(conclusion.companion_conflitos)
    ? [...conclusion.companion_conflitos as string[]]
    : []
  const applyConclusion = (target: string, incoming: unknown, label: string) => {
    const value = clean(incoming)
    if (!value) return
    const existing = clean(conclusion[target])
    const touched = companionFieldTouched(conclusion, target)
    if (!existing && !touched) conclusion[target] = value
    else if ((touched && !existing) || !companionValuesEqual(existing, value)) conclusionConflicts.push(`${target}::${label}: ${currentValueLabel(existing, touched)} / recebido ${value}`)
  }
  for (const item of payload.data.carotidClassifications ?? []) {
    applyConclusion(`classificacao_${item.side}`, item.classification, `Classificação do lado ${item.side}`)
  }
  applyConclusion('conclusao_livre', payload.data.carotidConclusion, 'Conclusão livre')
  applyConclusion('achados_adicionais', payload.data.carotidAdditionalFindings, 'Achados adicionais')
  if (conclusionConflicts.length) conclusion.companion_conflitos = [...new Set(conclusionConflicts)]
  else delete conclusion.companion_conflitos
  if (Object.keys(conclusion).length) next.conclusao = conclusion
  return next
}

export function carotidCompanionConflictSection(state: ExamState): 'direita' | 'esquerda' | 'conclusao' | null {
  for (const section of ['conclusao', 'direita', 'esquerda'] as const) {
    if (Array.isArray(state[section]?.companion_conflitos) && state[section]!.companion_conflitos.length > 0) return section
  }
  return null
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
      domingosAtivo: true,
    }]
  })
  const mergedNodules = current.nodulos.map((n) => ({ ...n }))
  const known = new Map(mergedNodules.map((n) => [`${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`, n]))
  const newNodules = extracted.filter((n) => {
    const key = `${n.lobo}|${n.c1}|${n.c2}|${n.c3}|${n.localizacao}`
    const existing = known.get(key)
    if (existing) {
      for (const descriptor of ['ecogenicidade', 'margem', 'halo', 'forma', 'calcificacoes', 'vascularizacao'] as const) {
        if (!existing[descriptor] && n[descriptor]) {
          existing[descriptor] = n[descriptor]
          if (existing.domingosAtivo === undefined) existing.domingosAtivo = true
        }
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

function companionValuesEqual(left: string, right: string): boolean {
  if (left === right) return true
  const numeric = (value: string) => /^[-+]?\d+(?:[.,]\d+)?$/.test(value)
    ? Number(value.replace(',', '.'))
    : null
  const leftNumber = numeric(left)
  const rightNumber = numeric(right)
  return leftNumber !== null && rightNumber !== null && leftNumber === rightNumber
}

/** Registra que o valor atual foi escolhido/editado na Web e limpa apenas o
 * conflito daquele campo. Assim um valor igual ao default continua tendo
 * precedência quando foi uma decisão explícita do médico. */
export function markCompanionFieldTouched(
  state: OrganState,
  key: string,
  value: string | string[],
): OrganState {
  const touched = Array.isArray(state[COMPANION_TOUCHED])
    ? state[COMPANION_TOUCHED] as string[]
    : []
  const conflicts = Array.isArray(state.companion_conflitos)
    ? (state.companion_conflitos as string[]).filter((item) => !item.startsWith(`${key}::`) && !item.startsWith(`${key}:`))
    : []
  const next: OrganState = {
    ...state,
    [key]: value,
    [COMPANION_TOUCHED]: [...new Set([...touched, key])],
  }
  if (conflicts.length) next.companion_conflitos = conflicts
  else delete next.companion_conflitos
  return next
}

export function companionConflictDisplay(conflict: string): string {
  const separator = conflict.indexOf('::')
  return separator >= 0 ? conflict.slice(separator + 2) : conflict
}

type GestationalAge = { weeks: string; days: string }

/**
 * As telas dos aparelhos misturam mm/cm e g/kg. Os formulários da web usam
 * somente o número na unidade indicada pelo próprio campo, então o Companion
 * precisa converter antes de preencher. Sem isto, valores como `49.8 mm`
 * chegavam ao formulário, mas o renderer os recusava como número inválido.
 */
export function normalizeCompanionMeasurement(value: unknown, target: 'mm' | 'cm' | 'g' | 'index'): string {
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

export function parseCompanionGestationalAge(value: unknown): GestationalAge | null {
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
    const value = normalizeCompanionMeasurement(data[source], source === 'weight' ? 'g' : 'mm')
    if (value) patch[target] = value
  }
  return patch
}

function gestationalAgePatch(data: CompanionBiometricData, dopplerOnly = false): OrganState | null {
  const parsed = parseCompanionGestationalAge(
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
    const value = normalizeCompanionMeasurement(data[source], 'index')
    if (value) patch[`${prefix}${target}`] = value
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
  const mergeSection = (
    id: string,
    patch: OrganState | null,
    options: {
      controls?: Record<string, {
        value: string
        replaceDefaults: string[]
        gate?: boolean
        requires?: { key: string; value: string }
      }>
      replaceableDefaults?: Record<string, string[]>
      atomicGroups?: string[][]
    } = {},
  ) => {
    if (!patch) return
    const section: OrganState = { ...(next[id] ?? {}) }
    const conflicts = Array.isArray(section.companion_conflitos)
      ? [...section.companion_conflitos as string[]]
      : []
    const controls = options.controls ?? {}
    const touched = Array.isArray(section[COMPANION_TOUCHED])
      ? section[COMPANION_TOUCHED] as string[]
      : []
    const status = new Map<string, 'empty' | 'same' | 'conflict' | 'blocked'>()
    const labels: Record<string, string> = {
      dbp: 'DBP', cc: 'CC', ca: 'CA', cf: 'CF', femur: 'Fêmur', peso: 'Peso fetal',
      bio_sem: 'IG biométrica (semanas)', bio_dias: 'IG biométrica (dias)',
      ila: 'ILA', genitalia: 'Genitália',
      'avaliar.sim.percentil': 'Percentil do peso fetal',
      'realizado.sim.ir_ut_dir': 'IR uterina direita',
      'realizado.sim.ip_ut_dir': 'IP uterina direita',
      'realizado.sim.ir_ut_esq': 'IR uterina esquerda',
      'realizado.sim.ip_ut_esq': 'IP uterina esquerda',
      'realizado.sim.ir_umb': 'IR umbilical', 'realizado.sim.ip_umb': 'IP umbilical',
      'realizado.sim.ir_acm': 'IR cerebral média', 'realizado.sim.ip_acm': 'IP cerebral média',
      'realizado.sim.ir_dv': 'IR ducto venoso', 'realizado.sim.ip_dv': 'IP ducto venoso',
      ir_ut_dir: 'IR uterina direita', ip_ut_dir: 'IP uterina direita',
      ir_ut_esq: 'IR uterina esquerda', ip_ut_esq: 'IP uterina esquerda',
      ir_umb: 'IR umbilical', ip_umb: 'IP umbilical',
      ir_acm: 'IR cerebral média', ip_acm: 'IP cerebral média',
      ir_dv: 'IR ducto venoso', ip_dv: 'IP ducto venoso',
      avaliar: 'Classificação do crescimento fetal', realizado: 'Doppler obstétrico',
      tipo: 'Método de avaliação do líquido amniótico',
    }

    let gateBlocked = false
    for (const [key, control] of Object.entries(controls)) {
      if (!control.gate) continue
      const existing = clean(section[key])
      const replaceableDefault = control.replaceDefaults.includes(existing) && !touched.includes(key)
      const conflictPrefix = `${key}::`
      for (let index = conflicts.length - 1; index >= 0; index--) {
        if (conflicts[index]?.startsWith(conflictPrefix)) conflicts.splice(index, 1)
      }
      if (existing && existing !== control.value && !replaceableDefault) {
        conflicts.push(`${conflictPrefix}${labels[key] ?? key}: digitado ${existing} / recebido ${control.value}`)
        gateBlocked = true
      }
    }

    for (const [key, incomingValue] of Object.entries(patch)) {
      if (controls[key]) continue
      const incoming = clean(incomingValue)
      if (!incoming) continue
      const existing = clean(section[key])
      const conflictPrefix = `${key}::`
      for (let index = conflicts.length - 1; index >= 0; index--) {
        if (conflicts[index]?.startsWith(conflictPrefix)) conflicts.splice(index, 1)
      }
      const replaceableDefault = options.replaceableDefaults?.[key]?.includes(existing) && !touched.includes(key)
      if (gateBlocked) status.set(key, 'blocked')
      else if (!existing || replaceableDefault) status.set(key, 'empty')
      else if (companionValuesEqual(existing, incoming)) status.set(key, 'same')
      else {
        status.set(key, 'conflict')
        conflicts.push(`${conflictPrefix}${labels[key] ?? key}: digitado ${existing} / recebido ${incoming}`)
      }
    }

    for (const group of options.atomicGroups ?? []) {
      if (group.some((key) => status.get(key) === 'conflict')) {
        for (const key of group) if (status.get(key) === 'empty') status.set(key, 'blocked')
      }
    }
    let accepted = false
    let applied = false
    for (const [key, fieldStatus] of status) {
      if (fieldStatus === 'same') accepted = true
      if (fieldStatus !== 'empty') continue
      section[key] = patch[key]!
      accepted = true
      applied = true
    }

    if (accepted) {
      for (const [key, control] of Object.entries(controls)) {
        const existing = clean(section[key])
        const mayReplace = !existing || (control.replaceDefaults.includes(existing) && !touched.includes(key))
        const requirementMet = !control.requires || clean(section[control.requires.key]) === control.requires.value
        if (mayReplace && requirementMet && (applied || key === 'realizado' || key === 'avaliar')) section[key] = control.value
      }
    }
    if (conflicts.length) section.companion_conflitos = [...new Set(conflicts)]
    else delete section.companion_conflitos
    next[id] = section
  }

  const gestationalOptions = { atomicGroups: [['bio_sem', 'bio_dias']] }
  const growthOptions = {
    controls: {
      avaliar: { value: 'sim', replaceDefaults: ['nao'], gate: true },
      'avaliar.sim.fonte': { value: 'outra', replaceDefaults: ['nao_informada'] },
      'avaliar.sim.fonte_outra': {
        value: 'informado pelo aparelho',
        replaceDefaults: [],
        requires: { key: 'avaliar.sim.fonte', value: 'outra' },
      },
    },
  }

  if (payload.category === 'OBSTETRICA') {
    mergeSection('biometria', biometricPatch(data, false))
    mergeSection('ig', gestationalAgePatch(data), gestationalOptions)
    if (normalizeCompanionMeasurement(data.percentile, 'index')) mergeSection('crescimento_fetal', {
      avaliar: 'sim',
      'avaliar.sim.percentil': normalizeCompanionMeasurement(data.percentile, 'index'),
      'avaliar.sim.fonte': 'outra',
      'avaliar.sim.fonte_outra': 'informado pelo aparelho',
    }, growthOptions)
  } else if (payload.category === 'MORFOLOGICO') {
    mergeSection('biometria', biometricPatch(data, true))
    mergeSection('ig', gestationalAgePatch(data), gestationalOptions)
    const ila = normalizeCompanionMeasurement(data.ila, 'cm')
    if (ila) mergeSection('extrafetal', { ila })
    const gender = clean(data.gender).toLowerCase()
    if (/masculin/.test(gender)) mergeSection('anatomia', { genitalia: 'masculina' }, { replaceableDefaults: { genitalia: ['na'] } })
    else if (/feminin/.test(gender)) mergeSection('anatomia', { genitalia: 'feminina' }, { replaceableDefaults: { genitalia: ['na'] } })
    if (normalizeCompanionMeasurement(data.percentile, 'index')) mergeSection('crescimento_fetal', {
      avaliar: 'sim',
      'avaliar.sim.percentil': normalizeCompanionMeasurement(data.percentile, 'index'),
      'avaliar.sim.fonte': 'outra',
      'avaliar.sim.fonte_outra': 'informado pelo aparelho',
    }, growthOptions)
    mergeSection('doppler', dopplerPatch(data, true), {
      controls: { realizado: { value: 'sim', replaceDefaults: ['nao'], gate: true } },
    })
  } else if (payload.category === 'DOPPLER_OBSTETRICO') {
    mergeSection('doppler', dopplerPatch(data, false))
    const ig = gestationalAgePatch(data, true)
    if (ig) mergeSection('ig', { bio_sem: ig.ig_sem, bio_dias: ig.ig_dias }, gestationalOptions)
    if (current.__opts?.somente_doppler !== 'sim') {
      mergeSection('biometria', biometricPatch(data, false))
      const ila = normalizeCompanionMeasurement(data.ila, 'cm')
      if (ila) mergeSection('liquido', { tipo: 'ila', 'tipo.ila.cm': ila }, {
        replaceableDefaults: { tipo: ['subjetivo'] },
        atomicGroups: [['tipo', 'tipo.ila.cm']],
      })
    }
  }
  return next
}
