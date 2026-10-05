import { CATEGORY_GROUPS } from '@/components/laudar/categoryGroups'
import { categoryDisplayLabel } from '@laudousg/shared'

export const ACTIVE_EXAM_NAMES: Record<string, string> = {
  ABDOMEN_TOTAL: 'Abdome total',
  ABDOMEN_SUPERIOR: 'Abdome superior',
  VIAS_URINARIAS: 'Vias urinárias',
  PROSTATA_SUPRAPUBICA: 'Próstata transabdominal (suprapúbica)',
  DOPPLER_CAROTIDAS: 'Doppler de carótidas e vertebrais',
  OBSTETRICA: 'Obstétrica',
  DOPPLER_OBSTETRICO: 'Obstétrica com Doppler',
  MORFOLOGICO: 'Morfológica',
  CERVICOMETRIA: 'Cervicometria',
  PELVE_FEMININA: 'Pelve feminina',
  MAMARIA: 'Mamas e axilas',
  TIREOIDE: 'Tireoide',
  CERVICAL: 'Região cervical',
  PARTES_MOLES: 'Partes moles',
  MUSCULOESQUELETICO: 'Musculoesquelético',
}

/**
 * Mantém a copy específica da landing quando existe e usa a apresentação
 * clínica compartilhada para qualquer categoria nova. Identificadores internos
 * nunca devem aparecer para o usuário.
 */
export function activeExamName(id: string) {
  return ACTIVE_EXAM_NAMES[id] ?? categoryDisplayLabel(id)
}

/**
 * Modelos que já têm interface no código, mas continuam protegidos pelos
 * gates clínicos. A landing não pode apresentá-los como disponíveis antes do
 * mesmo rollout chegar à Web, ao iOS e ao Android.
 */
export const UPCOMING_EXAM_IDS = new Set([
  'AVALIACAO_MULTIPARAMETRICA_HEPATICA',
  'ELASTOGRAFIA_HEPATICA',
])

export function isLandingExamAvailable(id: string) {
  return !UPCOMING_EXAM_IDS.has(id)
}

export const UPCOMING_EXAMS: Record<string, string[]> = {
  medicina_interna: [
    'Avaliação multiparamétrica hepática',
    'Elastografia hepática',
  ],
  obstetricia: [],
  saude_mulher: [],
  pequenas_partes: [],
  musculoesqueletico: [],
  vascular: [],
  outros_exames: [],
}

export const MUSCULOSKELETAL_REGIONS = [
  'Ombro',
  'Cotovelo',
  'Punho',
  'Mão',
  'Quadril',
  'Joelho',
  'Tornozelo',
  'Pé',
] as const

export const ACTIVE_EXAM_COUNT = CATEGORY_GROUPS.reduce(
  (count, group) => count + group.categories.filter(isLandingExamAvailable).length,
  0,
)
