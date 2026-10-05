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
    categories: ['OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'CERVICOMETRIA', 'PERFIL_BIOFISICO_FETAL', 'ECOCARDIOGRAFIA_FETAL'],
  },
  {
    id: 'saude_mulher',
    label: 'Saúde da mulher',
    categories: ['PELVE_FEMININA', 'PELVICO_TRANSVAGINAL', 'PELVICO_TRANSVAGINAL_DOPPLER', 'PELVICO_TRANSABDOMINAL', 'PELVICO_TRANSABDOMINAL_DOPPLER', 'MONITORIZACAO_FOLICULAR', 'HISTEROSSONOGRAFIA', 'HYCOSY', 'PESQUISA_ENDOMETRIOSE', 'MAMARIA', 'MAMAS_DOPPLER', 'MAMAS_AXILAS_DOPPLER'],
  },
  {
    id: 'pequenas_partes',
    label: 'Pequenas partes',
    categories: ['TIREOIDE', 'TIREOIDE_DOPPLER', 'PARATIREOIDE', 'GLANDULAS_SALIVARES', 'CERVICAL', 'CERVICAL_DOPPLER', 'PARTES_MOLES', 'MAMA_MASCULINA', 'AXILAS'],
    shortcuts: ['MAMARIA'],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético',
    categories: ['MUSCULOESQUELETICO', 'MSK_COTOVELO', 'MSK_COTOVELO_BILATERAL', 'MSK_JOELHO', 'MSK_JOELHO_BILATERAL', 'MSK_MAO', 'MSK_MAO_BILATERAL', 'MSK_OMBRO', 'MSK_OMBRO_BILATERAL', 'MSK_PUNHO', 'MSK_PUNHO_BILATERAL', 'MSK_PE', 'MSK_PE_BILATERAL', 'MSK_QUADRIL', 'MSK_QUADRIL_BILATERAL', 'MSK_TORNOZELO', 'MSK_TORNOZELO_BILATERAL'],
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
  MSK_COTOVELO: 'Cotovelo unilateral',
  MSK_COTOVELO_BILATERAL: 'Cotovelo bilateral',
  MSK_JOELHO: 'Joelho unilateral',
  MSK_JOELHO_BILATERAL: 'Joelho bilateral',
  MSK_MAO: 'Mão unilateral',
  MSK_MAO_BILATERAL: 'Mão bilateral',
  MSK_OMBRO: 'Ombro unilateral',
  MSK_OMBRO_BILATERAL: 'Ombro bilateral',
  MSK_PUNHO: 'Punho unilateral',
  MSK_PUNHO_BILATERAL: 'Punho bilateral',
  MSK_PE: 'Pé unilateral',
  MSK_PE_BILATERAL: 'Pé bilateral',
  MSK_QUADRIL: 'Quadril unilateral',
  MSK_QUADRIL_BILATERAL: 'Quadril bilateral',
  MSK_TORNOZELO: 'Tornozelo unilateral',
  MSK_TORNOZELO_BILATERAL: 'Tornozelo bilateral',
  DOPPLER_OBSTETRICO: 'Obstétrica com Doppler',
  DOPPLER_HEPATICO: 'Doppler hepático',
  TIREOIDE: 'Tireoide',
  TIREOIDE_DOPPLER: 'Tireoide com Doppler',
  TRANSFONTANELA: 'Transfontanelar',
  DOPPLER_AORTA_ILIACAS: 'Doppler de aorta e ilíacas',
  PELVICO_TRANSVAGINAL: 'Pélvico transvaginal',
  PELVICO_TRANSABDOMINAL: 'Pélvico abdominal',
  PELVICO_TRANSVAGINAL_DOPPLER: 'Pélvico transvaginal com Doppler',
  PELVICO_TRANSABDOMINAL_DOPPLER: 'Pélvico abdominal com Doppler',
  MONITORIZACAO_FOLICULAR: 'Monitorização folicular',
  HISTEROSSONOGRAFIA: 'Histerossonografia',
  HYCOSY: 'HyCoSy',
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
  ECOCARDIOGRAFIA_FETAL: ['ecocardiografia fetal', 'ecocardiograma fetal', 'eco fetal', 'coracao fetal', 'cardiopatia congenita', 'arritmia fetal'],
  PELVE_FEMININA: ['pelvica', 'utero', 'ovarios', 'endometrio', 'transvaginal', 'ginecologica'],
  PELVICO_TRANSVAGINAL: ['pelvico', 'pelvica', 'transvaginal', 'endovaginal', 'utero', 'ovarios', 'endometrio', 'ginecologica'],
  PELVICO_TRANSABDOMINAL: ['pelvico abdominal', 'pelvica abdominal', 'transabdominal', 'via abdominal', 'pelve suprapubica'],
  PELVICO_TRANSVAGINAL_DOPPLER: ['doppler pelvico', 'doppler ginecologico', 'transvaginal com doppler'],
  PELVICO_TRANSABDOMINAL_DOPPLER: ['doppler pelvico', 'pelvico abdominal com doppler', 'transabdominal com doppler'],
  MONITORIZACAO_FOLICULAR: ['monitorizacao folicular', 'foliculometria', 'foliculos', 'ovulacao', 'inducao de ovulacao'],
  HISTEROSSONOGRAFIA: ['histerossonografia', 'sono-histerografia', 'infusao salina', 'cavidade uterina', 'polipo endometrial', 'sinequia', 'istmocele', 'septo uterino'],
  PESQUISA_ENDOMETRIOSE: ['endometriose', 'endometriose profunda', 'endometrioma', 'mapeamento de endometriose', 'adenomiose', 'sinal de deslizamento'],
  HYCOSY: ['hycosy', 'histerossonossalpingografia', 'histerossalpingo', 'tubas', 'trompas', 'perviedade tubaria', 'permeabilidade tubaria', 'infertilidade'],
  MAMARIA: ['mama', 'mamas', 'mamaria', 'axila', 'axilas', 'bi-rads', 'birads'],
  MAMAS_DOPPLER: ['doppler mamario', 'mama doppler', 'vascularizacao mamaria'],
  MAMAS_AXILAS_DOPPLER: ['doppler mamario', 'mama doppler', 'axilas doppler'],
  TIREOIDE_DOPPLER: ['tireoide doppler', 'doppler tireoidiano', 'vascularizacao tireoidiana', 'hipertireoidismo'],
  CERVICAL_DOPPLER: ['doppler cervical', 'linfonodo doppler', 'pescoco doppler'],
  AXILAS: ['axila', 'axilas', 'regioes axilares', 'linfonodo axilar', 'linfonodos axilares'],
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
  MSK_COTOVELO: ['cotovelo', 'cotovelos', 'epicondilite', 'unilateral', 'msk'],
  MSK_COTOVELO_BILATERAL: ['cotovelo', 'cotovelos', 'epicondilite', 'bilateral', 'ambos', 'msk'],
  MSK_JOELHO: ['joelho', 'joelhos', 'patelar', 'unilateral', 'msk'],
  MSK_JOELHO_BILATERAL: ['joelho', 'joelhos', 'patelar', 'bilateral', 'ambos', 'msk'],
  MSK_MAO: ['mao', 'maos', 'dedo', 'polia', 'unilateral', 'msk'],
  MSK_MAO_BILATERAL: ['mao', 'maos', 'dedo', 'polia', 'bilateral', 'ambos', 'msk'],
  MSK_OMBRO: ['ombro', 'ombros', 'manguito', 'unilateral', 'msk'],
  MSK_OMBRO_BILATERAL: ['ombro', 'ombros', 'manguito', 'bilateral', 'ambos', 'msk'],
  MSK_PUNHO: ['punho', 'punhos', 'tunel do carpo', 'unilateral', 'msk'],
  MSK_PUNHO_BILATERAL: ['punho', 'punhos', 'tunel do carpo', 'bilateral', 'ambos', 'msk'],
  MSK_PE: ['pe', 'pes', 'fascia plantar', 'unilateral', 'msk'],
  MSK_PE_BILATERAL: ['pe', 'pes', 'fascia plantar', 'bilateral', 'ambos', 'msk'],
  MSK_QUADRIL: ['quadril', 'quadris', 'trocanter', 'unilateral', 'msk'],
  MSK_QUADRIL_BILATERAL: ['quadril', 'quadris', 'trocanter', 'bilateral', 'ambos', 'msk'],
  MSK_TORNOZELO: ['tornozelo', 'tornozelos', 'tendao calcaneo', 'unilateral', 'msk'],
  MSK_TORNOZELO_BILATERAL: ['tornozelo', 'tornozelos', 'tendao calcaneo', 'bilateral', 'ambos', 'msk'],
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
