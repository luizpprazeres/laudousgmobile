import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { createSharedKidneyModule } from './urinaryShared'

const assessmentField: Field = {
  key: 'assessment',
  label: 'Avaliação',
  kind: 'segmented',
  presentation: 'select',
  options: [
    { value: 'not_assessed', label: 'Não avaliada', isDefault: true },
    { value: 'normal', label: 'Sem alteração' },
    { value: 'abnormal', label: 'Com alteração' },
    { value: 'limited', label: 'Limitada' },
  ],
}

const emptyComposition = (): OrganComposition => ({ body: '', conclusion: [], isNormal: true })

const aortaModule: OrganModule = {
  schema: {
    id: 'aorta',
    name: 'Aorta ao nível das artérias renais',
    category: 'DOPPLER_RENAL',
    fields: [
      assessmentField,
      { key: 'vps_cms', label: 'VPS da aorta (cm/s)', kind: 'text', placeholder: '80', halfWidth: true },
      { key: 'limitation', label: 'Limitação técnica', kind: 'text', placeholder: 'descrever quando a avaliação for limitada' },
    ],
  },
  initialState: (): OrganState => ({ assessment: 'not_assessed', vps_cms: '', limitation: '' }),
  compose: emptyComposition,
}

type VascularSide = 'direita' | 'esquerda'

const territoryFields = (
  prefix: 'ir' | 'ta_ms' | 'ia_cms2',
  label: string,
  unit: string,
): Field[] => [
  { key: `${prefix}_upper`, label: `${label} — polo superior (${unit})`, kind: 'text', placeholder: prefix === 'ir' ? '0,62' : prefix === 'ta_ms' ? '55' : '420', halfWidth: true },
  { key: `${prefix}_middle`, label: `${label} — terço médio (${unit})`, kind: 'text', placeholder: prefix === 'ir' ? '0,64' : prefix === 'ta_ms' ? '58' : '400', halfWidth: true },
  { key: `${prefix}_lower`, label: `${label} — polo inferior (${unit})`, kind: 'text', placeholder: prefix === 'ir' ? '0,63' : prefix === 'ta_ms' ? '56' : '410', halfWidth: true },
  { key: `${prefix}_unspecified`, label: `${label} — medida única (${unit})`, kind: 'text', placeholder: prefix === 'ir' ? '0,63' : prefix === 'ta_ms' ? '56' : '410', halfWidth: true },
]

