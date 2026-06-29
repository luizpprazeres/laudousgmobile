'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, ChevronDown, Image, Mic, RotateCcw, Sparkles } from 'lucide-react'
import {
  CATEGORIES,
  GENERIC_CATEGORIES,
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
import { tiRadsSpec } from '@/lib/calculators/specs'
import { CalcPanel } from './CalcPanel'
import { ExamSectionNav } from './ExamSectionNav'
import { LaudarRail } from './LaudarRail'
import { LaudoPreview } from './LaudoPreview'
import { saveWebReport } from '@/lib/webReports'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
import { OrganFormPanel } from './OrganFormPanel'
import { TireoideFormPanel } from './TireoideFormPanel'

const TIREOIDE_ID = 'TIREOIDE'
type UiSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

const TIREOIDE_CATEGORY = {
  id: TIREOIDE_ID,
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
    neutral: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
    category: 'border-rose-200 bg-rose-50 font-bold text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300',
    purple: 'border-violet-200 bg-violet-50 font-bold text-violet-600 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300',
    primary: 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-500',
    toggleOn: 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-500',
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
  const [categoria, setCategoria] = useState<string>(GENERIC_CATEGORIES[0]?.id ?? 'ABDOMEN_TOTAL')
  // Um ExamState por categoria genérica (preserva o preenchimento ao alternar).
  const [examStates, setExamStates] = useState<Record<string, ExamState>>(() =>
    Object.fromEntries(GENERIC_CATEGORIES.map((c) => [c.id, initialExamState(c)]))
  )
  const [tireoideState, setTireoideState] = useState<TireoideState>(() => initialTireoideState())
  // Seção ativa por categoria.
  const [activeByCat, setActiveByCat] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(GENERIC_CATEGORIES.map((c) => [c.id, c.sections[0]?.id ?? ''])),
    [TIREOIDE_ID]: 'lobo_direito',
  }))
  const [initialsOn, setInitialsOn] = useState(true)
  // Iniciais configuráveis nas Preferências (localStorage 'laudousg.initials').
  const [initials, setInitials] = useState('ha')
  useEffect(() => {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem('laudousg.initials') : null
    if (v) setInitials(v)
  }, [])

  const isTireoide = categoria === TIREOIDE_ID
  const genericCategory = isTireoide ? null : CATEGORIES[categoria]
  // Controles de categoria (estado reservado em '__opts') — lido antes das seções
  // porque o MSK filtra as estruturas pelo segmento selecionado (resolveSections).
  const opts = (examStates[categoria]?.['__opts'] as ExamState[string] | undefined) ?? {}
  const baseSections: UiSection[] = isTireoide
    ? tireoideSections
    : genericCategory?.resolveSections?.(opts) ?? genericCategory?.sections ?? []
  // Calculadoras pertinentes → seção "Cálculos".
  const calculators = isTireoide ? [tiRadsSpec] : genericCategory?.calculators ?? []
  const calcSections: UiSection[] = calculators.map((c) => ({ id: `calc:${c.id}`, label: c.name, group: 'calculos' as const }))
  const sections: UiSection[] = [...baseSections, ...calcSections]
  const activeSectionId = activeByCat[categoria] ?? sections[0]?.id ?? ''
  const setActiveSectionId = (id: string) => setActiveByCat((s) => ({ ...s, [categoria]: id }))
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0]
  const currentCategory = isTireoide ? TIREOIDE_CATEGORY : genericCategory!
  const examState = isTireoide ? undefined : examStates[categoria]
  const tireoideCompleted = useMemo(() => completedTireoideSections(tireoideState), [tireoideState])

  // Controles de categoria (via, menopausa, segmento…).
  const controls = isTireoide ? [] : genericCategory?.controls ?? []
  const onOpts = (key: string, value: string | string[]) =>
    setExamStates((all) => ({
      ...all,
      [categoria]: { ...all[categoria], __opts: { ...((all[categoria]?.['__opts'] as Record<string, string | string[]>) ?? {}), [key]: value } },
    }))

  const composedText = useMemo(() => {
    if (isTireoide) return composeTireoide(tireoideState).text
    const cat = CATEGORIES[categoria]
    return cat ? composeReport(cat, examStates[categoria]).text : ''
  }, [categoria, examStates, isTireoide, tireoideState])
  const preview = useMemo(
    () => appendInitials(composedText, initialsOn ? initials : undefined),
    [composedText, initialsOn]
  )

  // Persistência real (S9) — substitui o status falso. Volta a "idle" quando o
  // laudo muda (o salvo anterior fica desatualizado).
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  useEffect(() => {
    setSaveState('idle')
    setSaveError(null)
  }, [preview])
  const onSave = async () => {
    setSaveState('saving')
    setSaveError(null)
    try {
      await saveWebReport({
        categoryCode: categoria,
        title: currentCategory.name,
        laudoText: preview,
        examState: isTireoide ? tireoideState : examStates[categoria],
      })
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
  }

  const currentIndex = sectionIndex(sections, activeSection?.id ?? '')
  const previous = sections[Math.max(0, currentIndex - 1)]
  const next = sections[Math.min(sections.length - 1, currentIndex + 1)]

  const resetActive = () => {
    if (!activeSection) return
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
    const mod = activeSection.module
    setExamStates((all) => ({
      ...all,
      [categoria]: { ...all[categoria], [activeSection.id]: mod.initialState() },
    }))
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/70 px-5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/70">
        <div className="flex items-end gap-0.5 font-barlow text-[22px] leading-none tracking-tight">
          <span className="font-extrabold text-emerald-700 dark:text-emerald-500">Laudo</span>
          <span className="font-normal text-emerald-600 dark:text-emerald-400">USG</span>
          <span className="mb-1 ml-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
        </div>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
        <span className="font-barlow text-base font-medium text-gray-500 dark:text-gray-400">Web</span>

        <label className="relative inline-flex h-10 items-center rounded-full border border-rose-200 bg-rose-50 px-4 pr-9 text-sm font-bold text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Selecionar categoria"
          >
            {GENERIC_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={TIREOIDE_ID}>Tireoide</option>
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
        <ToolbarPill tone="primary"><Sparkles className="h-4 w-4" />Gerar com IA</ToolbarPill>
      </header>

      <main className="relative h-[calc(100vh-64px)]">
        <LaudarRail />
        <div className="ml-16 grid h-full grid-cols-[196px_minmax(420px,1fr)_minmax(460px,1fr)]">
          <ExamSectionNav
            sections={sections}
            activeId={activeSection?.id ?? ''}
            onSelect={setActiveSectionId}
            examState={isTireoide ? undefined : examState}
            completedIds={isTireoide ? tireoideCompleted : undefined}
            category={currentCategory}
            controls={controls}
            opts={opts}
            onOpts={onOpts}
          />

          <section className="min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {isTireoide
                    ? 'Preencha medidas, nódulos e classificações informadas pelo médico.'
                    : 'Tudo pré-marcado como normal. Mude só o que estiver alterado.'}
                </p>
                <button type="button" onClick={resetActive} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-500 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {activeSection?.id?.startsWith('calc:') ? (
                (() => {
                  const spec = calculators.find((c) => `calc:${c.id}` === activeSection.id)
                  return spec ? <CalcPanel spec={spec} examState={isTireoide ? undefined : examState} /> : null
                })()
              ) : isTireoide ? (
                <TireoideFormPanel
                  section={activeSection?.id ?? ''}
                  state={tireoideState}
                  onChange={setTireoideState}
                />
              ) : activeSection?.module ? (
                <OrganFormPanel
                  schema={activeSection.module.schema}
                  state={examState?.[activeSection.id] ?? activeSection.module.initialState()}
                  onChange={(nextState) =>
                    setExamStates((all) => ({
                      ...all,
                      [categoria]: { ...all[categoria], [activeSection.id]: nextState },
                    }))
                  }
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="font-barlow text-xl font-bold text-gray-900 dark:text-gray-100">Seção de texto padrão</div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">Este trecho entra automaticamente no laudo normal.</p>
                  {activeSection?.normalBody ? <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600 dark:bg-gray-950 dark:text-gray-300">{activeSection.normalBody}</p> : null}
                </div>
              )}
            </div>

            <footer className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-white/90 px-7 py-4 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
              <span className="text-xs text-gray-500 dark:text-gray-400">Atalhos</span>
              <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">⌘K</kbd>
              <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">Tab</kbd>
              <div className="flex-1" />
              <button type="button" onClick={() => previous && setActiveSectionId(previous.id)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" disabled={!previous || previous.id === activeSection?.id}>
                <ArrowLeft className="h-4 w-4" /> anterior
              </button>
              <button type="button" onClick={() => next && setActiveSectionId(next.id)} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900" disabled={!next || next.id === activeSection?.id}>
                próxima <ArrowRight className="h-4 w-4" />
              </button>
            </footer>
          </section>

          <LaudoPreview
            text={preview}
            initialsOn={initialsOn}
            onToggleInitials={() => setInitialsOn((value) => !value)}
            initials={initials}
            saveState={saveState}
            saveError={saveError}
            onSave={onSave}
          />
        </div>
      </main>
    </div>
  )
}
