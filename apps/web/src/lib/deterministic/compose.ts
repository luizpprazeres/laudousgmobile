/**
 * Compositor do laudo determinístico — monta o texto canônico completo
 * (TÍTULO / TÉCNICA / ANÁLISE / CONCLUSÃO) a partir do estado dos órgãos.
 *
 * Convenção de storage (igual ao ReportEditor): "\n\n" separa seções,
 * "\n" simples = quebra interna. O espaçamento visual é do CSS, não do texto.
 */

import type { OrganState } from './types'
import type { ExamCategory } from './organs/abdomeTotal'

/** Estado completo do exame: { [sectionId]: OrganState }. */
export type ExamState = Record<string, OrganState>

export interface ComposedReport {
  /** Texto canônico do laudo, pronto pro editor/preview. */
  text: string
  /** Itens de conclusão (para destaque/preview granular, se preciso). */
  conclusion: string[]
  /** Quantas seções de órgão estão alteradas. */
  alteredCount: number
}

/** Estado inicial do exame inteiro (defaults de cada módulo). */
export function initialExamState(category: ExamCategory): ExamState {
  const state: ExamState = {}
  for (const section of category.sections) {
    if (section.module) state[section.id] = section.module.initialState()
  }
  return state
}

/**
 * Adiciona as iniciais discretas da auxiliar/digitadora ao fim do laudo.
 * Formato: "/ha" (minúsculo). Opcional — controlado por toggle na UI.
 */
export function appendInitials(text: string, initials?: string): string {
  if (!initials) return text
  const clean = initials.trim().toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return text
  return `${text}\n\n/${clean}`
}

export function composeReport(
  category: ExamCategory,
  state: ExamState,
): ComposedReport {
  const bodyParts: string[] = []
  const conclusion: string[] = []
  let alteredCount = 0

  for (const section of category.sections) {
    if (section.module) {
      const s = state[section.id] ?? section.module.initialState()
      const c = section.module.compose(s)
      bodyParts.push(c.body)
      conclusion.push(...c.conclusion)
      if (!c.isNormal) alteredCount += 1
    } else if (section.normalBody) {
      bodyParts.push(section.normalBody)
    }
  }

  // Monta a conclusão numerada (ou frase de normalidade).
  let conclusionBlock: string
  if (conclusion.length === 0) {
    conclusionBlock = category.conclusionNormal
  } else {
    const items = conclusion.map((c, i) => `${i + 1}. ${c}`)
    // Quando há alteração, fecha lembrando que o restante está normal.
    if (alteredCount > 0) {
      items.push(`${conclusion.length + 1}. Demais estruturas abdominais sem alterações ecográficas.`)
    }
    conclusionBlock = items.join('\n')
  }

  const text = [
    category.title,
    `COMENTÁRIOS: ${category.tecnica}`,
    category.achadosHeader,
    ...bodyParts,
    `CONCLUSÃO:\n${conclusionBlock}`,
  ].join('\n\n')

  return { text, conclusion, alteredCount }
}
