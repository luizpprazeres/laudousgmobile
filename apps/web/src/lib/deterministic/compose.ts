/**
 * Compositor do laudo determinístico — monta o texto canônico completo
 * (TÍTULO / TÉCNICA / ANÁLISE / CONCLUSÃO) a partir do estado dos órgãos.
 *
 * Convenção de storage (igual ao ReportEditor): "\n\n" separa seções,
 * "\n" simples = quebra interna. O espaçamento visual é do CSS, não do texto.
 */

import type { OrganState, PendenciaLocal } from './types'
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
  /** Dado essencial ausente. Com pendência, `text` sai VAZIO: o formulário
   *  bloqueia em vez de imprimir placeholder ou conclusão provisória. */
  pendencias: PendenciaLocal[]
  /** Quantas seções de órgão estão alteradas. */
  alteredCount: number
}

/** Estado inicial do exame inteiro (defaults de cada módulo). */
export function initialExamState(category: ExamCategory): ExamState {
  const state: ExamState = {}
  const opts: OrganState = {}
  for (const control of category.controls ?? []) {
    if (control.kind === 'checklist') {
      opts[control.key] = (control.options ?? []).filter((option) => option.isDefault).map((option) => option.value)
      continue
    }
    const selected = (control.options ?? []).find((option) => option.isDefault)
    if (selected) opts[control.key] = selected.value
  }
  if (Object.keys(opts).length > 0) state.__opts = opts
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
  const pendencias: PendenciaLocal[] = []
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
      pendencias.push(...(c.pendencias ?? []))
      if (!c.isNormal) alteredCount += 1
    } else if (section.normalBody) {
      bodyParts.push(section.normalBody)
    }
  }

  pendencias.push(...(category.resolvePendencias?.(state) ?? []))

  // Achado marcado sem os dados que o descrevem: nenhum texto, só o motivo.
  if (pendencias.length > 0) return { text: '', conclusion: [], alteredCount, pendencias }

  // Consolidação opcional entre seções (ex.: mesmo achado bilateral em um item só).
  if (category.resolveConclusionItems) {
    const consolidated = category.resolveConclusionItems([...conclusion], state)
    conclusion.splice(0, conclusion.length, ...consolidated)
  }

  // Monta a conclusão numerada (ou frase de normalidade).
  let conclusionBlock: string
  if (conclusion.length === 0) {
    conclusionBlock = category.resolveConclusionNormal?.(optsState) ?? category.conclusionNormal
  } else {
    const items = conclusion.map((c, i) => `${i + 1}. ${c}`)
    // Quando há alteração, fecha lembrando que o restante está normal (se a
    // categoria definir um fechamento genérico — próstata, p.ex., não usa).
    const closing = category.resolveConclusionClosing
      ? category.resolveConclusionClosing(optsState, alteredCount, sections.filter((s) => s.module).length)
      : category.conclusionClosing
    if (alteredCount > 0 && closing) {
      items.push(`${conclusion.length + 1}. ${closing}`)
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
  const footer = category.resolveFooter ? category.resolveFooter(optsState) : category.footer
  if (footer) parts.push(footer)
  const text = parts.join('\n\n')

  return { text, conclusion, pendencias, alteredCount }
}
