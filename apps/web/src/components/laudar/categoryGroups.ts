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

export type CategoryGroupId = 'medicina_interna' | 'obstetricia' | 'saude_mulher' | 'pequenas_partes' | 'musculoesqueletico'

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
    categories: ['ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA', 'DOPPLER_CAROTIDAS'],
  },
  {
    id: 'obstetricia',
    label: 'Obstetrícia',
    categories: ['OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'CERVICOMETRIA'],
  },
  {
    id: 'saude_mulher',
    label: 'Saúde da mulher',
    categories: ['PELVE_FEMININA', 'MAMARIA'],
  },
  {
    id: 'pequenas_partes',
    label: 'Pequenas partes',
    categories: ['TIREOIDE', 'CERVICAL', 'PARTES_MOLES'],
    shortcuts: ['MAMARIA'],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético',
    categories: ['MUSCULOESQUELETICO'],
  },
]

/** Nome exibido no seletor quando difere do nome do catálogo. */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  DOPPLER_OBSTETRICO: 'Obstétrica com Doppler',
  TIREOIDE: 'Tireoide',
}

/**
 * Termos de busca por categoria. Cuidado ao acrescentar: um sinônimo amplo
 * demais ("obstétrica" no morfológico, por exemplo) faz a busca devolver
 * exames que o médico não pediu.
 */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  ABDOMEN_TOTAL: ['abdome', 'abdomen', 'abdominal', 'figado', 'vesicula', 'pancreas', 'baco', 'rins', 'aorta'],
  ABDOMEN_SUPERIOR: ['abdome', 'abdomen', 'figado', 'vesicula', 'vias biliares', 'pancreas', 'baco'],
  VIAS_URINARIAS: ['rins', 'renal', 'bexiga', 'ureteres', 'trato urinario', 'urinario'],
  PROSTATA_SUPRAPUBICA: ['prostata', 'suprapubica', 'vesiculas seminais'],
  DOPPLER_CAROTIDAS: ['carotidas', 'vertebrais', 'doppler cervical', 'vasos do pescoco'],
  OBSTETRICA: ['gestacao', 'gravidez', 'gestante', 'pre-natal', 'feto', 'fetal', 'biometria fetal'],
  DOPPLER_OBSTETRICO: ['doppler fetal', 'arteria umbilical', 'cerebral media', 'ducto venoso', 'uterinas'],
  MORFOLOGICO: ['morfologico', 'morfologia fetal', 'anatomia fetal', 'translucencia nucal', 'primeiro trimestre', 'segundo trimestre'],
  CERVICOMETRIA: ['colo uterino', 'comprimento do colo', 'colo do utero', 'transvaginal'],
  PELVE_FEMININA: ['pelvica', 'utero', 'ovarios', 'endometrio', 'transvaginal', 'ginecologica'],
  MAMARIA: ['mama', 'mamas', 'mamaria', 'axila', 'axilas', 'bi-rads', 'birads'],
  TIREOIDE: ['tiroide', 'tireoide', 'ti-rads', 'tirads', 'nodulo tireoidiano'],
  CERVICAL: ['pescoco', 'linfonodos cervicais', 'glandulas salivares', 'parotida', 'submandibular'],
  PARTES_MOLES: ['partes moles', 'subcutaneo', 'lipoma', 'parede'],
  MUSCULOESQUELETICO: ['msk', 'articular', 'tendao', 'ombro', 'cotovelo', 'punho', 'mao', 'quadril', 'joelho', 'tornozelo', 'pe'],
}

export function normalizeSearch(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export type CategoryEntry = { id: string; name: string; groupId: CategoryGroupId; groupLabel: string }

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
export function groupCategories(catalog: Array<{ id: string; name: string }>): Array<CategoryGroup & { entries: CategoryEntry[] }> {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const placed = new Set<string>()
  const groups = CATEGORY_GROUPS.map((group) => {
    const entries = group.categories
      .filter((id) => byId.has(id) && !placed.has(id))
      .map((id) => {
        placed.add(id)
        return { id, name: CATEGORY_DISPLAY_NAMES[id] ?? byId.get(id)!.name, groupId: group.id, groupLabel: group.label }
      })
    return { ...group, entries }
  })
  // Uma categoria nova no catálogo nunca some do seletor por falta de grupo.
  const orphans = catalog.filter((item) => !placed.has(item.id))
  if (orphans.length && groups[0]) {
    groups[0].entries.push(...orphans.map((item) => ({
      id: item.id, name: CATEGORY_DISPLAY_NAMES[item.id] ?? item.name, groupId: groups[0].id, groupLabel: groups[0].label,
    })))
  }
  return groups
}
