'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, ChevronDown, Image, Mic, RotateCcw, Sparkles } from 'lucide-react'
import {
  abdomeTotal,
  appendInitials,
  composeReport,
  composeTireoide,
  initialExamState,
  initialTireoideState,
  tireoideSections,
  type ExamSection,
  type ExamState,
  type TireoideState,
} from '@/lib/deterministic'
import { ExamSectionNav } from './ExamSectionNav'
import { LaudarRail } from './LaudarRail'
import { LaudoPreview } from './LaudoPreview'
import { OrganFormPanel } from './OrganFormPanel'
import { TireoideFormPanel } from './TireoideFormPanel'

type CategoriaLaudar = 'ABDOMEN_TOTAL' | 'TIREOIDE'
type UiSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

const TIREOIDE_CATEGORY = {
  id: 'TIREOIDE',
  name: 'Tireoide',
}

function ToolbarPill({
  children,
  tone = 'neutral',
  onClick,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'category' | 'purple' | 'primary' | 'toggleOn'
  onClick?: () => void
}) {
  const styles = {
    neutral: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
    category: 'border-rose-200 bg-rose-50 font-bold text-rose-500',
    purple: 'border-violet-200 bg-violet-50 font-bold text-violet-600',
    primary: 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700',
    toggleOn: 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition ${styles[tone]}`}
    >
      {children}
    </button>
  )
}

function sectionIndex(sections: UiSection[], id: string) {
  return Math.max(0, sections.findIndex((section) => section.id === id))
}

function hasLoboData(lobo: TireoideState['lobo_direito']) {
  return Boolean(lobo.a || lobo.b || lobo.c || lobo.ecotextura !== 'normal')
}

function completedTireoideSections(state: TireoideState) {
  const completed = new Set<string>()
  if (hasLoboData(state.lobo_direito) || state.picoDireito) completed.add('lobo_direito')
  if (hasLoboData(state.lobo_esquerdo) || state.picoEsquerdo) completed.add('lobo_esquerdo')
  if (hasLoboData(state.istmo)) completed.add('istmo')
  if (state.nodulos.length > 0) completed.add('nodulos')
  if (state.linfonodos !== 'preservados') completed.add('linfonodos')
  return completed
}

export function LaudarWebExperience() {
  const [categoria, setCategoria] = useState<CategoriaLaudar>('ABDOMEN_TOTAL')
  const [examState, setExamState] = useState<ExamState>(() => initialExamState(abdomeTotal))
  const [tireoideState, setTireoideState] = useState<TireoideState>(() => initialTireoideState())
  const [activeAbdomeSectionId, setActiveAbdomeSectionId] = useState('vesicula')
  const [activeTireoideSectionId, setActiveTireoideSectionId] = useState('lobo_direito')
  const [initialsOn, setInitialsOn] = useState(true)
  const initials = 'ha'

  const isTireoide = categoria === 'TIREOIDE'
  const sections: UiSection[] = isTireoide ? tireoideSections : abdomeTotal.sections
  const activeSectionId = isTireoide ? activeTireoideSectionId : activeAbdomeSectionId
  const setActiveSectionId = isTireoide ? setActiveTireoideSectionId : setActiveAbdomeSectionId
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]
  const currentCategory = isTireoide ? TIREOIDE_CATEGORY : abdomeTotal
  const tireoideCompleted = useMemo(() => completedTireoideSections(tireoideState), [tireoideState])

  const composedText = useMemo(() => {
    if (isTireoide) return composeTireoide(tireoideState).text
    return composeReport(abdomeTotal, examState).text
  }, [examState, isTireoide, tireoideState])
  const preview = useMemo(() => appendInitials(composedText, initialsOn ? initials : undefined), [composedText, initialsOn])

  const currentIndex = sectionIndex(sections, activeSection.id)
  const previous = sections[Math.max(0, currentIndex - 1)]
  const next = sections[Math.min(sections.length - 1, currentIndex + 1)]

  const changeCategory = (nextCategory: CategoriaLaudar) => {
    setCategoria(nextCategory)
    if (nextCategory === 'ABDOMEN_TOTAL') setActiveAbdomeSectionId((value) => value || 'vesicula')
    if (nextCategory === 'TIREOIDE') setActiveTireoideSectionId((value) => value || 'lobo_direito')
  }

  const resetActive = () => {
    if (isTireoide) {
      if (activeSection.id === 'nodulos') {
        setTireoideState((state) => ({ ...state, nodulos: [] }))
        return
      }
      if (activeSection.id === 'linfonodos') {
        setTireoideState((state) => ({ ...state, linfonodos: 'preservados' }))
        return
      }
      if (activeSection.id === 'lobo_direito' || activeSection.id === 'lobo_esquerdo' || activeSection.id === 'istmo') {
        const empty = { a: '', b: '', c: '', ecotextura: 'normal' as const }
        setTireoideState((state) => ({
          ...state,
          [activeSection.id]: empty,
          ...(activeSection.id === 'lobo_direito' ? { picoDireito: '' } : {}),
          ...(activeSection.id === 'lobo_esquerdo' ? { picoEsquerdo: '' } : {}),
        }))
      }
      return
    }

    if (!activeSection.module) return
    setExamState((state) => ({ ...state, [activeSection.id]: activeSection.module!.initialState() }))
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gray-100 text-gray-900">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/70 px-5 backdrop-blur-xl">
        <div className="flex items-end gap-0.5 font-barlow text-[22px] leading-none tracking-tight">
          <span className="font-extrabold text-emerald-700">Laudo</span>
          <span className="font-normal text-emerald-600">USG</span>
          <span className="mb-1 ml-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <span className="font-barlow text-base font-medium text-gray-400">Web</span>

        <label className="relative inline-flex h-10 items-center rounded-full border border-rose-200 bg-rose-50 px-4 pr-9 text-sm font-bold text-rose-500">
          <select
            value={categoria}
            onChange={(event) => changeCategory(event.target.value as CategoriaLaudar)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Selecionar categoria"
          >
            <option value="ABDOMEN_TOTAL">Abdome Total</option>
            <option value="TIREOIDE">Tireoide</option>
          </select>
          {currentCategory.name}
          <ChevronDown className="absolute right-3 h-4 w-4" />
        </label>

        {isTireoide ? (
          <ToolbarPill
            tone={tireoideState.doppler ? 'toggleOn' : 'neutral'}
            onClick={() => setTireoideState((state) => ({ ...state, doppler: !state.doppler }))}
          >
            Doppler
          </ToolbarPill>
        ) : null}

        <ToolbarPill><Calculator className="h-4 w-4" />Cálculos</ToolbarPill>
        <ToolbarPill><Mic className="h-4 w-4" />Ditar</ToolbarPill>
        <ToolbarPill><Image className="h-4 w-4" />Imagem</ToolbarPill>
        <ToolbarPill tone="purple">Múltiplos</ToolbarPill>
        <div className="flex-1" />
        <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-white/80 py-1 pl-1 pr-4 shadow-sm md:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 text-xs font-bold text-white">HA</span>
          <span className="text-sm font-semibold text-gray-700">Helena Almeida <span className="font-normal text-gray-400">· auxiliar</span></span>
        </div>
        <ToolbarPill tone="primary"><Sparkles className="h-4 w-4" />Gerar com IA</ToolbarPill>
      </header>

      <main className="relative h-[calc(100vh-64px)]">
        <LaudarRail />
        <div className="ml-16 grid h-full grid-cols-[220px_minmax(420px,1fr)_minmax(460px,1fr)]">
          <ExamSectionNav
            sections={sections}
            activeId={activeSection.id}
            onSelect={setActiveSectionId}
            examState={isTireoide ? undefined : examState}
            completedIds={isTireoide ? tireoideCompleted : undefined}
            category={currentCategory}
          />

          <section className="min-h-0 overflow-y-auto bg-gray-50">
            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{currentCategory.name}</div>
              <div className="mt-1.5 flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-barlow text-[26px] font-bold leading-tight tracking-tight text-gray-950">{activeSection.label}</h1>
                  <p className="mt-0.5 text-[13px] text-gray-500">
                    {isTireoide
                      ? 'Preencha medidas, nódulos e classificações informadas pelo médico.'
                      : 'Tudo pré-marcado como normal. Mude só o que estiver alterado.'}
                  </p>
                </div>
                <button type="button" onClick={resetActive} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 shadow-sm hover:bg-gray-50">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Frases prontas', 'Inserir medida', 'Carregar modelo'].map((label) => (
                  <button key={label} type="button" className="rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 shadow-sm hover:bg-gray-50">{label}</button>
                ))}
              </div>
            </div>

            <div className="px-6 py-5">
              {isTireoide ? (
                <TireoideFormPanel
                  section={activeSection.id}
                  state={tireoideState}
                  onChange={setTireoideState}
                />
              ) : activeSection.module ? (
                <OrganFormPanel
                  schema={activeSection.module.schema}
                  state={examState[activeSection.id] ?? activeSection.module.initialState()}
                  onChange={(nextState) => setExamState((state) => ({ ...state, [activeSection.id]: nextState }))}
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="font-barlow text-xl font-bold text-gray-900">Seção de texto padrão</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">Este trecho entra automaticamente no laudo normal. Em breve fica interativo como a vesícula.</p>
                  {activeSection.normalBody ? <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">{activeSection.normalBody}</p> : null}
                </div>
              )}
            </div>

            <footer className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-white/90 px-7 py-4 backdrop-blur-xl">
              <span className="text-xs text-gray-400">Atalhos</span>
              <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-500">⌘K</kbd>
              <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-500">Tab</kbd>
              <div className="flex-1" />
              <button type="button" onClick={() => setActiveSectionId(previous.id)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40" disabled={previous.id === activeSection.id}>
                <ArrowLeft className="h-4 w-4" /> anterior
              </button>
              <button type="button" onClick={() => setActiveSectionId(next.id)} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" disabled={next.id === activeSection.id}>
                próxima <ArrowRight className="h-4 w-4" />
              </button>
            </footer>
          </section>

          <LaudoPreview
            text={preview}
            initialsOn={initialsOn}
            onToggleInitials={() => setInitialsOn((value) => !value)}
            initials={initials}
          />
        </div>
      </main>
    </div>
  )
}