function vascularSideModule(side: VascularSide): OrganModule {
  const sideLabel = side === 'direita' ? 'direita' : 'esquerda'
  return {
    schema: {
      id: `arteria_renal_${side}`,
      name: `Artéria renal ${sideLabel}`,
      category: 'DOPPLER_RENAL',
      fields: [
        assessmentField,
        { key: 'limitation', label: 'Limitação técnica', kind: 'text', placeholder: 'descrever quando a avaliação for limitada' },
        { key: 'psv_proximal_cms', label: 'VPS ostial/proximal (cm/s)', kind: 'text', placeholder: '120', halfWidth: true },
        { key: 'psv_middle_cms', label: 'VPS no segmento médio (cm/s)', kind: 'text', placeholder: '105', halfWidth: true },
        { key: 'psv_distal_cms', label: 'VPS no segmento distal (cm/s)', kind: 'text', placeholder: '95', halfWidth: true },
        { key: 'psv_maximum_cms', label: 'VPS máxima, segmento não informado (cm/s)', kind: 'text', placeholder: '120', halfWidth: true },
        { key: 'rar', label: 'Relação aorto-renal (RAR)', kind: 'text', placeholder: '1,5', halfWidth: true },
        ...territoryFields('ir', 'Índice de resistência (IR)', 'razão'),
        {
          key: 'spectral_pattern',
          label: 'Padrão espectral intrarrenal',
          kind: 'segmented',
          presentation: 'select',
          options: [
            { value: 'not_assessed', label: 'Não avaliado', isDefault: true },
            { value: 'normal', label: 'Preservado' },
            { value: 'tardus_parvus', label: 'Tardus-parvus' },
            { value: 'indeterminate', label: 'Indeterminado' },
          ],
        },
        ...territoryFields('ta_ms', 'Tempo de aceleração (TA)', 'ms'),
        ...territoryFields('ia_cms2', 'Índice de aceleração (IA)', 'cm/s²'),
        { key: 'indirect_conclusion', label: 'Conclusão indireta', kind: 'segmented', presentation: 'select', options: [
          { value: 'no', label: 'Somente descrição', isDefault: true },
          { value: 'confirmed', label: 'Confirmar alteração hemodinâmica proximal sugestiva' },
        ] },
        { key: 'ri_conclusion', label: 'IR elevado — interpretação médica', kind: 'segmented', presentation: 'select', options: [
          { value: 'no', label: 'Somente valores', isDefault: true },
          { value: 'confirmed', label: 'Confirmar elevação inespecífica do IR' },
        ] },
        { key: 'flow', label: 'Fluxo arterial', kind: 'segmented', presentation: 'select', options: [
          { value: 'not_assessed', label: 'Não especificado', isDefault: true },
          { value: 'detected', label: 'Detectável' },
          { value: 'not_detected', label: 'Não detectado' },
        ] },
        { key: 'flow_segment', label: 'Segmento da avaliação do fluxo', kind: 'text', placeholder: 'ostial, proximal, médio ou distal' },
        { key: 'accessory', label: 'Artéria renal acessória', kind: 'segmented', presentation: 'select', options: [
          { value: 'not_assessed', label: 'Não especificada', isDefault: true },
          { value: 'identified', label: 'Identificada' },
        ] },
        { key: 'accessory_psv_cms', label: 'VPS da artéria acessória (cm/s)', kind: 'text', placeholder: '115' },
        { key: 'renal_vein', label: 'Veia renal', kind: 'segmented', presentation: 'select', options: [
          { value: 'not_assessed', label: 'Não avaliada', isDefault: true },
          { value: 'patent', label: 'Pérvia, com fluxo detectável' },
          { value: 'not_detected', label: 'Fluxo não detectado' },
        ] },
        { key: 'stent', label: 'Stent na artéria renal', kind: 'segmented', presentation: 'select', options: [
          { value: 'not_assessed', label: 'Não especificado', isDefault: true },
          { value: 'present', label: 'Presente' },
        ] },
        { key: 'stent_psv_cms', label: 'VPS no interior do stent (cm/s)', kind: 'text', placeholder: '180' },
        { key: 'renal_segmental_ratio', label: 'Relação renal/segmentar documentada', kind: 'text', placeholder: 'valor medido — uso descritivo' },

      ],
    },
    initialState: (): OrganState => ({
      assessment: 'not_assessed',
      limitation: '',
      psv_proximal_cms: '',
      psv_middle_cms: '',
      psv_distal_cms: '',
      psv_maximum_cms: '',
      rar: '',
      indirect_conclusion: 'no', ri_conclusion: 'no', flow: 'not_assessed', flow_segment: '',
      accessory: 'not_assessed', accessory_psv_cms: '', renal_vein: 'not_assessed',
      stent: 'not_assessed', stent_psv_cms: '', renal_segmental_ratio: '',
      ir_upper: '',
      ir_middle: '',
      ir_lower: '',
      ir_unspecified: '',
      spectral_pattern: 'not_assessed',
      ta_ms_upper: '',
      ta_ms_middle: '',
      ta_ms_lower: '',
      ta_ms_unspecified: '',
      ia_cms2_upper: '',
      ia_cms2_middle: '',
      ia_cms2_lower: '',
      ia_cms2_unspecified: '',
    }),
    compose: emptyComposition,
  }
}

export const dopplerRenal: ExamCategory = {
  id: 'DOPPLER_RENAL',
  name: 'Doppler renal',
  title: 'ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS',
  tecnica: '',
  achadosHeader: '',
  sections: [
    { id: 'aorta', label: 'Aorta', group: 'orgaos', module: aortaModule },
    { id: 'rim_direito', label: 'Rim direito', group: 'orgaos', module: createSharedKidneyModule('DOPPLER_RENAL', 'direito') },
    { id: 'rim_esquerdo', label: 'Rim esquerdo', group: 'orgaos', module: createSharedKidneyModule('DOPPLER_RENAL', 'esquerdo') },
    { id: 'arteria_renal_direita', label: 'Artéria renal direita', group: 'orgaos', module: vascularSideModule('direita') },
    { id: 'arteria_renal_esquerda', label: 'Artéria renal esquerda', group: 'orgaos', module: vascularSideModule('esquerda') },
  ],
  conclusionNormal: '',
}
