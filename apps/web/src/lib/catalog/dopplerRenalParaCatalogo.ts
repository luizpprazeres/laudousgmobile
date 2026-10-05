import {
  kidneyInputIssues,
  normalizeKidneyState,
  type KidneyState,
} from '../deterministic/organs/urinaryShared'

type Section = Record<string, unknown>
type ExamState = Record<string, unknown>
type Side = 'right' | 'left'
type Assessment = 'not_assessed' | 'normal' | 'abnormal' | 'limited'

export type DopplerRenalPending = {
  onde: string
  valor: string
  motivo: string
  bloqueia?: boolean
}

type NumericPoint<T extends string> = { territory: T; value: number }
type SegmentPoint<T extends string> = { segment: T; value: number }

type DopplerRenalSideDraft = {
  assessment: Assessment
  limitation: string | null
  kidney: KidneyState
  artery: {
    psv_cms: Array<SegmentPoint<'ostial_or_proximal' | 'middle' | 'distal' | 'maximum_unspecified'>>
    documented_rar: number | null
  }
  extensions: {
    indirect_conclusion_confirmed: boolean
    elevated_ri_confirmed: boolean
    flow: 'not_assessed' | 'detected' | 'not_detected'
    flow_segment: string | null
    accessory_identified: boolean
    accessory_psv_cms: number | null
    renal_vein: 'not_assessed' | 'patent' | 'not_detected'
    stent_present: boolean
    stent_psv_cms: number | null
    renal_segmental_ratio: number | null
  }
  intrarenal: {
    ri: Array<NumericPoint<'upper_pole' | 'middle_pole' | 'lower_pole' | 'summary_unspecified'>>
    spectral_pattern: 'not_assessed' | 'normal' | 'tardus_parvus' | 'indeterminate'
    acceleration_time_ms: Array<NumericPoint<'upper_pole' | 'middle_pole' | 'lower_pole' | 'unspecified'>>
    acceleration_index_cms2: Array<NumericPoint<'upper_pole' | 'middle_pole' | 'lower_pole' | 'unspecified'>>
  }
}

const section = (exam: ExamState, key: string): Section => {
  const value = exam[key]
  return value && typeof value === 'object' ? value as Section : {}
}

const text = (state: Section, key: string): string =>
  typeof state[key] === 'string' ? (state[key] as string).trim() : ''

function numberField(
  state: Section,
  key: string,
  label: string,
  pending: DopplerRenalPending[],
  allowZero = false,
): number | null {
  const raw = text(state, key)
  if (!raw) return null
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) {
    pending.push({ onde: label, valor: raw, motivo: 'use apenas um valor numérico', bloqueia: true })
    return null
  }
  const value = Number(raw.replace(',', '.'))
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    pending.push({
      onde: label,
      valor: raw,
      motivo: allowZero ? 'o valor não pode ser negativo' : 'o valor precisa ser maior que zero',
      bloqueia: true,
    })
    return null
  }
  return value
}

function assessment(state: Section, label: string, pending: DopplerRenalPending[]): Assessment {
  const raw = text(state, 'assessment') || 'not_assessed'
  if (raw === 'not_assessed' || raw === 'normal' || raw === 'abnormal' || raw === 'limited') return raw
  pending.push({ onde: label, valor: raw, motivo: 'estado de avaliação inválido', bloqueia: true })
  return 'not_assessed'
}

function spectralPattern(
  state: Section,
  label: string,
  pending: DopplerRenalPending[],
): DopplerRenalSideDraft['intrarenal']['spectral_pattern'] {
  const raw = text(state, 'spectral_pattern') || 'not_assessed'
  if (raw === 'not_assessed' || raw === 'normal' || raw === 'tardus_parvus' || raw === 'indeterminate') return raw
  pending.push({ onde: label, valor: raw, motivo: 'padrão espectral inválido', bloqueia: true })
  return 'not_assessed'
}

function populated<T extends string>(
  state: Section,
  fields: ReadonlyArray<{ key: string; territory: T; label: string }>,
  pending: DopplerRenalPending[],
  allowZero: boolean,
): Array<NumericPoint<T>> {
  return fields.flatMap(({ key, territory, label }) => {
    const value = numberField(state, key, label, pending, allowZero)
    return value === null ? [] : [{ territory, value }]
  })
}

const PSV_FIELDS = [
  { key: 'psv_proximal_cms', segment: 'ostial_or_proximal', label: 'VPS ostial/proximal' },
  { key: 'psv_middle_cms', segment: 'middle', label: 'VPS no segmento médio' },
  { key: 'psv_distal_cms', segment: 'distal', label: 'VPS no segmento distal' },
  { key: 'psv_maximum_cms', segment: 'maximum_unspecified', label: 'VPS máxima' },
] as const

const RI_FIELDS = [
  { key: 'ir_upper', territory: 'upper_pole', label: 'IR no polo superior' },
  { key: 'ir_middle', territory: 'middle_pole', label: 'IR no terço médio' },
  { key: 'ir_lower', territory: 'lower_pole', label: 'IR no polo inferior' },
  { key: 'ir_unspecified', territory: 'summary_unspecified', label: 'IR em medida única' },
] as const

