/**
 * Atalhos por trimestre para o morfológico.
 *
 * O conteúdo clínico continua vindo de MORFOLOGICO. Os cards apenas fixam o
 * trimestre para o médico abrir diretamente o formulário correspondente.
 */
import type { ExamCategory } from './abdomeTotal'
import type { OrganState } from '../types'
import { morfologico } from './morfologico'

export const MORFOLOGICO_PRESETS = [
  { id: 'MORFOLOGICO_1T', trimestre: '1t', name: 'Morfológico 1º trimestre' },
  { id: 'MORFOLOGICO_2T', trimestre: '2t', name: 'Morfológico 2º trimestre' },
  { id: 'MORFOLOGICO_3T', trimestre: '3t', name: 'Morfológico 3º trimestre' },
] as const

export function morfologicoPresetDe(category: string) {
  return MORFOLOGICO_PRESETS.find((preset) => preset.id === category)
}

function categoryOf(preset: (typeof MORFOLOGICO_PRESETS)[number]): ExamCategory {
  const effective = (opts: OrganState): OrganState => ({ ...opts, trimestre: preset.trimestre })
  return {
    ...morfologico,
    id: preset.id,
    name: preset.name,
    controls: [],
    title: morfologico.resolveTitle!(effective({})),
    resolveTitle: (opts) => morfologico.resolveTitle!(effective(opts)),
    resolveSections: (opts) => morfologico.resolveSections!(effective(opts)),
    resolveCalculators: (opts) => morfologico.resolveCalculators?.(effective(opts)) ?? [],
  }
}

export const MORFOLOGICO_PRESET_CATEGORIES: ExamCategory[] = MORFOLOGICO_PRESETS.map(categoryOf)
