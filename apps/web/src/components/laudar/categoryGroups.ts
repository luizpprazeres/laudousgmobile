import { categoryDisplayLabel } from '@laudousg/shared'

/**
 * FAMÍLIAS DE EXAME no seletor de categoria da Web — só navegação.
 *
 * Nada aqui muda o id da categoria: os ids são os mesmos que iOS, Android, o
 * renderer e os rascunhos usam. Cada exame aparece UMA vez; a mama mora em
 * Saúde da mulher e tem um atalho (não um segundo card) em Pequenas partes.
 *
 * Sinônimos são termos de busca, não conteúdo clínico: servem para achar o
 * exame pelo que o médico digita ("joelho", "tiroide", "gravidez").
 */

export type CategoryGroupId = 'medicina_interna' | 'obstetricia' | 'saude_mulher' | 'pequenas_partes' | 'musculoesqueletico' | 'vascular' | 'outros_exames'

export type CategoryGroup = {
  id: CategoryGroupId
  label: string
  /** Ids de categoria, na ordem de exibição. */
  categories: string[]
  /** Atalhos para exames que moram em outro grupo (sem card duplicado). */
  shortcuts?: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'medicina_interna',
    label: 'Medicina interna',
    categories: ['ABDOMEN_TOTAL', 'ABDOMEN_TOTAL_DOPPLER', 'ABDOMEN_SUPERIOR', 'DOPPLER_HEPATICO', 'AVALIACAO_MULTIPARAMETRICA_HEPATICA', 'ELASTOGRAFIA_HEPATICA', 'TORAX', 'PAREDE_ABDOMINAL', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA', 'PROSTATA_TRANSRETAL', 'ESCROTAL', 'BOLSA_TESTICULAR_DOPPLER', 'REGIAO_INGUINAL', 'DOPPLER_CAROTIDAS'],
  },
  {
    id: 'obstetricia',
    label: 'Obstetrícia',
    categories: ['OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'CERVICOMETRIA', 'PERFIL_BIOFISICO_FETAL'],
  },
  {
    id: 'saude_mulher',
    label: 'Saúde da mulher',
    categories: ['PELVE_FEMININA', 'PELVICO_TRANSVAGINAL', 'HISTEROSSONOGRAFIA', 'MAMARIA'],
  },
  {
    id: 'pequenas_partes',
    label: 'Pequenas partes',
    categories: ['TIREOIDE', 'PARATIREOIDE', 'GLANDULAS_SALIVARES', 'CERVICAL', 'PARTES_MOLES', 'MAMA_MASCULINA'],
    shortcuts: ['MAMARIA'],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético',
    categories: ['MUSCULOESQUELETICO'],
  },
  {
    id: 'vascular',
    label: 'Vascular',
    categories: ['DOPPLER_VENOSO_MMII', 'DOPPLER_VENOSO_MMII_MEDIDAS', 'DOPPLER_ARTERIAL_MMII', 'DOPPLER_AORTA_ILIACAS', 'DOPPLER_VENOSO_MMSS', 'DOPPLER_ARTERIAL_MMSS', 'DOPPLER_FISTULA_AV', 'DOPPLER_ARTERIAS_TEMPORAIS', 'DOPPLER_RENAL', 'DOPPLER_TRANSPLANTE_RENAL', 'DOPPLER_MESENTERICO'],
  },
  {
    id: 'outros_exames',
    label: 'Outros exames',
    categories: ['QUADRIL_INFANTIL', 'TRANSFONTANELA', 'OCULAR', 'LIVRE'],
  },
]

/** Nome exibido no seletor quando difere do nome do catálogo. */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  DOPPLER_OBSTETRICO: 'Obstétrica com Doppler',
  DOPPLER_HEPATICO: 'Doppler hepático',
  TIREOIDE: 'Tireoide',
  TRANSFONTANELA: 'Transfontanelar',
  DOPPLER_AORTA_ILIACAS: 'Doppler de aorta e ilíacas',
  PELVICO_TRANSVAGINAL: 'Pélvico transvaginal',
  HISTEROSSONOGRAFIA: 'Histerossonografia',
}

function displayName(id: string) {
  return CATEGORY_DISPLAY_NAMES[id] ?? categoryDisplayLabel(id)
}