const TA_FIELDS = [
  { key: 'ta_ms_upper', territory: 'upper_pole', label: 'TA no polo superior' },
  { key: 'ta_ms_middle', territory: 'middle_pole', label: 'TA no terço médio' },
  { key: 'ta_ms_lower', territory: 'lower_pole', label: 'TA no polo inferior' },
  { key: 'ta_ms_unspecified', territory: 'unspecified', label: 'TA em medida única' },
] as const

const IA_FIELDS = [
  { key: 'ia_cms2_upper', territory: 'upper_pole', label: 'IA no polo superior' },
  { key: 'ia_cms2_middle', territory: 'middle_pole', label: 'IA no terço médio' },
  { key: 'ia_cms2_lower', territory: 'lower_pole', label: 'IA no polo inferior' },
  { key: 'ia_cms2_unspecified', territory: 'unspecified', label: 'IA em medida única' },
] as const

function sideDraft(
  exam: ExamState,
  side: Side,
  pending: DopplerRenalPending[],
): DopplerRenalSideDraft {
  const ptSide = side === 'right' ? 'direita' : 'esquerda'
  const vascular = section(exam, `arteria_renal_${ptSide}`)
  const kidneySection = section(exam, `rim_${side === 'right' ? 'direito' : 'esquerdo'}`)
  const sideAssessment = assessment(vascular, `artéria renal ${ptSide}`, pending)
  const limitation = text(vascular, 'limitation') || null
  const psv = PSV_FIELDS.flatMap(({ key, segment, label }) => {
    const value = numberField(vascular, key, label, pending)
    return value === null ? [] : [{ segment, value }]
  })
  const documentedRar = numberField(vascular, 'rar', `RAR ${ptSide}`, pending, true)
  const ri = populated(vascular, RI_FIELDS, pending, true)
  const accelerationTime = populated(vascular, TA_FIELDS, pending, true)
  const accelerationIndex = populated(vascular, IA_FIELDS, pending, true)
  const pattern = spectralPattern(vascular, `padrão espectral ${ptSide}`, pending)
  const choice = <T extends string>(key: string, allowed: T[], fallback: T): T => {
    const value = text(vascular, key) || fallback
    if (allowed.includes(value as T)) return value as T
    pending.push({ onde: `${key} ${ptSide}`, valor: value, motivo: 'opção inválida', bloqueia: true })
    return fallback
  }
  const extensions: DopplerRenalSideDraft['extensions'] = {
    indirect_conclusion_confirmed: choice('indirect_conclusion', ['no', 'confirmed'], 'no') === 'confirmed',
    elevated_ri_confirmed: choice('ri_conclusion', ['no', 'confirmed'], 'no') === 'confirmed',
    flow: choice('flow', ['not_assessed', 'detected', 'not_detected'], 'not_assessed'),
    flow_segment: text(vascular, 'flow_segment') || null,
    accessory_identified: choice('accessory', ['not_assessed', 'identified'], 'not_assessed') === 'identified',
    accessory_psv_cms: numberField(vascular, 'accessory_psv_cms', `VPS acessória ${ptSide}`, pending),
    renal_vein: choice('renal_vein', ['not_assessed', 'patent', 'not_detected'], 'not_assessed'),
    stent_present: choice('stent', ['not_assessed', 'present'], 'not_assessed') === 'present',
    stent_psv_cms: numberField(vascular, 'stent_psv_cms', `VPS no stent ${ptSide}`, pending),
    renal_segmental_ratio: numberField(vascular, 'renal_segmental_ratio', `Relação renal/segmentar ${ptSide}`, pending, true),
  }
  const issue = (motivo: string) => pending.push({ onde: `artéria renal ${ptSide}`, valor: 'extensão opcional', motivo, bloqueia: true })
  if (extensions.indirect_conclusion_confirmed && pattern !== 'tardus_parvus') issue('a conclusão indireta exige padrão tardus-parvus documentado')
  if (extensions.elevated_ri_confirmed && !ri.some((p) => p.value > 0.8)) issue('a elevação do IR exige medida acima de 0,80; o limite permanece pendente')
  if (extensions.accessory_psv_cms !== null && !extensions.accessory_identified) issue('confirme a identificação da artéria acessória')
  if (extensions.stent_psv_cms !== null && !extensions.stent_present) issue('confirme a presença do stent')
  if (extensions.flow_segment && extensions.flow === 'not_assessed') issue('selecione o fluxo do segmento informado')
  if (extensions.flow === 'not_detected' && !extensions.flow_segment) issue('informe o segmento em que o fluxo não foi detectado')
  if (sideAssessment === 'normal' && (extensions.flow === 'not_detected' || extensions.renal_vein === 'not_detected' || extensions.elevated_ri_confirmed)) issue('o achado informado conflita com avaliação sem alteração')


  for (const issue of kidneyInputIssues(kidneySection)) {
    pending.push({ onde: `rim ${ptSide}`, valor: 'campo renal', motivo: issue, bloqueia: true })
  }
  if (sideAssessment === 'limited' && !limitation) {
    pending.push({ onde: `artéria renal ${ptSide}`, valor: 'avaliação limitada', motivo: 'descreva a limitação técnica', bloqueia: true })
  }
  if (sideAssessment === 'not_assessed') {
    pending.push({ onde: `artéria renal ${ptSide}`, valor: 'não avaliada', motivo: 'selecione o estado da avaliação vascular', bloqueia: true })
  }
  const hasVascularData = psv.length > 0 || documentedRar !== null || ri.length > 0 ||
    accelerationTime.length > 0 || accelerationIndex.length > 0 || pattern !== 'not_assessed' ||
    extensions.flow !== 'not_assessed' || extensions.renal_vein !== 'not_assessed' || extensions.stent_present || extensions.accessory_identified
  if (sideAssessment === 'abnormal' && !hasVascularData) {
    pending.push({ onde: `artéria renal ${ptSide}`, valor: 'com alteração', motivo: 'informe ao menos uma medida ou o padrão espectral observado', bloqueia: true })
  }
  if (sideAssessment === 'normal' && !extensions.stent_present && psv.some((p) => p.value > 250)) issue('VPS acima de 250 cm/s conflita com avaliação sem alteração')
  if (sideAssessment === 'normal' && (pattern === 'tardus_parvus' || pattern === 'indeterminate')) {
    pending.push({ onde: `artéria renal ${ptSide}`, valor: pattern, motivo: 'o padrão espectral conflita com a avaliação sem alteração', bloqueia: true })
  }

  return {
    assessment: sideAssessment,
    limitation,
    kidney: normalizeKidneyState(kidneySection),
    artery: { psv_cms: psv, documented_rar: documentedRar },
    extensions,
    intrarenal: {
      ri,
      spectral_pattern: pattern,
      acceleration_time_ms: accelerationTime,
      acceleration_index_cms2: accelerationIndex,
    },
  }
}

