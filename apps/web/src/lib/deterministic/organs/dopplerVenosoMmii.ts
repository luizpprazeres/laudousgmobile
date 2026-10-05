import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganModule, OrganState } from '../types'

export const VENOUS_WEB_SEGMENTS = [
  ['common_femoral', 'Femoral comum', 'deep'],
  ['saphenofemoral_junction', 'Junção safenofemoral', 'superficial'],
  ['deep_femoral', 'Femoral profunda', 'deep'],
  ['femoral_proximal', 'Femoral — proximal', 'deep'],
  ['femoral_mid', 'Femoral — média', 'deep'],
  ['femoral_distal', 'Femoral — distal', 'deep'],
  ['popliteal', 'Poplítea', 'deep'],
  ['posterior_tibial', 'Tibiais posteriores', 'deep'],
  ['fibular', 'Fibulares', 'deep'],
  ['anterior_tibial', 'Tibiais anteriores', 'optional'],
  ['gastrocnemius', 'Gastrocnêmias', 'optional'],
  ['soleal', 'Soleares', 'optional'],
  ['great_saphenous_proximal_thigh', 'Safena magna — coxa proximal', 'superficial'],
  ['great_saphenous_mid_thigh', 'Safena magna — coxa média', 'superficial'],
  ['great_saphenous_distal_thigh', 'Safena magna — coxa distal', 'superficial'],
  ['great_saphenous_knee', 'Safena magna — joelho', 'superficial'],
  ['great_saphenous_proximal_calf', 'Safena magna — perna proximal', 'superficial'],
  ['great_saphenous_mid_calf', 'Safena magna — perna média', 'superficial'],
  ['great_saphenous_distal_calf', 'Safena magna — perna distal', 'superficial'],
  ['saphenopopliteal_junction', 'Junção safenopoplítea', 'superficial'],
  ['small_saphenous_proximal', 'Safena parva — proximal', 'superficial'],
  ['small_saphenous_distal', 'Safena parva — distal', 'superficial'],
  ['anterior_accessory_saphenous', 'Safena acessória anterior', 'optional_superficial'],
  ['giacomini', 'Veia de Giacomini', 'optional_superficial'],
] as const
export type VenousWebSegment = typeof VENOUS_WEB_SEGMENTS[number][0]
export type VenousWebSide = 'right' | 'left'
export const venousSectionId = (side: VenousWebSide, segment: string) => `${side}_${segment}`

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const number = (key: string, label: string, placeholder: string): Field => ({ key, label, kind: 'text', placeholder, halfWidth: true })
export const VENOUS_ASSESSMENT = [['not_assessed', 'Não avaliada'], ['evaluated', 'Avaliada'], ['limited', 'Avaliação limitada']] as const
export const VENOUS_COMPRESSION = [['not_assessed', 'Não testada'], ['complete', 'Completa'], ['partial', 'Parcial'], ['absent', 'Ausente'], ['not_testable', 'Não testável']] as const
const MANEUVERS = [['not_documented', 'Não informada'], ['valsalva', 'Valsalva'], ['distal_compression', 'Compressão distal'], ['release', 'Liberação da compressão']] as const
const POSITIONS = [['not_documented', 'Não informada'], ['standing', 'Em pé'], ['supine', 'Deitado'], ['reverse_trendelenburg', 'Trendelenburg reverso'], ['sitting', 'Sentado']] as const

function moduleWithFields(category: string, id: string, label: string, fields: Field[]): OrganModule {
  const initialState = (): OrganState => Object.fromEntries(fields.map(field => [field.key, field.options?.find(option => option.isDefault)?.value ?? '']))
  return { schema: { id, name: label, category, fields }, initialState, compose: () => ({ body: '', conclusion: [], isNormal: true }) }
}

function segmentSection(category: string, side: VenousWebSide, definition: typeof VENOUS_WEB_SEGMENTS[number]): ExamSection {
  const [segment, label] = definition
  const id = venousSectionId(side, segment)
  const name = `${label} · ${side === 'right' ? 'direita' : 'esquerda'}`
  const fields: Field[] = [
    select('assessment', 'Avaliação', VENOUS_ASSESSMENT),
    select('compressibility', 'Compressibilidade', VENOUS_COMPRESSION),
    number('diameter_mm', 'Calibre (mm)', '5,2'),
    { key: 'limitation', label: 'Limitação, quando houver', kind: 'text', placeholder: 'Descreva a limitação técnica' },
    {
      key: 'reflux', label: 'Pesquisa de refluxo', kind: 'segmented', presentation: 'select', options: [
        { value: 'not_tested', label: 'Não realizada', isDefault: true },
        { value: 'tested', label: 'Realizada', subFields: [
          number('time_s', 'Tempo de refluxo (s)', '0,8'),
          select('maneuver', 'Manobra', MANEUVERS), select('position', 'Posição', POSITIONS),
        ] },
      ],
    },
    {
      key: 'thrombosis', label: 'Trombose', kind: 'segmented', presentation: 'select', options: [
        { value: 'not_documented', label: 'Sem observação de trombose', isDefault: true },
        { value: 'present', label: 'Achado de trombose', subFields: [
          { key: 'extent_to', label: 'Extensão observada', kind: 'text', placeholder: 'Segmento e limites da trombose' },
          select('occlusion', 'Oclusão', [['not_assessed', 'Não definida'], ['partial', 'Parcial'], ['occlusive', 'Oclusiva'], ['indeterminate', 'Indeterminada']]),
          select('phase', 'Fase', [['not_assessed', 'Não classificar'], ['acute', 'Aguda'], ['chronic_recanalized', 'Crônica / recanalizada'], ['mixed', 'Mista'], ['indeterminate', 'Indeterminada']]),
          { key: 'phase_evidence', label: 'Achados que sustentam a fase', kind: 'text', placeholder: 'Descreva os achados observados' },
          select('phase_confirmed', 'Confirmar fase', [['no', 'Não confirmada'], ['yes', 'Fase confirmada pelo médico']]),
          select('material', 'Material intraluminal', [['not_assessed', 'Não avaliado'], ['absent', 'Ausente'], ['present', 'Presente']]),
          select('confirmed', 'Confirmado pelo médico', [['no', 'Pendente de confirmação'], ['yes', 'Confirmado']]),
        ] },
      ],
    },
  ]
  return { id, label: name, group: 'orgaos', module: moduleWithFields(category, id, name, fields) }
}