/**
 * Termos de busca por categoria. Cuidado ao acrescentar: um sinônimo amplo
 * demais ("obstétrica" no morfológico, por exemplo) faz a busca devolver
 * exames que o médico não pediu.
 */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  ABDOMEN_TOTAL: ['abdome', 'abdomen', 'abdominal', 'figado', 'vesicula', 'pancreas', 'baco', 'rins', 'aorta'],
  ABDOMEN_TOTAL_DOPPLER: ['abdome', 'abdomen', 'doppler esplancnico', 'veia porta', 'portal'],
  DOPPLER_HEPATICO: ['figado', 'hepatica', 'doppler hepatico', 'veia porta', 'sistema portal'],
  AVALIACAO_MULTIPARAMETRICA_HEPATICA: ['figado', 'hepatica', 'gordura', 'rigidez', 'elastografia', 'multiparametrica'],
  ELASTOGRAFIA_HEPATICA: ['figado', 'hepatica', 'rigidez', 'fibrose', 'swe', 'arfi'],
  ABDOMEN_SUPERIOR: ['abdome', 'abdomen', 'figado', 'vesicula', 'vias biliares', 'pancreas', 'baco'],
  VIAS_URINARIAS: ['rins', 'renal', 'bexiga', 'ureteres', 'trato urinario', 'urinario'],
  PROSTATA_SUPRAPUBICA: ['prostata', 'suprapubica', 'vesiculas seminais'],
  DOPPLER_CAROTIDAS: ['carotidas', 'vertebrais', 'doppler cervical', 'vasos do pescoco'],
  OBSTETRICA: ['gestacao', 'gravidez', 'gestante', 'pre-natal', 'feto', 'fetal', 'biometria fetal'],
  DOPPLER_OBSTETRICO: ['doppler fetal', 'arteria umbilical', 'cerebral media', 'ducto venoso', 'uterinas'],
  MORFOLOGICO: ['morfologico', 'morfologia fetal', 'anatomia fetal', 'translucencia nucal', 'primeiro trimestre', 'segundo trimestre'],
  CERVICOMETRIA: ['colo uterino', 'comprimento do colo', 'colo do utero', 'transvaginal'],
  PERFIL_BIOFISICO_FETAL: ['perfil biofisico', 'pbf', 'vitalidade fetal', 'bem-estar fetal', 'cardiotocografia', 'manning'],
  PELVE_FEMININA: ['pelvica', 'utero', 'ovarios', 'endometrio', 'transvaginal', 'ginecologica'],
  PELVICO_TRANSVAGINAL: ['pelvico', 'pelvica', 'transvaginal', 'endovaginal', 'utero', 'ovarios', 'endometrio', 'ginecologica'],
  HISTEROSSONOGRAFIA: ['histerossonografia', 'sono-histerografia', 'infusao salina', 'cavidade uterina', 'polipo endometrial', 'sinequia', 'istmocele', 'septo uterino'],
  MAMARIA: ['mama', 'mamas', 'mamaria', 'axila', 'axilas', 'bi-rads', 'birads'],
  MAMA_MASCULINA: ['mama masculina', 'ginecomastia', 'homem', 'masculino', 'retroareolar'],
  TIREOIDE: ['tiroide', 'tireoide', 'ti-rads', 'tirads', 'nodulo tireoidiano'],
  PAREDE_ABDOMINAL: ['parede', 'hernia'],
  PROSTATA_TRANSRETAL: ['prostata', 'transretal'],
  ESCROTAL: ['testiculo', 'bolsa escrotal'],
  BOLSA_TESTICULAR_DOPPLER: ['bolsa testicular', 'doppler escrotal', 'doppler testicular', 'testiculo doppler', 'varicocele', 'torcao testicular', 'orquite', 'epididimite'],
  REGIAO_INGUINAL: ['inguinal', 'virilha'],
  PARATIREOIDE: ['paratireoides', 'paratiroide'],
  GLANDULAS_SALIVARES: ['salivar', 'parotida', 'submandibular'],
  DOPPLER_VENOSO_MMII: ['doppler venoso', 'membros inferiores', 'mapa venoso'],
  DOPPLER_VENOSO_MMII_MEDIDAS: ['doppler venoso medidas', 'medidas venosas'],
  DOPPLER_ARTERIAL_MMII: ['doppler arterial', 'arterial membros inferiores'],
  DOPPLER_VENOSO_MMSS: ['doppler venoso', 'membros superiores', 'braco', 'cateter'],
  DOPPLER_ARTERIAL_MMSS: ['doppler arterial', 'membros superiores', 'braco', 'desfiladeiro toracico'],
  DOPPLER_FISTULA_AV: ['fistula', 'acesso vascular'],
  DOPPLER_MESENTERICO: ['mesenterica', 'mesenterico', 'tronco celiaco', 'celiaco', 'isquemia mesenterica'],
  DOPPLER_ARTERIAS_TEMPORAIS: ['temporal', 'arterias temporais', 'arterite', 'halo'],
  DOPPLER_AORTA_ILIACAS: ['aorta', 'iliacas', 'iliaca', 'aneurisma de aorta', 'doppler aorta'],
  DOPPLER_RENAL: ['doppler renal', 'arterias renais'],
  DOPPLER_TRANSPLANTE_RENAL: ['transplante renal', 'enxerto renal', 'rim transplantado', 'doppler renal'],
  TRANSFONTANELA: ['fontanela', 'transfontanelar', 'neonatal', 'cranio', 'hemorragia peri-intraventricular'],
  OCULAR: ['olho', 'olhos', 'ocular', 'retina', 'vitreo', 'nervo optico'],
  LIVRE: ['livre', 'ditado livre'],
  TORAX: ['torax', 'pulmao', 'pulmonar', 'pleura', 'derrame pleural', 'linhas b'],
  QUADRIL_INFANTIL: ['quadril', 'infantil', 'lactente', 'graf'],
  CERVICAL: ['pescoco', 'linfonodos cervicais', 'glandulas salivares', 'parotida', 'submandibular'],
  PARTES_MOLES: ['partes moles', 'subcutaneo', 'lipoma', 'parede'],
  MUSCULOESQUELETICO: ['msk', 'articular', 'tendao', 'ombro', 'cotovelo', 'punho', 'mao', 'quadril', 'joelho', 'tornozelo', 'pe'],
}

