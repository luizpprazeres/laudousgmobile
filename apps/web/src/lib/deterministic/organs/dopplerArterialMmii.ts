import { DOPPLER_ARTERIAL_MMII_REQUIRED, DOPPLER_ARTERIAL_MMII_SEGMENTS, DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS } from '@laudousg/shared'
import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganModule, OrganState } from '../types'

export type VascularWebSide = 'right' | 'left'
export const arterialSectionId = (side: VascularWebSide, segment: string) => `${side}_${segment}`

/** Campo de seleção; 'model' segue o modelo escolhido no topo do formulário. */
export const vascularSelect = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
export const vascularNumber = (key: string, label: string, placeholder: string): Field => ({ key, label, kind: 'text', placeholder, halfWidth: true })
export const VASCULAR_MODEL_CONTROL = vascularSelect('model', 'Modelo de partida', [
  ['blank', 'Em branco'],
  ['normal', 'Normal — segmentos obrigatórios avaliados sem alterações'],
])
const CONFIRM = [['no', 'Pendente de confirmação'], ['yes', 'Confirmado pelo médico']] as const

export function vascularModule(category: string, id: string, label: string, fields: Field[]): OrganModule {
  const initialState = (): OrganState => Object.fromEntries(fields.map(field => [field.key, field.options?.find(option => option.isDefault)?.value ?? '']))
  return { schema: { id, name: label, category, fields }, initialState, compose: () => ({ body: '', conclusion: [], isNormal: true }) }
}

function segmentSection(side: VascularWebSide, segment: typeof DOPPLER_ARTERIAL_MMII_SEGMENTS[number]): ExamSection {
  const id = arterialSectionId(side, segment)
  const name = `${DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS[segment]} · ${side === 'right' ? 'direita' : 'esquerda'}`
  const fields: Field[] = [
    vascularSelect('assessment', 'Avaliação', [['model', 'Conforme modelo'], ['not_assessed', 'Não avaliado'], ['evaluated', 'Avaliado'], ['limited', 'Avaliação limitada']]),
    vascularSelect('waveform', 'Padrão espectral', [['model', 'Conforme modelo'], ['triphasic', 'Trifásico'], ['biphasic', 'Bifásico'], ['monophasic', 'Monofásico'], ['not_assessed', 'Não informado']]),
    vascularSelect('plaque', 'Placas', [['model', 'Conforme modelo'], ['absent', 'Ausentes'], ['present', 'Presentes'], ['not_assessed', 'Não informado']]),
    vascularNumber('psv_cms', 'VPS (cm/s)', '80'),
    { key: 'limitation', label: 'Limitação, quando houver', kind: 'text', placeholder: 'Descreva a limitação técnica' },
    {
      key: 'alteration', label: 'Alteração', kind: 'segmented', presentation: 'select', options: [
        { value: 'none', label: 'Nenhuma', isDefault: true },
        { value: 'stenosis', label: 'Aceleração focal / estenose', subFields: [
          vascularNumber('lesion_psv_cms', 'VPS na lesão (cm/s)', '320'),
          vascularNumber('reference_psv_cms', 'VPS de referência proximal (cm/s)', '110'),
          vascularSelect('grade', 'Graduação', [['not_classified', 'Não graduar'], ['ge50', '50% ou mais'], ['ge70', '70% ou mais']]),
          vascularSelect('confirmed', 'Graduação', CONFIRM),
        ] },
        { value: 'no_flow', label: 'Fluxo não detectado', subFields: [
          vascularSelect('collaterals', 'Circulação colateral', [['not_assessed', 'Não informada'], ['present', 'Presente'], ['absent', 'Ausente']]),
          { key: 'reconstitution', label: 'Reenchimento distal', kind: 'text', placeholder: 'Ex.: artéria poplítea' },
          vascularSelect('occlusion_confirmed', 'Oclusão', CONFIRM),
        ] },
      ],
    },
  ]
  return { id, label: name, group: 'orgaos', module: vascularModule('DOPPLER_ARTERIAL_MMII', id, name, fields) }
}

const abiSection: ExamSection = (() => {
  const fields: Field[] = [
    vascularNumber('brachial_right', 'PAS braquial direita (mmHg)', '130'),
    vascularNumber('brachial_left', 'PAS braquial esquerda (mmHg)', '128'),
    vascularNumber('right_posterior_tibial', 'Tibial posterior direita (mmHg)', '140'),
    vascularNumber('right_dorsalis_pedis', 'Dorsal do pé direita (mmHg)', '138'),
    vascularNumber('left_posterior_tibial', 'Tibial posterior esquerda (mmHg)', '136'),
    vascularNumber('left_dorsalis_pedis', 'Dorsal do pé esquerda (mmHg)', '134'),
  ]
  return { id: 'abi', label: 'Índice tornozelo-braquial (opcional)', group: 'orgaos', module: vascularModule('DOPPLER_ARTERIAL_MMII', 'abi', 'Índice tornozelo-braquial', fields) }
})()

const sections: ExamSection[] = [
  ...(['right', 'left'] as const).flatMap(side => DOPPLER_ARTERIAL_MMII_SEGMENTS.map(segment => segmentSection(side, segment))),
  abiSection,
]

export const dopplerArterialMmii: ExamCategory = {
  id: 'DOPPLER_ARTERIAL_MMII',
  name: 'Doppler arterial MMII',
  title: 'ULTRASSONOGRAFIA COM DOPPLER ARTERIAL DOS MEMBROS INFERIORES', tecnica: '', achadosHeader: '', conclusionNormal: '', sections,
  controls: [
    VASCULAR_MODEL_CONTROL,
    vascularSelect('laterality', 'Lateralidade', [['bilateral', 'Bilateral'], ['right', 'Direito'], ['left', 'Esquerdo']]),
    vascularSelect('optional_segments', 'Segmentos complementares', [['hide', 'Ocultar'], ['show', 'Mostrar']]),
  ],
  resolveSections: opts => sections.filter(section => {
    if (section.id === 'abi') return true
    const side = section.id.startsWith('right_') ? 'right' : 'left'
    if (opts.laterality && opts.laterality !== 'bilateral' && opts.laterality !== side) return false
    const segment = section.id.slice(side.length + 1) as typeof DOPPLER_ARTERIAL_MMII_SEGMENTS[number]
    return DOPPLER_ARTERIAL_MMII_REQUIRED.includes(segment) || opts.optional_segments === 'show'
  }),
}
