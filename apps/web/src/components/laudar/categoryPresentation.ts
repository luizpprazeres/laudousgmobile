/**
 * Cor de identificação da categoria no Workspace.
 *
 * A cor é apenas um sinal visual no seletor; o restante da interface continua
 * usando a identidade verde do LaudoUSG. As classes ficam explícitas para o
 * Tailwind incluí-las no build.
 */
const CATEGORY_DOT_CLASSES: Record<string, string> = {
  ABDOMEN_TOTAL: 'bg-emerald-600',
  ABDOMEN_SUPERIOR: 'bg-amber-500',
  PROSTATA_SUPRAPUBICA: 'bg-blue-600',
  VIAS_URINARIAS: 'bg-cyan-500',
  MAMARIA: 'bg-rose-500',
  PELVE_FEMININA: 'bg-purple-500',
  CERVICAL: 'bg-sky-500',
  PARTES_MOLES: 'bg-teal-500',
  MUSCULOESQUELETICO: 'bg-lime-500',
  OBSTETRICA: 'bg-pink-500',
  MORFOLOGICO: 'bg-violet-500',
  DOPPLER_OBSTETRICO: 'bg-fuchsia-500',
  TIREOIDE: 'bg-sky-500',
}

const CATEGORY_COMPACT_NAMES: Record<string, string> = {
  MUSCULOESQUELETICO: 'MSK',
}

export function categoryDotClass(categoryId: string) {
  return CATEGORY_DOT_CLASSES[categoryId] ?? 'bg-emerald-600'
}

export function categoryCompactName(categoryId: string, fallback: string) {
  return CATEGORY_COMPACT_NAMES[categoryId] ?? fallback
}