export function normalizeSearch(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export type CategoryEntry = { id: string; name: string; groupId: CategoryGroupId; groupLabel: string; mode: 'structured' | 'writer' }

/**
 * Busca global sem acento: cada termo digitado precisa COMEÇAR uma palavra do
 * nome, de um sinônimo ou do nome da família. Por início de palavra, e não por
 * trecho: "colo" acha "colo uterino" sem trazer "ginecológica".
 */
export function matchesCategory(entry: CategoryEntry, query: string): boolean {
  const tokens = normalizeSearch(query).split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.length === 0) return true
  const words = [entry.name, entry.groupLabel, ...(CATEGORY_SYNONYMS[entry.id] ?? [])]
    .flatMap((text) => normalizeSearch(text).split(/[^a-z0-9]+/))
    .filter(Boolean)
  return tokens.every((token) => words.some((word) => word.startsWith(token)))
}

/** Categorias agrupadas, na ordem de exibição; ids fora dos grupos vão para o fim do primeiro. */
export function groupCategories(catalog: Array<{ id: string; name: string; mode?: 'structured' | 'writer' }>): Array<CategoryGroup & { entries: CategoryEntry[] }> {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const placed = new Set<string>()
  const groups = CATEGORY_GROUPS.map((group) => {
    const entries = group.categories
      .filter((id) => byId.has(id) && !placed.has(id))
      .map((id) => {
        placed.add(id)
        return { id, name: displayName(id), groupId: group.id, groupLabel: group.label, mode: byId.get(id)!.mode ?? 'structured' }
      })
    return { ...group, entries }
  })
  // Uma categoria nova no catálogo nunca some do seletor por falta de grupo.
  const orphans = catalog.filter((item) => !placed.has(item.id))
  if (orphans.length && groups[0]) {
    groups[0].entries.push(...orphans.map((item) => ({
      id: item.id, name: displayName(item.id), groupId: groups[0].id, groupLabel: groups[0].label, mode: item.mode ?? 'structured',
    })))
  }
  return groups
}
