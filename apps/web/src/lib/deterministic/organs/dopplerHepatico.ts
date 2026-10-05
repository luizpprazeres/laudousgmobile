import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'

const emptyComposition = (): OrganComposition => ({ body: '', conclusion: [], isNormal: true })

const select = (
  key: string,
  label: string,
  options: ReadonlyArray<readonly [string, string]>,
  initial = options[0]?.[0] ?? '',
): Field => ({
  key,
  label,
  kind: 'segmented',
  presentation: 'select',
  options: options.map(([value, optionLabel]) => ({ value, label: optionLabel, isDefault: value === initial })),
})

const number = (key: string, label: string, placeholder: string): Field => ({
  key,
  label,
  kind: 'text',
  placeholder,
  halfWidth: true,
})

function moduleWithFields(id: string, name: string, fields: Field[]): OrganModule {
  return {
    schema: { id, name, category: 'DOPPLER_HEPATICO', fields },
    initialState: (): OrganState => Object.fromEntries(
      fields.map((field) => [field.key, field.options?.find((option) => option.isDefault)?.value ?? '']),
    ),
    compose: emptyComposition,
  }
}

const FLOW_OPTIONS = [
  ['not_assessed', 'Não informado'],
  ['hepatopetal', 'Hepatopetal'],
  ['hepatofugal', 'Hepatofugal'],
  ['ausente', 'Ausente'],
  ['outro', 'Outro padrão'],
] as const

const optionalVenousVessel = (id: string, name: string, spectralPattern = false) =>
  moduleWithFields(id, name, [
    select('assessment', 'Avaliação', [
      ['not_assessed', 'Não avaliado'],
      ['evaluated', 'Avaliado'],
    ]),
    select('patency', 'Perviedade', [
      ['not_assessed', 'Não informada'],
      ['patent', 'Pérvio'],
      ['thrombosis', 'Com sinais de trombose'],
    ]),
    number('caliber_cm', 'Calibre (cm)', '1,0'),
    number('velocity_cms', 'Velocidade (cm/s)', '24'),
    select('flow', 'Direção do fluxo', FLOW_OPTIONS, 'not_assessed'),
    ...(spectralPattern ? [select('spectral_pattern', 'Padrão espectral', [
      ['not_assessed', 'Não informado'],
      ['preserved', 'Preservado'],
      ['altered', 'Alterado'],
      ['other', 'Outro padrão'],
    ])] : []),
  ])

const portalVein = moduleWithFields('portal_vein', 'Veia porta', [
  select('assessment', 'Avaliação', [
    ['not_assessed', 'Não avaliada'],
    ['evaluated', 'Avaliada'],
  ]),
  select('patency', 'Perviedade', [
    ['not_assessed', 'Não informada'],
    ['patent', 'Pérvia'],
    ['thrombosis', 'Com sinais de trombose'],
  ]),
  number('caliber_cm', 'Calibre (cm)', '1,1'),
  number('velocity_cms', 'Velocidade (cm/s)', '24'),
  select('flow', 'Direção do fluxo', FLOW_OPTIONS, 'not_assessed'),
])

const commonHepaticArtery = moduleWithFields('common_hepatic_artery', 'Artéria hepática comum', [
    select('assessment', 'Avaliação', [
      ['not_assessed', 'Não avaliada'],
      ['evaluated', 'Avaliada'],
  ]),
  select('patency', 'Perviedade', [
      ['not_assessed', 'Não informada'],
      ['patent', 'Pérvia'],
      ['thrombosis', 'Com sinais de trombose'],
  ]),
  number('caliber_cm', 'Calibre (cm)', '0,5'),
  number('psv_cms', 'Velocidade de pico sistólico (cm/s)', '85'),
  number('edv_cms', 'Velocidade diastólica final (cm/s)', '25'),
  number('resistance_index', 'Índice de resistência', '0,70'),
  select('spectral_pattern', 'Padrão espectral', [
    ['not_assessed', 'Não informado'],
    ['preserved', 'Preservado'],
    ['altered', 'Alterado'],
    ['other', 'Outro padrão'],
  ]),
])

const portalFinding = moduleWithFields('portal_finding', 'Sistema portal', [
  select('status', 'Situação portal', [
    ['not_assessed', 'Não concluída'],
    ['absent', 'Sem sinais de alteração portal'],
    ['suspected', 'Alteração suspeita'],
    ['confirmed', 'Alteração confirmada'],
  ]),
  select('kind', 'Tipo de alteração', [
    ['not_assessed', 'Não informado'],
    ['portal_hypertension', 'Hipertensão portal'],
    ['portal_thrombosis', 'Trombose portal'],
    ['other', 'Outra alteração'],
  ]),
  { key: 'evidence', label: 'Critérios e achados observados', kind: 'text', placeholder: 'Descreva os achados que sustentam a impressão' },
  select('physician_confirmed', 'Confirmação médica', [
    ['no', 'Pendente de confirmação'],
    ['yes', 'Achado confirmado pelo médico'],
  ]),
  select('normal_hemodynamics_confirmed', 'Coerência do estudo normal', [
    ['no', 'Pendente de confirmação'],
    ['yes', 'Medidas, fluxos e contexto revisados pelo médico'],
  ]),
])

export const dopplerHepatico: ExamCategory = {
  id: 'DOPPLER_HEPATICO',
  name: 'Doppler hepático',
  title: 'DOPPLER HEPÁTICO',
  tecnica: '',
  achadosHeader: '',
  conclusionNormal: '',
  sections: [
    { id: 'portal_vein', label: 'Veia porta', group: 'orgaos', module: portalVein },
    { id: 'hepatic_veins', label: 'Veias hepáticas', group: 'orgaos', module: optionalVenousVessel('hepatic_veins', 'Veias hepáticas', true) },
    { id: 'splenic_vein', label: 'Veia esplênica', group: 'orgaos', module: optionalVenousVessel('splenic_vein', 'Veia esplênica') },
    { id: 'superior_mesenteric_vein', label: 'Veia mesentérica superior', group: 'orgaos', module: optionalVenousVessel('superior_mesenteric_vein', 'Veia mesentérica superior') },
    { id: 'common_hepatic_artery', label: 'Artéria hepática comum', group: 'orgaos', module: commonHepaticArtery },
    { id: 'portal_finding', label: 'Sistema portal', group: 'conclusao', module: portalFinding },
  ],
}
