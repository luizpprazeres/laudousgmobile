/**
 * Plano de apresentação do abdome total. Não cria órgãos nem muda o estado:
 * cada card guarda as seções originais, com os mesmos ids e módulos clínicos.
 * A ordem do laudo/renderer continua independente desta ordem visual.
 */
import type { ExamSection } from './abdomeTotal'

export type AbdomeTotalGridSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>
export type AbdomeTotalCardSize = 'regular' | 'wide'

export interface AbdomeTotalVisualCard<T extends AbdomeTotalGridSection> {
  /** Chave apenas de apresentação; nunca usar como chave no ExamState. */
  id: string
  label: string
  size: AbdomeTotalCardSize
  /** Referências originais. Render, reset e atualização seguem por section.id. */
  sections: T[]
}

type CardSpec = {
  id: string
  label: string
  size: AbdomeTotalCardSize
  sectionIds: readonly string[]
}

/**
 * Em 3 colunas: fígado (1) + vesícula/vias (2); rins (2) + bexiga (1);
 * pâncreas/baço (2) + vasos (1). Cards relacionados ficam lado a lado sem
 * abrir uma quarta linha vazia. Em 2 colunas, os pares ocupam a linha toda.
 */
export const ABDOME_TOTAL_CARD_SPECS: readonly CardSpec[] = [
  { id: 'figado', label: 'Fígado', size: 'regular', sectionIds: ['figado'] },
  { id: 'vesicula-vias-biliares', label: 'Vesícula e vias biliares', size: 'wide', sectionIds: ['vesicula', 'vias_biliares'] },
  { id: 'rins', label: 'Rins', size: 'wide', sectionIds: ['rim_direito', 'rim_esquerdo'] },
  { id: 'bexiga', label: 'Bexiga', size: 'regular', sectionIds: ['bexiga'] },
  { id: 'pancreas-baco', label: 'Pâncreas e baço', size: 'wide', sectionIds: ['pancreas', 'baco'] },
  { id: 'vasos-abdominais', label: 'Vasos abdominais', size: 'regular', sectionIds: ['aorta', 'veia_cava'] },
]

/**
 * Se uma seção estiver oculta/ausente (ex.: bexiga compartilhada numa
 * composição), nenhuma outra desaparece: o par incompleto vira card simples.
 */
export function planAbdomeTotalVisualCards<T extends AbdomeTotalGridSection>(sections: readonly T[]): AbdomeTotalVisualCard<T>[] {
  const organs = sections.filter((section) => section.group === 'orgaos')
  const byId = new Map(organs.map((section) => [section.id, section]))
  const consumed = new Set<string>()
  const cards: AbdomeTotalVisualCard<T>[] = []

  for (const spec of ABDOME_TOTAL_CARD_SPECS) {
    const present = spec.sectionIds.map((id) => byId.get(id)).filter((section): section is T => Boolean(section))
    if (present.length === spec.sectionIds.length) {
      cards.push({ id: spec.id, label: spec.label, size: spec.size, sections: present })
    } else {
      for (const section of present) {
        cards.push({ id: section.id, label: section.label, size: 'regular', sections: [section] })
      }
    }
    for (const section of present) consumed.add(section.id)
  }

  for (const section of organs) {
    if (!consumed.has(section.id)) {
      cards.push({ id: section.id, label: section.label, size: 'regular', sections: [section] })
    }
  }
  return cards
}