function perforatorsSection(category: string, side: VenousWebSide): ExamSection {
  const id = `${side}_perforators`
  const name = `Perfurantes · ${side === 'right' ? 'direita' : 'esquerda'}`
  const fields: Field[] = Array.from({ length: 6 }, (_, index) => ({
    key: `p${index + 1}`, label: `Perfurante ${index + 1}`, kind: 'segmented' as const, presentation: 'select' as const, options: [
      { value: 'not_assessed', label: 'Não registrada', isDefault: true },
      { value: 'assessed', label: 'Avaliada', subFields: [
        select('surface', 'Face', [['medial', 'Medial'], ['lateral', 'Lateral'], ['posterior', 'Posterior'], ['anterior', 'Anterior']]),
        select('level', 'Nível', [['thigh', 'Coxa'], ['knee', 'Joelho'], ['proximal_calf', 'Perna proximal'], ['mid_calf', 'Perna média'], ['distal_calf', 'Perna distal']]),
        number('distance_cm', 'Distância ao maléolo medial (cm)', '12'),
        number('diameter_mm', 'Calibre (mm)', '4,0'), number('reflux_s', 'Tempo de refluxo (s)', '0,8'),
        select('maneuver', 'Manobra', MANEUVERS), select('position', 'Posição', POSITIONS),
        select('connection', 'Fluxo do sistema profundo para superficial', [['not_assessed', 'Não documentado'], ['documented', 'Documentado'], ['absent', 'Ausente']]),
      ] },
    ],
  }))
  return { id, label: name, group: 'orgaos', module: moduleWithFields(category, id, name, fields) }
}

function category(id: 'DOPPLER_VENOSO_MMII' | 'DOPPLER_VENOSO_MMII_MEDIDAS'): ExamCategory {
  const sections = (['right', 'left'] as const).flatMap(side => [
    ...VENOUS_WEB_SEGMENTS.map(segment => segmentSection(id, side, segment)), perforatorsSection(id, side),
  ])
  return {
    id, name: id.endsWith('_MEDIDAS') ? 'Doppler venoso MMII · medidas' : 'Doppler venoso MMII',
    title: 'ULTRASSONOGRAFIA COM DOPPLER VENOSO DOS MEMBROS INFERIORES', tecnica: '', achadosHeader: '', conclusionNormal: '', sections,
    controls: [
      select('protocol', 'Protocolo', [['complete', 'Completo'], ['tvp_only', 'Pesquisa de TVP'], ['mapping_measurements', 'Mapeamento com medidas']], id.endsWith('_MEDIDAS') ? 'mapping_measurements' : 'tvp_only'),
      select('laterality', 'Lateralidade', [['bilateral', 'Bilateral'], ['right', 'Direito'], ['left', 'Esquerdo']]),
      select('visible_side', 'Mostrar campos', [['both', 'Ambos os lados'], ['right', 'Direito'], ['left', 'Esquerdo']]),
      select('physician_reviewed', 'Revisão médica', [['no', 'Em preenchimento'], ['yes', 'Achados revisados pelo médico']]),
      select('optional_segments', 'Segmentos complementares', [['hide', 'Ocultar'], ['show', 'Mostrar']]),
    ],
    resolveSections: opts => sections.filter(section => {
      const side = section.id.startsWith('right_') ? 'right' : 'left'
      if (opts.laterality !== 'bilateral' && opts.laterality && opts.laterality !== side) return false
      if (opts.visible_side !== 'both' && opts.visible_side && opts.visible_side !== side) return false
      if (section.id.endsWith('_perforators')) return opts.protocol !== 'tvp_only'
      const segment = VENOUS_WEB_SEGMENTS.find(([key]) => section.id === venousSectionId(side, key))
      if (!segment) return false
      if (opts.protocol === 'tvp_only' && segment[0] !== 'saphenofemoral_junction' && segment[2].includes('superficial')) return false
      return !segment[2].startsWith('optional') || opts.optional_segments === 'show'
    }),
  }
}
export const dopplerVenosoMmii = category('DOPPLER_VENOSO_MMII')
export const dopplerVenosoMmiiMedidas = category('DOPPLER_VENOSO_MMII_MEDIDAS')
