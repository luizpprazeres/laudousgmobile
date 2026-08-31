'use client'

import type { ExamCategory, ExamSection, ExamState, Field, OrganState } from '@/lib/deterministic'

type NavSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

type Props = {
  sections: NavSection[]
  activeId: string
  onSelect: (id: string) => void
  examState?: ExamState
  category: Pick<ExamCategory, 'name'>
  completedIds?: Set<string>
  /** Controles de categoria (via, menopausa…) renderizados acima dos órgãos. */
  controls?: Field[]
  opts?: OrganState
  onOpts?: (key: string, value: string | string[]) => void
  workspaceV2?: boolean
  contentGroupLabel?: string
}

function ControlsBlock({ controls, opts, onOpts }: { controls: Field[]; opts: OrganState; onOpts: (k: string, v: string | string[]) => void }) {
  const toggle = (key: string, value: string) => {
    const cur = Array.isArray(opts[key]) ? (opts[key] as string[]) : []
    onOpts(key, cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value])
  }
  return (
    <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Opções</div>
      <div className="space-y-3">
        {controls.map((f) => (
          <div key={f.key}>
            <div className="mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">{f.label}</div>
            {f.kind === 'checklist' ? (
              <div className="flex flex-wrap gap-1">
                {(f.options ?? []).map((o) => {
                  const active = (Array.isArray(opts[f.key]) ? (opts[f.key] as string[]) : []).includes(o.value)
                  return (
                    <button key={o.value} type="button" onClick={() => toggle(f.key, o.value)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${active ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'}`}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(f.options ?? []).map((o) => {
                  const current = (opts[f.key] as string) ?? (f.options ?? []).find((x) => x.isDefault)?.value
                  const active = current === o.value
                  return (
                    <button key={o.value} type="button" onClick={() => onOpts(f.key, o.value)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${active ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'}`}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const GROUP_LABELS: Record<NavSection['group'], string> = {
  cabecalho: 'Cabeçalho',
  orgaos: 'Órgãos',
  conclusao: 'Conclusão',
  calculos: 'Cálculos',
}

function sectionDone(section: NavSection, examState?: ExamState, completedIds?: Set<string>) {
  if (completedIds) return completedIds.has(section.id)
  if (section.normalBody) return true
  if (!section.module) return false
  if (!examState) return false
  return JSON.stringify(examState[section.id] ?? {}) !== JSON.stringify(section.module.initialState())
}

export function ExamSectionNav({ sections, activeId, onSelect, examState, completedIds, controls, opts, onOpts, workspaceV2 = false, contentGroupLabel }: Props) {
  const groups: NavSection['group'][] = ['cabecalho', 'orgaos', 'conclusao', 'calculos']
  return (
    <aside className={workspaceV2
      ? 'flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]'
      : 'flex h-full w-[196px] flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'}>
      {controls && controls.length && opts && onOpts ? (
        <ControlsBlock controls={controls} opts={opts} onOpts={onOpts} />
      ) : null}
      <nav className={`min-h-0 flex-1 overflow-y-auto ${workspaceV2 ? 'px-2 py-3' : 'py-4'}`}>
        {groups.map((group) => {
          const groupSections = sections.filter((section) => section.group === group)
          if (!groupSections.length) return null
          return (
            <div key={group} className={workspaceV2 ? 'mb-3' : 'mb-5'}>
              <div className={`${workspaceV2 ? 'px-2' : 'px-5'} pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400`}>
                {group === 'orgaos' && contentGroupLabel ? contentGroupLabel : GROUP_LABELS[group]}
              </div>
              <div className="space-y-1">
                {groupSections.map((section) => {
                  const active = section.id === activeId
                  const done = sectionDone(section, examState, completedIds)
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onSelect(section.id)}
                      className={`flex w-full items-center gap-2 text-left text-sm transition ${workspaceV2 ? 'rounded-xl border px-2.5 py-2' : 'border-l-4 px-4 py-2.5'} ${
                        active
                          ? workspaceV2
                            ? 'border-emerald-200 bg-emerald-50 font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                            : 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : workspaceV2
                            ? 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800'
                            : 'border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={workspaceV2 ? 'min-w-0 flex-1 leading-tight' : 'flex-1 truncate'}>{section.label}</span>
                      {done ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

    </aside>
  )
}
