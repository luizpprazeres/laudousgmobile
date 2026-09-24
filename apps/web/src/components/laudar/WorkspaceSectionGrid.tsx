'use client'

import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ExamSection, Field, OrganState } from '@/lib/deterministic'

/**
 * A GRADE DE CARDS da aba Achados — todas as seções da categoria ao mesmo
 * tempo, sem sub-nav lateral e sem accordion.
 *
 * Este arquivo só organiza a apresentação. O corpo de cada card continua vindo
 * dos painéis que já existiam (OrganFormPanel, TireoideFormPanel, painéis de
 * calculadora…), entregue por `renderBody` — nenhum texto clínico nasce aqui, e
 * nenhum selo "Normal/Alterado" é inferido dos campos: estado diferente do
 * inicial não quer dizer achado.
 *
 * Contrato de seletores para os testes:
 *   [data-organ-card][data-section-id="<id da seção>"]
 *   data-section-group = cabecalho | orgaos | conclusao | calculos
 *   data-card-size     = regular | wide | full
 */

export type WorkspaceSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>
export type SectionCardSize = 'regular' | 'wide' | 'full'

const GROUP_ORDER: WorkspaceSection['group'][] = ['cabecalho', 'orgaos', 'conclusao', 'calculos']
const GROUP_LABELS: Record<WorkspaceSection['group'], string> = {
  cabecalho: 'Cabeçalho',
  orgaos: 'Órgãos',
  conclusao: 'Conclusão',
  calculos: 'Cálculos',
}

type GridProps = {
  /**
   * Categoria dona das seções. Entra na key dos cards: seções com o mesmo id
   * em categorias diferentes (bexiga, figado, ig…) não podem herdar o estado
   * local de um card da outra (achados raros abertos, calculadora). O estado
   * dos achados continua no mapa por categoria de LaudarWebExperience.
   */
  scopeKey: string
  sections: WorkspaceSection[]
  contentGroupLabel?: string
  sizeOf: (section: WorkspaceSection) => SectionCardSize
  /** Seções que o botão Reset consegue restaurar. */
  canReset: (section: WorkspaceSection) => boolean
  onReset: (section: WorkspaceSection) => void
  renderBody: (section: WorkspaceSection) => ReactNode
  /** Seção destacada (ex.: a que o celular acabou de preencher). */
  highlightedId?: string | null
}

export function WorkspaceSectionGrid({
  scopeKey,
  sections,
  contentGroupLabel,
  sizeOf,
  canReset,
  onReset,
  renderBody,
  highlightedId,
}: GridProps) {
  const groups = GROUP_ORDER
    .map((group) => ({ group, items: sections.filter((section) => section.group === group) }))
    .filter(({ items }) => items.length > 0)
  const showGroupTitles = groups.length > 1

  return (
    <div className="space-y-6">
      {groups.map(({ group, items }) => {
        const title = group === 'orgaos' && contentGroupLabel ? contentGroupLabel : GROUP_LABELS[group]
        return (
          <div key={group} data-section-group-block={group}>
            {showGroupTitles ? (
              <h2 className="mb-2.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                {title}
              </h2>
            ) : null}
            <div className="workspace-section-grid">
              {items.map((section) => {
                const renalPair = ['rim_direito', 'rim_esquerdo'].map(id => items.find(item => item.id === id))
                const paired = renalPair.every(Boolean)
                if (paired && section.id === 'rim_esquerdo') return null
                const card = (item: WorkspaceSection, embedded = false) => (
                  <SectionCard
                    key={`${scopeKey}:${item.id}`}
                    section={item}
                    size={sizeOf(item)}
                    resettable={canReset(item)}
                    onReset={() => onReset(item)}
                    highlighted={highlightedId === item.id}
                    embedded={embedded}
                  >
                    {renderBody(item)}
                  </SectionCard>
                )
                if (paired && section.id === 'rim_direito') return (
                  <div key={`${scopeKey}:rins`} data-bilateral-group="rins" data-card-size="wide"
                    className="workspace-section-card min-w-0 rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1C1C1E] sm:p-5">
                    <h3 className="mb-3 text-[15px] font-semibold">Rins</h3>
                    <div className="renal-pair-grid grid min-w-0 grid-cols-1 gap-5">
                      {renalPair.map(item => card(item!, true))}
                    </div>
                  </div>
                )
                return card(section)
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SectionCard({
  section,
  size,
  resettable,
  onReset,
  highlighted,
  children,
  embedded = false,
}: {
  section: WorkspaceSection
  size: SectionCardSize
  resettable: boolean
  onReset: () => void
  highlighted: boolean
  children: ReactNode
  embedded?: boolean
}) {
  const headingId = `section-card-title-${section.id}`
  return (
    <section
      aria-labelledby={headingId}
      data-organ-card={section.id}
      data-section-id={section.id}
      data-section-group={section.group}
      data-card-size={size}
      data-card-kind={section.module && !section.id.startsWith('calc:') ? 'organ' : 'panel'}
      className={`${embedded ? "min-w-0" : "workspace-section-card min-w-0 rounded-[22px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-20px_rgba(15,23,42,0.22)] transition-[border-color,box-shadow] duration-300 dark:bg-[#1C1C1E] dark:shadow-none sm:p-5"} ${
        highlighted
          ? 'border-emerald-300 ring-2 ring-emerald-100 dark:border-emerald-700 dark:ring-emerald-900/40'
          : 'border-black/[0.06] dark:border-white/[0.08]'
      }`}
    >
      <header className="mb-3.5 flex items-start justify-between gap-3">
        <h3 id={headingId} className="min-w-0 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-gray-900 dark:text-gray-50">
          {section.label}
        </h3>
        {resettable ? (
          <button
            type="button"
            onClick={onReset}
            aria-label={`Reset ${section.label}`}
            title="Voltar esta seção ao padrão"
            className="-mr-1.5 -mt-0.5 inline-flex min-h-8 flex-shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
            Reset
          </button>
        ) : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/**
 * OPÇÕES DO EXAME — os controles de categoria (via, menopausa, trimestre,
 * segmento…) que antes viviam no topo da sub-nav. Mesma semântica do bloco
 * antigo: `segmented` grava um valor, `checklist` alterna itens.
 */
export function ExamOptionsBar({
  controls,
  opts,
  onOpts,
  children,
}: {
  controls: Field[]
  opts: OrganState
  onOpts: (key: string, value: string | string[]) => void
  children?: ReactNode
}) {
  if (!controls.length && !children) return null
  const toggle = (key: string, value: string) => {
    const current = Array.isArray(opts[key]) ? (opts[key] as string[]) : []
    onOpts(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }
  return (
    <div
      data-exam-options
      className="flex flex-wrap items-start gap-x-6 gap-y-3 rounded-[22px] border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-[#1C1C1E] sm:px-5"
    >
      {controls.map((field) => {
        const multiple = field.kind === 'checklist'
        const selected = multiple
          ? (Array.isArray(opts[field.key]) ? (opts[field.key] as string[]) : [])
          : [(opts[field.key] as string) ?? (field.options ?? []).find((option) => option.isDefault)?.value ?? '']
        return (
          <div key={field.key} role="group" aria-label={field.label} className="min-w-0">
            <div className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">{field.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {(field.options ?? []).map((option) => {
                const active = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => (multiple ? toggle(field.key, option.value) : onOpts(field.key, option.value))}
                    className={`min-h-8 rounded-full px-3 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {children}
    </div>
  )
}
