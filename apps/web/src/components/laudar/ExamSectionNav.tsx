'use client'

import type { ExamCategory, ExamSection, ExamState } from '@/lib/deterministic'

type NavSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

type Props = {
  sections: NavSection[]
  activeId: string
  onSelect: (id: string) => void
  examState?: ExamState
  category: Pick<ExamCategory, 'name'>
  completedIds?: Set<string>
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

export function ExamSectionNav({ sections, activeId, onSelect, examState, category, completedIds }: Props) {
  const groups: NavSection['group'][] = ['cabecalho', 'orgaos', 'conclusao', 'calculos']
  const organSections = sections.filter((section) => section.group === 'orgaos')
  const completed = organSections.filter((section) => sectionDone(section, examState, completedIds)).length
  const progress = organSections.length ? Math.round((completed / organSections.length) * 100) : 0

  return (
    <aside className="flex h-full w-[196px] flex-col border-r border-gray-200 bg-white">
      <nav className="min-h-0 flex-1 overflow-y-auto py-4">
        {groups.map((group) => {
          const groupSections = sections.filter((section) => section.group === group)
          if (!groupSections.length) return null
          return (
            <div key={group} className="mb-5">
              <div className="px-5 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                {GROUP_LABELS[group]}
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
                      className={`flex w-full items-center gap-3 border-l-4 px-4 py-2.5 text-left text-sm transition ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-800'
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex-1 truncate">{section.label}</span>
                      {done ? <span className="text-xs font-bold text-emerald-600">✓</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="m-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="text-sm font-bold text-gray-900">{completed} de {organSections.length} seções</div>
        <div className="mt-1 text-xs leading-relaxed text-gray-500">Defaults cobrem o resto.</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700">salvo há 2s</div>
      </div>
    </aside>
  )
}
