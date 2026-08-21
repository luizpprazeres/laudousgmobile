/**
 * Compositor do laudo determinístico — monta o texto canônico completo
 * (TÍTULO / TÉCNICA / ANÁLISE / CONCLUSÃO) a partir do estado dos órgãos.
 *
 * Convenção de storage (igual ao ReportEditor): "\n\n" separa seções,
 * "\n" simples = quebra interna. O espaçamento visual é do CSS, não do texto.
 */

import type { OrganState } from './types'
import type { ExamCategory } from './organs/abdomeTotal'
/**
 * Caminho RELATIVO, não o alias `@/`. Este módulo é importado também de fora do
 * `apps/web` — o gate diferencial roda em `apps/api` e carrega o compositor da
 * web para comparar os dois caminhos. Lá o `@/` aponta para outra árvore, e o
 * import quebra em tempo de EXECUÇÃO, depois de o build ter passado.
 */
import { categoriaMigrada } from '../catalog/migradas'

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

/**
 * ⚠️ CATEGORIA MIGRADA NÃO PASSA POR AQUI — a trava, não a boa vontade.
 *
 * Quando uma categoria passa a sair do renderer canônico, este compositor deixa
 * de ser a fonte da redação dela. O risco não é alguém decidir usá-lo de novo;
 * é alguém chamá-lo SEM PERCEBER — um caminho novo, um botão de prévia, um
 * export — e receber um laudo plausível, escrito por um motor aposentado, que
 * ninguém vai reconhecer como errado porque ele parece certo.
 *
 * Na TIREOIDE isso foi resolvido apagando o compositor dela. A pelve usa o
 * sistema genérico, e apagar as funções de cada módulo seria uma cirurgia
 * grande com pouco ganho. A trava faz o mesmo trabalho: quem chamar quebra
 * alto, com o nome da categoria e o que fazer.
 */
export function composeReport(
  category: ExamCategory,
  state: ExamState,
): ComposedReport {
  if (categoriaMigrada(category.id)) {
    throw new Error(
      `${category.id} sai do renderer canônico — use /api/catalog/${category.id}/render ` +
        `(ver lib/catalog/migradas.ts). O compositor local não é mais a fonte da redação desta categoria.`,
    )
  }

  const bodyParts: string[] = []
  const conclusion: string[] = []
  let alteredCount = 0

  // Controles de categoria (via, menopausa…) — estado reservado em '__opts'.
  const optsState: OrganState = state['__opts'] ?? {}

  // Seções ativas (ex.: MSK filtra pelo segmento). Default = todas.
  const sections = category.resolveSections?.(optsState) ?? category.sections

  for (const section of sections) {
    if (section.module) {
      const s = state[section.id] ?? section.module.initialState()
      const c = section.module.compose(s, optsState)
      if (c.body) bodyParts.push(c.body) // pula seções sem corpo (ex.: ureteres normal)
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
    // Quando há alteração, fecha lembrando que o restante está normal (se a
    // categoria definir um fechamento genérico — próstata, p.ex., não usa).
    if (alteredCount > 0 && category.conclusionClosing) {
      items.push(`${conclusion.length + 1}. ${category.conclusionClosing}`)
    }
    conclusionBlock = items.join('\n')
  }

  const titulo = category.resolveTitle?.(optsState) ?? category.title
  const tecnica = category.resolveTecnica?.(optsState) ?? category.tecnica
  const parts = [
    titulo,
    `COMENTÁRIOS:\n${tecnica}`,
    category.achadosHeader,
    ...bodyParts,
    `CONCLUSÃO:\n${conclusionBlock}`,
  ]
  if (category.footer) parts.push(category.footer)
  const text = parts.join('\n\n')

  return { text, conclusion, alteredCount }
}