/** Projeção única do formulário Web para o renderer canônico. */
export function adaptarDopplerRenal(exam: ExamState) {
  const pending: DopplerRenalPending[] = []
  const aortaState = section(exam, 'aorta')
  const aortaAssessment = assessment(aortaState, 'aorta', pending)
  const aortaLimitation = text(aortaState, 'limitation') || null
  const aorticPsv = numberField(aortaState, 'vps_cms', 'VPS da aorta', pending)
  if (aortaAssessment === 'limited' && !aortaLimitation) {
    pending.push({ onde: 'aorta', valor: 'avaliação limitada', motivo: 'descreva a limitação técnica', bloqueia: true })
  }
  if (aortaAssessment === 'not_assessed' && aorticPsv !== null) {
    pending.push({ onde: 'aorta', valor: 'VPS preenchida', motivo: 'selecione o estado da avaliação da aorta', bloqueia: true })
  }

  if (aortaAssessment === 'abnormal' && aorticPsv === null) {
    pending.push({ onde: 'aorta', valor: 'com alteração', motivo: 'informe a VPS da aorta', bloqueia: true })
  }

  const sides = {
    right: sideDraft(exam, 'right', pending),
    left: sideDraft(exam, 'left', pending),
  }
  const r3 = Object.values(sides).some((side) => !side.extensions.stent_present && side.artery.documented_rar === null && side.artery.psv_cms.some((p) => p.value > 250))
  if (aortaAssessment === 'not_assessed' && aorticPsv === null && !r3) {
    pending.push({ onde: 'aorta', valor: 'não avaliada', motivo: 'selecione o estado da avaliação da aorta', bloqueia: true })
  }
  const rightMaximum = sides.right.kidney.medidas_cm?.length === 3
    ? Math.max(...sides.right.kidney.medidas_cm)
    : null
  const leftMaximum = sides.left.kidney.medidas_cm?.length === 3
    ? Math.max(...sides.left.kidney.medidas_cm)
    : null
  const maximumMeasurementDifference = rightMaximum !== null && leftMaximum !== null
    ? Math.abs(rightMaximum - leftMaximum)
    : null
  const maximumDifferenceExceedsThreshold = maximumMeasurementDifference !== null &&
    maximumMeasurementDifference > 1.8 &&
    Math.abs(maximumMeasurementDifference - 1.8) > 1e-10 * Math.max(1, maximumMeasurementDifference, 1.8)

  return {
    dados: {
      contract_version: 'doppler-renal/web-v1',
      category_code: 'DOPPLER_RENAL',
      laterality: 'bilateral' as const,
      aorta: {
        assessment: aortaAssessment,
        limitation: aortaLimitation,
        psv_cms: aorticPsv,
      },
      sides,
      derived: {
        maximum_renal_measurement_difference_cm: maximumMeasurementDifference,
        right_maximum_measurement_cm: rightMaximum,
        left_maximum_measurement_cm: leftMaximum,
        conclusion_candidate_strict_gt_1_8_cm: maximumDifferenceExceedsThreshold,
      },
    },
    alteracoes: [] as string[],
    pendencias: pending,
  }
}
