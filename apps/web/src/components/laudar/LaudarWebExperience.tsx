'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ScanLine, Smartphone } from 'lucide-react'
import {
  CATEGORIES,
  GENERIC_CATEGORIES,
  appendInitials,
  composeReport,
  initialExamState,
  initialTireoideState,
  tireoideSections,
  type ExamSection,
  type ExamState,
  type OrganState,
  type TireoideState,
} from '@/lib/deterministic'
import { adaptarTireoide } from '@/lib/catalog/tireoideParaCatalogo'
import { adaptarPelve } from '@/lib/catalog/pelveParaCatalogo'
import { adaptarMamaria } from '@/lib/catalog/mamariaParaCatalogo'
import { adaptarObstetrica } from '@/lib/catalog/obstetricaParaCatalogo'
import { adaptarMorfologico } from '@/lib/catalog/morfologicoParaCatalogo'
import { adaptarDopplerWeb, categoriaRenderDoppler, chaveDocumentoDoppler, estadoDopplerVisivel, somenteDoppler } from '@/lib/catalog/dopplerWebMode'
import { adaptarDopplerCarotidas } from '@/lib/catalog/dopplerCarotidasParaCatalogo'
import { adaptarAbdome } from '@/lib/catalog/abdomeParaCatalogo'
import { adaptarAbdomeSuperior } from '@/lib/catalog/abdomeSuperiorParaCatalogo'
import { adaptarViasUrinarias } from '@/lib/catalog/viasUrinariasParaCatalogo'
import { adaptarProstataSuprapubica } from '@/lib/catalog/prostataParaCatalogo'
import { adaptarCervical } from '@/lib/catalog/cervicalParaCatalogo'
import { adaptarCervicometria } from '@/lib/catalog/cervicometriaParaCatalogo'
import { adaptarPartesMoles } from '@/lib/catalog/partesMolesParaCatalogo'
import { adaptarMusculoesqueletico } from '@/lib/catalog/musculoesqueleticoParaCatalogo'
import { migrateLegacyMskState } from '@/lib/deterministic/organs/musculoesqueletico'
import { categoriaMigrada } from '@/lib/catalog/migradas'
import { useLaudoCanonico } from '@/lib/catalog/useLaudoCanonico'
import { tiRadsSpec } from '@/lib/calculators/specs'
import { LiverQuantificationPanel } from './LiverQuantificationPanel'
import { buildLiverQuantificationBlock } from '@/lib/deterministic/liverQuantification'
import { RecommendationsPanel } from './RecommendationsPanel'
import { CalcPanel } from './CalcPanel'
import { PreEclampsiaFmfPanel } from './PreEclampsiaFmfPanel'
import { TrisomyFmfPanel } from './TrisomyFmfPanel'
import { ExamOptionsBar, WorkspaceSectionGrid, type SectionCardSize, type WorkspaceSection } from './WorkspaceSectionGrid'
import { LaudarRail } from './LaudarRail'
import { lerAtual, lerDigitadoras, gravarAtual, type Digitadora } from '@/lib/digitadoras'
import { LaudoPreview } from './LaudoPreview'
import { saveWebReport } from '@/lib/webReports'
import { categoryCompactName, categoryContentGroupLabel, categoryDotClass } from './categoryPresentation'
import { WorkspaceInputDock } from './WorkspaceInputDock'
import { CompanionPanel } from './CompanionPanel'
import { diffReportBlocks } from './reportSuggestion'
import {
  appendInitialsToReportHtml,
  attachReportPresentation,
  mergeReportHtml,
  textToReportHtml,
} from './reportRichText'
import { applyCompanionBreast, applyCompanionCarotids, applyCompanionStructured, applyCompanionThyroid, type CompanionStructuredPayload } from '@/lib/companionStructured'
import { companionReenviaPercentil, invalidarPercentilManual } from './fetalGrowthContext'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
import { OrganFormPanel } from './OrganFormPanel'
import { TireoideCompanionNotice, TireoideFormPanel } from './TireoideFormPanel'
import { MamariaBiradsPanel } from './MamariaBiradsPanel'
import { MamariaFormPanel } from './MamariaFormPanel'
import { DopplerCarotidasFormPanel } from './DopplerCarotidasFormPanel'
import { BiometryGrowthPanel } from './BiometryGrowthPanel'
import {
  BIOMETRY_GROWTH_SECTION_ID,
  BIOMETRY_SECTION_ID,
  GROWTH_SECTION_ID,
  agruparBiometriaCrescimento,
  resolverSecaoAtivaAgrupada,
} from './biometryGrowthSections'
import { VisualSchemaPanel } from '@/components/visualSchemas/VisualSchemaPanel'
import { supportsFetalPositionSchema } from '@/lib/visualSchemas/fetalPosition'
import { ExamCategoryPicker } from './ExamCategoryPicker'
import { AssociationPanel, nameOf } from './AssociationPanel'
import {
  associationByCode,
  hiddenSharedSections,
  removeComponent,
  startAssociation,
  updateComponentState,
  type AssociationDefinition,
  type CompositionComponentRef,
  type CompositionSession,
} from '@/lib/composition/associations'
import type { CompositionCategoryCode } from '@/lib/composition/contract'
import { useComposicaoCanonica } from '@/lib/composition/useComposicaoCanonica'
import { buildEnvelope, parseEnvelope, savedTextOf } from '@/lib/composition/envelope'
import { loadCompositionReport, saveCompositionReport, updateCompositionReport } from '@/lib/webReports'
import type { CalcSpec } from '@/lib/calculators/specs'

const TIREOIDE_ID = 'TIREOIDE'
type UiSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

const TIREOIDE_CATEGORY = {
  id: TIREOIDE_ID,
  name: 'Tireoide',
}

const TIREOIDE_RESETAVEIS = new Set(['lobo_direito', 'lobo_esquerdo', 'istmo', 'nodulos', 'linfonodos'])
/** Painéis que já são grades próprias ocupam a linha inteira da grade de cards. */
const FULL_WIDTH_SECTIONS = new Set([BIOMETRY_GROWTH_SECTION_ID, 'nodulos', 'mamas'])

type LaudarWebExperienceProps = {
  workspaceV2?: boolean
  richEditor?: boolean
  agentWorkspace?: boolean
  /** `web_reports.id` de uma composição salva para reabrir e editar. */
  reopenReportId?: string
}

/**
 * O ESCOPO de um grupo de cards: a categoria, o estado que o alimenta e como
 * gravá-lo. No exame avulso é a categoria aberta; numa associação, cada
 * componente é um escopo próprio — o estado de um nunca é escrito no outro.
 */
type SectionScope = {
  key: string
  categoria: string
  state: ExamState
  update: (fn: (state: ExamState) => ExamState) => void
  calculators: CalcSpec[]
}

const LIVER_SECTION = { id: 'liver-quantification', label: 'Elastografia e gordura hepática', group: 'calculos' as const }
const RECOMMENDATIONS_SECTION = { id: 'recommendations', label: 'Recomendações', group: 'conclusao' as const }

function calculatorsFor(categoria: string, opts: Record<string, unknown>): CalcSpec[] {
  const category = CATEGORIES[categoria]
  const axilas = categoria === 'MAMARIA' && opts.escopo_exame === 'axilas'
  return (category?.resolveCalculators?.(opts as never) ?? category?.calculators ?? [])
    .filter((spec) => !(axilas && spec.id === 'bi-rads'))
}

function compositionKey(compositionId: string) {
  return `COMP:${compositionId}`
}

type WorkspacePane = 'achados' | 'laudo'

type ReportDraft = {
  text: string
  html: string
  sourceText: string
  sourceHtml: string
  dirty: boolean
}

type UndoSnapshot = {
  previousText: string
  previousHtml: string
  appliedText: string
  appliedHtml: string
}

function categoryVisualName(categoryId: string, fallback: string) {
  return categoryId === 'DOPPLER_OBSTETRICO' ? 'Obstétrica com Doppler' : fallback
}

function CategorySelector({
  categoria,
  currentName,
  compact,
  onChange,
}: {
  categoria: string
  currentName: string
  compact: boolean
  onChange: (categoryId: string) => void
}) {
  return (
    <label
      data-category-selector
      className={
        compact
          ? 'relative inline-flex h-8 min-w-[210px] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 pr-8 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
          : 'relative inline-flex h-10 items-center rounded-full border border-rose-200 bg-rose-50 px-4 pr-9 text-sm font-bold text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
      }
    >
      <select
        value={categoria}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Selecionar categoria"
      >
        {GENERIC_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {categoryVisualName(category.id, category.name)}
          </option>
        ))}
        <option value={TIREOIDE_ID}>Tireoide</option>
      </select>
      {compact ? <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${categoryDotClass(categoria)}`} /> : null}
      <span className="truncate">{categoryVisualName(categoria, compact ? categoryCompactName(categoria, currentName) : currentName)}</span>
      <ChevronDown className={`absolute right-3 ${compact ? 'h-3.5 w-3.5 text-gray-400' : 'h-4 w-4'}`} />
    </label>
  )
}

function ToolbarPill({
  children,
  tone = 'neutral',
  pressed,
  onClick,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'toggleOn'
  pressed?: boolean
  onClick?: () => void
}) {
  const styles = {
    neutral: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
    toggleOn: 'border-emerald-600 bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-500',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${styles[tone]}`}
    >
      {children}
    </button>
  )
}

function WorkspaceTabs({
  active,
  onChange,
  laudoState,
	}: {
	  active: WorkspacePane
	  onChange: (pane: WorkspacePane) => void
	  laudoState: 'idle' | 'updating' | 'suggestion' | 'dirty' | 'error'
	}) {
  const tabs: Array<{ id: WorkspacePane; label: string }> = [
    { id: 'achados', label: 'Achados' },
    { id: 'laudo', label: 'Laudo' },
  ]
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const select = (index: number) => {
    const tab = tabs[index]
    if (!tab) return
    onChange(tab.id)
    refs.current[index]?.focus()
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((tab) => tab.id === active)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      select((current + 1) % tabs.length)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      select((current - 1 + tabs.length) % tabs.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      select(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      select(tabs.length - 1)
    }
  }
	  const indicatorClass = {
	    idle: '',
	    updating: 'bg-amber-400',
	    suggestion: 'bg-sky-500',
	    dirty: 'bg-violet-500',
	    error: 'bg-red-500',
	  }[laudoState]
	  const indicatorLabel = {
	    idle: '',
	    updating: 'Laudo atualizando',
	    suggestion: 'Laudo com sugestão dos campos atuais',
	    dirty: 'Laudo editado manualmente',
	    error: 'Erro no laudo',
	  }[laudoState]

  return (
    <div
      role="tablist"
      aria-label="Alternar área de trabalho"
      onKeyDown={onKeyDown}
	      className="inline-grid min-h-11 min-w-[224px] grid-cols-2 rounded-full border border-gray-200 bg-gray-100 p-1 shadow-inner dark:border-gray-700 dark:bg-gray-900"
    >
      {tabs.map((tab, index) => {
        const selected = active === tab.id
        const showIndicator = tab.id === 'laudo' && laudoState !== 'idle'
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[index] = node }}
            type="button"
            role="tab"
            id={`workspace-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`workspace-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
	            className={`relative inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-900 ${
              selected
                ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-100 dark:text-gray-950'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            <span>{tab.label}</span>
            {showIndicator ? (
              <>
                <span
                  data-laudo-tab-indicator={laudoState}
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${indicatorClass}`}
                />
                <span className="sr-only">{indicatorLabel}</span>
              </>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function LaudarWebExperience({ workspaceV2 = false, richEditor = false, agentWorkspace = false, reopenReportId }: LaudarWebExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [choosingCategory, setChoosingCategory] = useState(true)
  const [activePane, setActivePane] = useState<WorkspacePane>('achados')
  const [categoria, setCategoria] = useState<string>(GENERIC_CATEGORIES[0]?.id ?? 'ABDOMEN_TOTAL')
  const activePaneRef = useRef<WorkspacePane>('achados')
  const restoringScrollRef = useRef(false)
  const scrollYByPaneRef = useRef<Record<WorkspacePane, number>>({ achados: 0, laudo: 0 })
  const selectPane = useCallback((pane: WorkspacePane) => {
    if (typeof window !== 'undefined') {
      scrollYByPaneRef.current[activePaneRef.current] = window.scrollY
    }
    if (pane !== activePaneRef.current) setActivePane(pane)
  }, [])
  const selectCategory = useCallback((nextCategory: string) => {
    if (nextCategory !== categoria) {
      selectPane('achados')
      // A nova categoria começa pelo primeiro card; alternar apenas a aba
      // continua restaurando a posição de leitura dentro do mesmo exame.
      scrollYByPaneRef.current = { achados: 0, laudo: 0 }
    }
    setCategoria(nextCategory)
  }, [categoria, selectPane])

  useLayoutEffect(() => {
    activePaneRef.current = activePane
  }, [activePane])

  useEffect(() => {
    const saveScroll = () => {
      if (restoringScrollRef.current) return
      scrollYByPaneRef.current[activePaneRef.current] = window.scrollY
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => window.removeEventListener('scroll', saveScroll)
  }, [])

  useLayoutEffect(() => {
    if (choosingCategory || typeof window === 'undefined') return
    restoringScrollRef.current = true
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYByPaneRef.current[activePane] ?? 0, left: 0, behavior: 'auto' })
      restoringScrollRef.current = false
    })
    return () => {
      window.cancelAnimationFrame(frame)
      restoringScrollRef.current = false
    }
  }, [activePane, choosingCategory, categoria])

  // A altura do header (que agora carrega as abas) alimenta o sticky, o
  // scroll-margin dos cards e a altura do painel do laudo.
  useLayoutEffect(() => {
    const root = rootRef.current
    const header = headerRef.current
    if (!root || !header) return

    const update = () => {
      root.style.setProperty('--laudar-header-height', `${header.offsetHeight}px`)
    }
    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }

    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [choosingCategory, workspaceV2])

  // Um ExamState por categoria genérica (preserva o preenchimento ao alternar).
  const [examStates, setExamStates] = useState<Record<string, ExamState>>(() =>
    Object.fromEntries(GENERIC_CATEGORIES.map((c) => [c.id, initialExamState(c)]))
  )
  const [tireoideState, setTireoideState] = useState<TireoideState>(() => initialTireoideState())
  /**
   * A ASSOCIAÇÃO em curso (Abdome + Próstata, Mamas + Pelve). Enquanto existe,
   * os estados dos componentes moram nela — não em `examStates` — e o laudo
   * vem do endpoint de composição, não do render de uma categoria só.
   */
  const [composition, setComposition] = useState<CompositionSession | null>(null)
  /** A linha salva desta composição, para regravar a mesma e não duplicar. */
  const [savedComposition, setSavedComposition] = useState<{ compositionId: string; id: string; updatedAt: string } | null>(null)
  const [compositionBaseRevision, setCompositionBaseRevision] = useState(0)
  const [reopenState, setReopenState] = useState<{ status: 'idle' | 'loading' | 'error'; message?: string }>(
    () => (reopenReportId ? { status: 'loading' } : { status: 'idle' }),
  )
  const [visualSchemaOpen, setVisualSchemaOpen] = useState(true)
  /**
   * Sem sub-nav, não há mais "seção ativa". O que sobra dela é o pedido de
   * REVELAR um card — quando o celular preenche uma seção, a grade rola até
   * ela e a destaca por um instante.
   */
  const [revealRequest, setRevealRequest] = useState<{ category: string; id: string; nonce: number } | null>(null)
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null)
  const revealSection = useCallback((category: string, id: string) => {
    setRevealRequest({ category, id, nonce: Date.now() })
  }, [])
  /**
   * A DIGITADORA escolhida. Cadastro em Preferências, escolha na barra do topo.
   *
   * Antes eram duas coisas separadas — um valor de iniciais nas Preferências e
   * um botão de liga-desliga no rodapé do preview. Quem trabalha com mais de
   * uma auxiliar reeditava o campo a cada troca, e o controle ficava no fim do
   * texto pronto, depois da decisão. Agora a escolha é uma só e acontece antes.
   *
   * Vazio = nenhuma, e o laudo sai sem iniciais. É o estado de quem digitou o
   * próprio laudo.
   */
  const [digitadoras, setDigitadoras] = useState<Digitadora[]>([])
  const [initials, setInitials] = useState('')
  useEffect(() => {
    setDigitadoras(lerDigitadoras())
    setInitials(lerAtual())
  }, [])

  const isTireoide = categoria === TIREOIDE_ID
  const genericCategory = isTireoide ? null : CATEGORIES[categoria]
  // Controles de categoria (estado reservado em '__opts') — lido antes das seções
  // porque o MSK filtra as estruturas pelo segmento selecionado (resolveSections).
  const opts = (examStates[categoria]?.['__opts'] as ExamState[string] | undefined) ?? {}
  const axilasOnly = categoria === 'MAMARIA' && opts.escopo_exame === 'axilas'
  const documentKey = composition
    ? compositionKey(composition.compositionId)
    : chaveDocumentoDoppler(categoria, examStates[categoria] ?? {})
  const supportsFetalSchema = supportsFetalPositionSchema(categoria, opts.trimestre)
  // O esquema visual edita o estado avulso da categoria; numa associação ele
  // escreveria fora do componente, então fica fora até ter escopo próprio.
  const supportsVisualSchema = !composition && (isTireoide || (categoria === 'MAMARIA' && !axilasOnly) || supportsFetalSchema)
  const categorySections: UiSection[] = isTireoide
    ? tireoideSections
    : genericCategory?.resolveSections?.(opts) ?? genericCategory?.sections ?? []
  /**
   * Biometria e crescimento fetal dividem um painel só — agrupamento de
   * apresentação, com os dois módulos intactos no estado. Doppler isolado e
   * morfológico de 1º trimestre não têm os dois módulos e seguem sem alteração.
   */
  const biometryGrowth = agruparBiometriaCrescimento(isTireoide ? TIREOIDE_ID : categoria, categorySections)
  const baseSections: UiSection[] = biometryGrowth.sections
  // Calculadoras pertinentes → seção "Cálculos".
  const calculators = (isTireoide
    ? [tiRadsSpec]
    : genericCategory?.resolveCalculators?.(opts) ?? genericCategory?.calculators ?? [])
    .filter(spec => !(axilasOnly && spec.id === 'bi-rads'))
  const trisomyInitialValues = useMemo(() => {
    if (categoria !== 'MORFOLOGICO' || opts.trimestre !== '1t') return undefined
    const first = examStates[categoria]?.primeiro_trimestre ?? {}
    const doppler = examStates[categoria]?.doppler ?? {}
    const nasal = String(first.osso_nasal ?? '')
    const tricuspid = String(first.tricuspide ?? '')
    return {
      crl: String(first.ccn ?? ''),
      nt: String(first.tn ?? ''),
      fhr: String(first.bcf ?? ''),
      dvPI: String(doppler['realizado.sim.ip_dv'] ?? ''),
      nasalBone: nasal === 'presente' ? 'present' as const : nasal === 'ausente' ? 'absent' as const : '' as const,
      tricuspid: tricuspid === 'ausente' ? 'normal' as const : tricuspid === 'presente' ? 'regurgitation' as const : '' as const,
    }
  }, [categoria, examStates, opts.trimestre])
  const calcSections: UiSection[] = calculators.map((c) => ({ id: `calc:${c.id}`, label: c.name, group: 'calculos' as const }))
  const sections: UiSection[] = [
    ...baseSections,
    ...(supportsVisualSchema && visualSchemaOpen ? [{ id: 'visual-schema', label: 'Esquema anatômico', group: 'orgaos' as const }] : []),
    ...(['ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR'].includes(categoria) ? [{ id: 'liver-quantification', label: 'Elastografia e gordura hepática', group: 'calculos' as const }] : []),
    { id: 'recommendations', label: 'Recomendações', group: 'conclusao' as const },
    ...calcSections,
  ]
  const currentCategory = isTireoide ? TIREOIDE_CATEGORY : genericCategory!
  const examState = isTireoide ? undefined : examStates[categoria]

  // Controles de categoria (via, menopausa, segmento…).
  const controls = isTireoide ? [] : genericCategory?.controls ?? []
  const onOpts = (key: string, value: string | string[]) =>
    setExamStates((all) => {
      const current = all[categoria] ?? {}
      const migrated = categoria === 'MUSCULOESQUELETICO' ? migrateLegacyMskState(current) : current
      return {
        ...all,
        [categoria]: { ...migrated, __opts: { ...((migrated['__opts'] as Record<string, string | string[]>) ?? {}), [key]: value } },
      }
    })

  /**
   * AS CATEGORIAS MIGRADAS saem do RENDERER canônico; as demais compõem local.
   *
   * A lista está em `lib/catalog/migradas.ts`, e cada entrada só chega lá
   * depois de provada por um gate diferencial. Acrescentar a próxima categoria
   * é acrescentar um `case` aqui e uma linha lá — não uma cirurgia.
   *
   * Não há para onde cair quando o `/render` falha, e é de propósito: um
   * segundo motor vivo produziria um laudo plausível e errado no dia em que
   * alguém o chamasse sem perceber. `composeReport` recusa categoria migrada.
   */
  const migrada = categoriaMigrada(categoria)

  const achadosCanonicos = useMemo(() => {
    if (isTireoide) {
      const a = adaptarTireoide(tireoideState)
      return { dados: a.dados as unknown as Record<string, unknown>, alteracoes: a.alteracoes, pendencias: a.pendencias }
    }
    if (categoria === 'PELVE_FEMININA') {
      const estado = (examStates[categoria] ?? {}) as Record<string, unknown>
      const opcoes = (estado['__opts'] as Record<string, string | string[]>) ?? {}
      return adaptarPelve(estado, opcoes)
    }
    if (categoria === 'MAMARIA') {
      return adaptarMamaria((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'OBSTETRICA') {
      return adaptarObstetrica((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'ABDOMEN_TOTAL') {
      return adaptarAbdome((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'ABDOMEN_SUPERIOR') {
      return adaptarAbdomeSuperior((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'VIAS_URINARIAS') {
      return adaptarViasUrinarias((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'PROSTATA_SUPRAPUBICA') {
      return adaptarProstataSuprapubica((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'CERVICAL') {
      return adaptarCervical((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'CERVICOMETRIA') {
      return adaptarCervicometria((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'PARTES_MOLES') {
      return adaptarPartesMoles((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'MUSCULOESQUELETICO') {
      return adaptarMusculoesqueletico((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    if (categoria === 'MORFOLOGICO') {
      const estado = (examStates[categoria] ?? {}) as Record<string, unknown>
      const opcoes = (estado['__opts'] as Record<string, string | string[]>) ?? {}
      return adaptarMorfologico(estado, opcoes)
    }
    if (categoria === 'DOPPLER_OBSTETRICO') {
      return adaptarDopplerWeb(examStates[categoria] ?? {})
    }
    if (categoria === 'DOPPLER_CAROTIDAS') {
      return adaptarDopplerCarotidas((examStates[categoria] ?? {}) as Record<string, unknown>)
    }
    return null
  }, [categoria, examStates, isTireoide, tireoideState])

  const renderCategory = categoria === 'DOPPLER_OBSTETRICO'
    ? categoriaRenderDoppler(examStates[categoria] ?? {})
    : categoria
  const laudoCanonico = useLaudoCanonico(renderCategory, achadosCanonicos, migrada && !choosingCategory && !composition, documentKey)
  const composicao = useComposicaoCanonica(composition, Boolean(composition) && !choosingCategory, compositionBaseRevision)
  /** O laudo em tela depende de rede: exame avulso migrado ou composição. */
  const remoto = migrada || Boolean(composition)
  const motor = composition
    ? { carregando: composicao.carregando, desatualizado: composicao.desatualizado, erro: composicao.erro }
    : { carregando: laudoCanonico.carregando, desatualizado: laudoCanonico.desatualizado, erro: laudoCanonico.erro }

  const generatedText = useMemo(() => {
    if (composition) return composicao.texto
    if (migrada) return laudoCanonico.texto
    const cat = CATEGORIES[categoria]
    return cat ? composeReport(cat, examStates[categoria]).text : ''
  }, [categoria, composition, composicao.texto, examStates, migrada, laudoCanonico.texto])

  /**
   * OS BLOCOS DE CALCULADORA — e por que isto NÃO fura a regra do §3.2.
   *
   * A regra é que o navegador não compõe texto clínico: nas categorias
   * migradas o laudo vem inteiro do renderer canônico, e `composeReport`
   * RECUSA categoria migrada justamente para que nenhum caminho novo devolva
   * prosa clínica montada aqui.
   *
   * Um bloco de calculadora é concatenado ao laudo, e à primeira leitura
   * parece a mesma coisa. Não é, e a diferença não é de tamanho nem de origem
   * do texto — é de **quem decide que ele entra**:
   *
   *   - o que a regra proíbe é um MOTOR PARALELO compondo frase clínica
   *     sozinho, sem ninguém pedir, produzindo um laudo plausível que ninguém
   *     reconhece como vindo do lugar errado;
   *   - o bloco é AUTOIDENTIFICADO (abre com "RASTREIO DE PRÉ-ECLÂMPSIA
   *     (1º trimestre)") e entra por ação EXPLÍCITA do médico, que clica para
   *     inseri-lo e pode removê-lo. É o equivalente a ele digitar.
   *
   * Quem for acrescentar bloco novo aqui: o teste é esse. Se o texto entra
   * sozinho, ou se ele se confunde com as frases do laudo, está do lado errado
   * da regra — e aí o lugar dele é o renderer canônico, não este arquivo.
   *
   * ## Por que não duplica no re-render
   *
   * Nas categorias migradas o laudo chega por rede e o componente re-renderiza
   * a cada resposta. O bloco não é inserido NO TEXTO: vive em estado próprio,
   * chaveado por categoria e por calculadora, e `composedText` é derivado.
   * Inserir duas vezes sobrescreve a mesma chave; um laudo novo recompõe o
   * join. Duplicação é estruturalmente impossível, e por isso o núcleo em
   * `packages/shared` não precisa carregar id de deduplicação.
   *
   * ## O caso do rascunho editado à mão
   *
   * Depois que o médico edita o texto, `documentText` passa a ser o rascunho e
   * o bloco já está dentro dele. Remover pelo painel muda o `composedText` mas
   * não o rascunho — e isso aparece como `sourceChanged`, a sugestão de
   * aplicar o modelo novo. É o comportamento do rascunho que já existia: o que
   * ele editou é dele, e nada sobrescreve sem ele mandar.
   */
  const [calculatorBlocksByCategory, setCalculatorBlocksByCategory] = useState<Record<string, Record<string, string>>>({})
  const calculatorBlocks = useMemo(() => calculatorBlocksByCategory[documentKey] ?? {}, [calculatorBlocksByCategory, documentKey])
  const [companionNotesByCategory, setCompanionNotesByCategory] = useState<Record<string, string[]>>({})
  const companionNotes = useMemo(() => companionNotesByCategory[documentKey] ?? [], [companionNotesByCategory, documentKey])
  /**
   * Recomendações moram no componente que abriu a associação; a quantificação
   * hepática, no componente de abdome. No exame avulso, na própria categoria.
   */
  const recommendationState = composition
    ? composition.states[composition.primaryComponentId]
    : examStates[categoria]
  const liverComponent = composition?.components.find((c) => c.categoryCode === 'ABDOMEN_TOTAL') ?? null
  const liverState = composition
    ? (liverComponent ? composition.states[liverComponent.componentId] : undefined)
    : examStates[categoria]
  const recommendation = String(recommendationState?.__recommendations?.inserted ?? '')
  const liverMeasurements = liverState?.__liver_quantification ?? {}
  const liverResult = buildLiverQuantificationBlock(liverMeasurements)
  const liverInserted = !liverResult.errors.length && liverMeasurements.inserted === liverResult.text ? liverResult.text : ''
  const composedText = useMemo(
    () => generatedText ? [
      generatedText,
      ...Object.values(calculatorBlocks),
      recommendation ? `RECOMENDAÇÕES:\n${recommendation}` : '',
      liverInserted,
      ...companionNotes.map((note) => `OBSERVAÇÃO DO MÉDICO:\n${note}`),
    ].filter(Boolean).join('\n\n') : '',
    [calculatorBlocks, companionNotes, generatedText, recommendation, liverInserted]
  )
  const insertCalculatorBlock = (calculatorId: string, block: string) => {
    setCalculatorBlocksByCategory((all) => ({
      ...all,
      [documentKey]: { ...(all[documentKey] ?? {}), [calculatorId]: block },
    }))
  }
  const removeCalculatorBlock = (calculatorId: string) => {
    setCalculatorBlocksByCategory((all) => {
      const current = { ...(all[documentKey] ?? {}) }
      delete current[calculatorId]
      return { ...all, [documentKey]: current }
    })
  }

  // O texto manual é preservado por categoria e modo Doppler. Enquanto o usuário não editar,
  // os controles determinísticos continuam atualizando o documento ao vivo.
  // Depois da primeira edição, uma nova composição nunca sobrescreve o rascunho.
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({})
  const [undoByCategory, setUndoByCategory] = useState<Record<string, UndoSnapshot | undefined>>({})
  const generatedHtml = useMemo(() => textToReportHtml(composedText), [composedText])
  const storedDraft = reportDrafts[documentKey]
  const activeDraft: ReportDraft = storedDraft ?? {
    text: composedText,
    html: generatedHtml,
    sourceText: composedText,
    sourceHtml: generatedHtml,
    dirty: false,
  }
  const documentText = richEditor && activeDraft.dirty ? activeDraft.text : composedText
  const documentHtml = richEditor && activeDraft.dirty ? activeDraft.html : generatedHtml
  const sourceChanged = richEditor && activeDraft.dirty && activeDraft.sourceText !== composedText
  const suggestionDiff = useMemo(
    () => sourceChanged ? diffReportBlocks(documentText, composedText) : null,
    [composedText, documentText, sourceChanged]
  )
  const onDocumentChange = ({ text, html }: { text: string; html: string }) => {
    setUndoByCategory((undo) => ({ ...undo, [documentKey]: undefined }))
    setReportDrafts((drafts) => {
      const sourceText = drafts[documentKey]?.dirty ? drafts[documentKey].sourceText : composedText
      const sourceHtml = drafts[documentKey]?.dirty ? drafts[documentKey].sourceHtml : generatedHtml
      return {
        ...drafts,
        [documentKey]: {
          text,
          html,
          sourceText,
          sourceHtml,
          dirty: text !== sourceText || html !== sourceHtml,
        },
      }
    })
  }
  const applyCurrentModel = () => {
    const appliedHtml = activeDraft.dirty
      ? mergeReportHtml(documentHtml, composedText)
      : generatedHtml
    setUndoByCategory((undo) => ({
      ...undo,
      [documentKey]: {
        previousText: documentText,
        previousHtml: documentHtml,
        appliedText: composedText,
        appliedHtml,
      },
    }))
    setReportDrafts((drafts) => ({
      ...drafts,
      [documentKey]: {
        text: composedText,
        html: appliedHtml,
        sourceText: composedText,
        sourceHtml: generatedHtml,
        dirty: appliedHtml !== generatedHtml,
      },
    }))
  }
  const resetDocumentDraft = () => {
    if (activeDraft.dirty && typeof window !== 'undefined') {
      const confirmed = window.confirm('Substituir a edição manual pelo modelo gerado a partir dos campos atuais?')
      if (!confirmed) return
    }
    setUndoByCategory((undo) => ({ ...undo, [documentKey]: undefined }))
    setReportDrafts((drafts) => ({
      ...drafts,
      [documentKey]: {
        text: composedText,
        html: generatedHtml,
        sourceText: composedText,
        sourceHtml: generatedHtml,
        dirty: false,
      },
    }))
  }
  const rejectCurrentModel = () => {
    setReportDrafts((drafts) => {
      const current = drafts[documentKey] ?? activeDraft
      return {
        ...drafts,
        [documentKey]: {
          text: current.text,
          html: current.html,
          sourceText: composedText,
          sourceHtml: generatedHtml,
          dirty: current.text !== composedText || current.html !== generatedHtml,
        },
      }
    })
  }
  const undoAcceptedSuggestion = () => {
    const snapshot = undoByCategory[documentKey]
    if (!snapshot || snapshot.appliedText !== composedText || documentText !== composedText) return
    setReportDrafts((drafts) => ({
      ...drafts,
      [documentKey]: {
        text: snapshot.previousText,
        html: snapshot.previousHtml,
        sourceText: composedText,
        sourceHtml: generatedHtml,
        dirty: snapshot.previousText !== composedText || snapshot.previousHtml !== generatedHtml,
      },
    }))
    setUndoByCategory((undo) => ({ ...undo, [documentKey]: undefined }))
  }
  const undoSnapshot = undoByCategory[documentKey]
  const canUndoSuggestion = Boolean(
    undoSnapshot &&
    undoSnapshot.appliedText === composedText &&
    undoSnapshot.appliedHtml === documentHtml &&
    documentText === composedText
  )
  const preview = useMemo(
    () => appendInitials(documentText, initials || undefined),
    [documentText, initials]
  )
  const previewHtml = useMemo(
    () => appendInitialsToReportHtml(documentHtml, initials || undefined),
    [documentHtml, initials]
  )

  // Persistência real (S9) — substitui o status falso. Volta a "idle" quando o
  // laudo muda (o salvo anterior fica desatualizado).
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [companionOpen, setCompanionOpen] = useState(false)
  const [companionState, setCompanionState] = useState({ connected: false, pending: 0 })
  const [saveError, setSaveError] = useState<string | null>(null)
  // Também quando o MOTOR muda de estado: com rascunho manual o texto não
  // muda, e uma recusa de salvar por falha já resolvida ficaria presa na tela.
  useEffect(() => {
    setSaveState('idle')
    setSaveError(null)
  }, [preview, previewHtml, composicao.requestId, composicao.erro])
  /**
   * SALVAR um laudo que já não corresponde ao formulário — o buraco fechado.
   *
   * Nas categorias migradas o texto chega por rede, com atraso. Entre a última
   * tecla e a resposta, o que está na tela é o laudo ANTERIOR; e quando o
   * `/render` falha, é o laudo de antes da falha. O aviso acima do preview diz
   * isso — mas aviso não impede clique, e o médico que salva nesse intervalo
   * guarda no prontuário um documento que ele acha que revisou.
   *
   * A recusa não vale para o texto EDITADO à mão: aí o médico assumiu a
   * redação, e ela é dele, não do motor.
   */
  const textoFoiEditado = activeDraft.text !== activeDraft.sourceText
  /**
   * NA ASSOCIAÇÃO a recusa vale MESMO com texto editado à mão. O que se grava
   * não é só o texto: é o estado dos dois componentes, que reabre para edição.
   * Se um componente falhou ou ainda não voltou, esse estado não foi conferido
   * pelo renderer, e salvá-lo como exame completo seria prometer uma
   * reabertura que produz outro laudo.
   */
  const composicaoNaoConfere = Boolean(composition) && (
    composicao.carregando || composicao.desatualizado || composicao.erro !== null || !composicao.requestId
  )
  const laudoNaoConfere = composition
    ? composicaoNaoConfere
    : migrada && !textoFoiEditado && (laudoCanonico.carregando || laudoCanonico.desatualizado || laudoCanonico.erro !== null)
  const laudoTabState: 'idle' | 'updating' | 'suggestion' | 'dirty' | 'error' = motor.erro || saveState === 'error'
    ? 'error'
    : remoto && (motor.carregando || motor.desatualizado)
      ? 'updating'
      : sourceChanged
        ? 'suggestion'
        : activeDraft.dirty
          ? 'dirty'
          : 'idle'

  const onSave = async () => {
    if (laudoNaoConfere) {
      setSaveState('error')
      setSaveError(
        motor.erro
          ? composition
            ? 'O laudo associado não foi montado por inteiro — nada é salvo enquanto um dos exames estiver com falha, nem com texto editado.'
            : 'O laudo não foi montado — não dá para salvar o texto anterior como se fosse este exame.'
          : 'Espere o laudo terminar de montar: o texto na tela ainda é o anterior.',
      )
      return
    }
    setSaveState('saving')
    setSaveError(null)
    if (composition) {
      try {
        const envelope = attachReportPresentation(
          buildEnvelope({
            session: composition,
            rendered: {
              requestId: composicao.requestId!,
              revision: composicao.revision,
              fullText: composicao.texto,
              blocks: composicao.blocks,
            },
            extras: { calculatorBlocks, companionNotes },
            // O rascunho salvo é o que está NA TELA: editado, o do médico; não
            // editado, o modelo atual (um rascunho limpo antigo não vale).
            draft: richEditor && activeDraft.dirty
              ? activeDraft
              : { text: composedText, html: generatedHtml, sourceText: composedText, sourceHtml: generatedHtml, dirty: false },
            initials,
          }),
          previewHtml,
        )
        const laudoText = savedTextOf(envelope as Parameters<typeof savedTextOf>[0])
        // O texto gravado é DERIVADO do envelope; se não for o que o médico vê,
        // algo divergiu e não se grava.
        if (laudoText !== preview) throw new Error('O texto na tela não corresponde ao estado a salvar. Recarregue o laudo.')
        const definition = associationByCode(composition.associationCode)
        const payload = { title: definition.label, laudoText, envelope }
        const saved = savedComposition?.compositionId === composition.compositionId
          ? await updateCompositionReport(savedComposition.id, { ...payload, expectedUpdatedAt: savedComposition.updatedAt })
          : await saveCompositionReport({ ...payload, associationCode: composition.associationCode })
        setSavedComposition({ compositionId: composition.compositionId, ...saved })
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
      return
    }
    try {
      await saveWebReport({
        categoryCode: categoria,
        title: categoria === 'DOPPLER_OBSTETRICO'
          ? somenteDoppler(examStates[categoria] ?? {}) ? 'Somente Doppler obstétrico' : 'Obstétrica com Doppler'
          : currentCategory.name,
        laudoText: preview,
        examState: attachReportPresentation(
          isTireoide ? { ...tireoideState, __recommendations: examStates[categoria]?.__recommendations }
            : categoria === 'DOPPLER_OBSTETRICO' ? estadoDopplerVisivel(examStates[categoria] ?? {})
            : categoria === 'OBSTETRICA' ? { ...examStates[categoria], doppler: {} }
            : examStates[categoria],
          previewHtml,
        ),
      })
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (choosingCategory) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const select = document.querySelector<HTMLSelectElement>('[data-category-selector] select')
        select?.focus()
        if (select && 'showPicker' in select) {
          try { select.showPicker() } catch { /* o foco já permite usar as setas */ }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [choosingCategory])

  // Rola até o card que o celular acabou de preencher e o destaca. Um
  // 'biometria'/'crescimento_fetal' vindo do celular cai no card agrupado.
  useEffect(() => {
    if (!revealRequest || choosingCategory || revealRequest.category !== categoria) return
    if (activePaneRef.current !== 'achados') return
    const id = resolverSecaoAtivaAgrupada(sections, revealRequest.id)
    const frame = window.requestAnimationFrame(() => {
      const card = document.querySelector<HTMLElement>(`#workspace-panel-achados [data-section-id="${CSS.escape(id)}"]`)
      if (!card) return
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      card.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
      setHighlightedSectionId(id)
    })
    const timeout = window.setTimeout(() => setHighlightedSectionId(null), 2200)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
    // `sections` é recriado a cada render; o pedido só precisa rodar uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRequest, categoria, choosingCategory])

  const isBiometryGrowthCard = (section: WorkspaceSection) =>
    section.id === BIOMETRY_GROWTH_SECTION_ID && Boolean(biometryGrowth.biometry && biometryGrowth.growth)

  const canResetSection = (section: WorkspaceSection) => {
    if (section.id.startsWith('calc:')) return false
    if (isTireoide) return TIREOIDE_RESETAVEIS.has(section.id)
    return isBiometryGrowthCard(section) || Boolean(section.module)
  }

  const resetSection = (section: WorkspaceSection) => {
    if (isTireoide) {
      if (section.id === 'nodulos') {
        setTireoideState((state) => ({ ...state, nodulos: [] }))
        return
      }
      if (section.id === 'linfonodos') {
        setTireoideState((state) => ({ ...state, linfonodos: 'preservados' }))
        return
      }
      if (section.id === 'lobo_direito' || section.id === 'lobo_esquerdo' || section.id === 'istmo') {
        const empty = { a: '', b: '', c: '', ecotextura: 'normal' as const }
        setTireoideState((state) => ({
          ...state,
          [section.id]: empty,
          ...(section.id === 'lobo_direito' ? { picoDireito: '' } : {}),
          ...(section.id === 'lobo_esquerdo' ? { picoEsquerdo: '' } : {}),
        }))
      }
      return
    }

    // O card agrupado limpa os DOIS módulos numa única atualização — meio
    // reset deixaria na tela um percentil órfão das medidas que o justificavam.
    if (isBiometryGrowthCard(section) && biometryGrowth.biometry && biometryGrowth.growth) {
      const biometryInitial = biometryGrowth.biometry.initialState()
      const growthInitial = biometryGrowth.growth.initialState()
      setExamStates((all) => ({
        ...all,
        [categoria]: {
          ...all[categoria],
          [BIOMETRY_SECTION_ID]: biometryInitial,
          [GROWTH_SECTION_ID]: growthInitial,
        },
      }))
      return
    }

    if (!section.module) return
    const mod = section.module
    setExamStates((all) => ({
      ...all,
      [categoria]: invalidarPercentilManual(all[categoria], { ...all[categoria], [section.id]: mod.initialState() }),
    }))
  }

  /**
   * LARGURA DO CARD — só apresentação. `full` ocupa a linha inteira (painéis
   * que já são grades próprias); `wide` ocupa duas colunas quando há três.
   */
  const sectionCardSize = (section: WorkspaceSection): SectionCardSize => {
    if (section.id === 'visual-schema' || section.id === 'liver-quantification') return 'wide'
    if (FULL_WIDTH_SECTIONS.has(section.id)) return 'full'
    if (section.id === 'feto') return 'wide'
    if (section.id.startsWith('calc:')) {
      const spec = calculators.find((c) => `calc:${c.id}` === section.id)
      return spec && (spec.kind === 'pre-eclampsia-fmf' || spec.kind === 'trisomy-fmf') ? 'full' : 'wide'
    }
    if (categoria === 'DOPPLER_CAROTIDAS') return section.id === 'conclusao' ? 'wide' : 'regular'
    const fields = section.module?.schema.fields.length ?? 0
    return fields >= 9 ? 'wide' : 'regular'
  }

  const updateSectionState = (sectionId: string, nextState: OrganState, invalidatePercentile = true) =>
    setExamStates((all) => ({
      ...all,
      [categoria]: invalidatePercentile
        ? invalidarPercentilManual(all[categoria], { ...all[categoria], [sectionId]: nextState })
        : { ...all[categoria], [sectionId]: nextState },
    }))

  const singleScope: SectionScope = {
    key: categoria,
    categoria,
    state: examState ?? {},
    update: (fn) => setExamStates((all) => ({ ...all, [categoria]: fn(all[categoria] ?? {}) })),
    calculators,
  }

  /**
   * O corpo do card, dentro de um ESCOPO. As variáveis locais sombreiam as do
   * exame avulso de propósito: o mesmo painel serve à categoria aberta e a
   * cada componente de uma associação, e nenhum deles alcança o estado do outro.
   */
  const renderSectionBodyIn = (scope: SectionScope, section: WorkspaceSection) => {
    const categoria = scope.categoria
    const examState = scope.state
    const opts = ((scope.state.__opts as Record<string, string | string[]> | undefined) ?? {}) as Record<string, string | string[]>
    const calculators = scope.calculators
    const updateSectionState = (sectionId: string, nextState: OrganState, invalidatePercentile = true) =>
      scope.update((current) => invalidatePercentile
        ? invalidarPercentilManual(current, { ...current, [sectionId]: nextState })
        : { ...current, [sectionId]: nextState })

    if (section.id === 'calc:bi-rads' && categoria === 'MAMARIA') return <MamariaBiradsPanel state={examState?.mamas ?? {}} onChange={state => updateSectionState('mamas', state, false)} />
    if (section.id === 'liver-quantification') return <div className="space-y-3">
      <LiverQuantificationPanel state={liverMeasurements} onChange={state => updateSectionState('__liver_quantification', { ...state, inserted: '' }, false)} />
      {liverResult.text || liverInserted ? <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={Boolean(liverResult.errors.length) || Boolean(liverInserted)}
          onClick={() => updateSectionState('__liver_quantification', { ...liverMeasurements, inserted: liverResult.text }, false)}
          className="min-h-11 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-40 md:min-h-8">Incluir medidas no laudo</button>
        {liverInserted ? <button type="button" onClick={() => updateSectionState('__liver_quantification', { ...liverMeasurements, inserted: '' }, false)}
          className="min-h-11 rounded-full border px-3 text-xs md:min-h-8">Remover medidas do laudo</button> : null}
        <span role="status" className="text-xs text-gray-500">{liverInserted ? 'Medidas incluídas no modelo.' : 'Confira os valores antes de incluir. Alterar uma medida exige nova inclusão.'}</span>
      </div> : null}
    </div>
    if (section.id === 'recommendations') return <RecommendationsPanel state={examState?.__recommendations ?? {}} onChange={state => updateSectionState('__recommendations', state, false)} />
    if (section.id === 'visual-schema') return (
                    <VisualSchemaPanel
                      category={isTireoide ? 'TIREOIDE' : categoria === 'MAMARIA' ? 'MAMARIA' : 'FETAL_POSITION'}
                      breastState={(examStates.MAMARIA?.mamas ?? { fundo: 'heterogeneo', achados_ids: [] }) as OrganState}
                      fetalState={(examStates[categoria]?.feto ?? {}) as OrganState}
                      thyroidState={tireoideState}
                      onBreastChange={(nextState) => setExamStates((all) => ({
                        ...all,
                        MAMARIA: { ...all.MAMARIA, mamas: nextState },
                      }))}
                      onThyroidChange={setTireoideState}
                      embedded
                      onClose={() => setVisualSchemaOpen(false)}
                    />
    )
    if (section.id.startsWith('calc:')) {
      const spec = calculators.find((c) => `calc:${c.id}` === section.id)
      if (!spec) return null
      if (spec.kind === 'pre-eclampsia-fmf') {
        return (
          <PreEclampsiaFmfPanel
            insertedBlock={calculatorBlocks[spec.id]}
            onInsert={(block) => insertCalculatorBlock(spec.id, block)}
            onRemove={() => removeCalculatorBlock(spec.id)}
          />
        )
      }
      if (spec.kind === 'trisomy-fmf') {
        return (
          <TrisomyFmfPanel
            initialValues={trisomyInitialValues}
            insertedBlock={calculatorBlocks[spec.id]}
            onInsert={(block) => insertCalculatorBlock(spec.id, block)}
            onRemove={() => removeCalculatorBlock(spec.id)}
          />
        )
      }
      return 'fields' in spec
        ? <CalcPanel spec={spec} examState={isTireoide && !composition ? undefined : examState} />
        : null
    }
    if (isTireoide) {
      return <TireoideFormPanel section={section.id} state={tireoideState} onChange={setTireoideState} showCompanionConflicts={false} />
    }
    if (categoria === 'MAMARIA' && section.id === 'mamas') {
      return (
        <MamariaFormPanel
          state={examState?.mamas ?? section.module?.initialState() ?? { fundo: 'heterogeneo', achados_ids: [] }}
          dopplerEnabled={opts.doppler_mamario === 'sim'}
          onChange={(nextState) => updateSectionState('mamas', nextState, false)}
        />
      )
    }
    if (categoria === 'DOPPLER_CAROTIDAS' && section.module) {
      return (
        <DopplerCarotidasFormPanel
          section={section.id}
          state={examState?.[section.id] ?? section.module.initialState()}
          onChange={(nextState) => updateSectionState(section.id, nextState, false)}
        />
      )
    }
    if (isBiometryGrowthCard(section) && biometryGrowth.biometry && biometryGrowth.growth) {
      return (
        <BiometryGrowthPanel
          biometry={biometryGrowth.biometry}
          biometryState={examState?.[BIOMETRY_SECTION_ID] ?? biometryGrowth.biometry.initialState()}
          onBiometryChange={(nextState) => updateSectionState(BIOMETRY_SECTION_ID, nextState)}
          growth={biometryGrowth.growth}
          growthState={examState?.[GROWTH_SECTION_ID] ?? biometryGrowth.growth.initialState()}
          igState={examState?.ig ?? {}}
          onGrowthChange={(nextState) => updateSectionState(GROWTH_SECTION_ID, nextState, false)}
          compact
        />
      )
    }
    if (section.module) {
      const mod = section.module
      return (
        <OrganFormPanel
          schema={mod.schema}
          state={examState?.[section.id] ?? mod.initialState()}
          compact
          gestationalWeeks={(() => {
            if (section.id !== 'doppler') return undefined
            const raw = examState?.ig?.bio_sem
            const value = Number.parseFloat(String(raw ?? '').replace(',', '.'))
            return Number.isFinite(value) ? value : null
          })()}
          onChange={(nextState) => updateSectionState(section.id, nextState)}
        />
      )
    }
    return (
      <div>
        <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400">Texto padrão — entra automaticamente no laudo normal.</p>
        {section.normalBody ? (
          <p className="mt-2.5 rounded-2xl bg-gray-50 px-3.5 py-3 text-[13px] leading-relaxed text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">{section.normalBody}</p>
        ) : null}
      </div>
    )
  }
  const renderSectionBody = (section: WorkspaceSection) => renderSectionBodyIn(singleScope, section)

  /**
   * TRANSFERÊNCIA DO DOCUMENTO entre chaves (avulso ↔ composição).
   *
   * Rascunho do médico, blocos de calculadora e observações do celular são
   * DELE, e seguem o exame quando ele associa ou desassocia. O texto editado à
   * mão nunca é sobrescrito: com a composição, o modelo novo aparece como
   * sugestão sobre o rascunho, pelo mecanismo que já existe. A chave de origem
   * é esvaziada — voltar a ela não pode ressuscitar um rascunho antigo.
   */
  const moveDocument = (from: string, to: string) => {
    const move = <T,>(all: Record<string, T | undefined>) => {
      const next = { ...all }
      if (next[from] !== undefined) next[to] = next[from]
      else delete next[to]
      delete next[from]
      return next
    }
    setReportDrafts((all) => move(all) as Record<string, ReportDraft>)
    setUndoByCategory((all) => {
      const next = { ...all }
      delete next[from]
      delete next[to]
      return next
    })
    setCalculatorBlocksByCategory((all) => move(all) as Record<string, Record<string, string>>)
    setCompanionNotesByCategory((all) => move(all) as Record<string, string[]>)
  }

  const dropDocument = (key: string) => {
    const drop = <T,>(all: Record<string, T>) => {
      const next = { ...all }
      delete next[key]
      return next
    }
    setReportDrafts(drop)
    setUndoByCategory(drop)
    setCalculatorBlocksByCategory(drop)
    setCompanionNotesByCategory(drop)
  }

  const startCompositionWith = (definition: AssociationDefinition) => {
    if (composition || isTireoide) return
    const primary = categoria as CompositionCategoryCode
    const session = startAssociation(
      definition,
      primary,
      examStates[primary] ?? {},
      (category) => initialExamState(CATEGORIES[category]),
      () => crypto.randomUUID(),
    )
    moveDocument(documentKey, compositionKey(session.compositionId))
    // O estado avulso da categoria foi PARA a sessão. O que fica em
    // `examStates` volta ao inicial, para que sair da associação não reabra
    // achados que já pertencem a ela.
    setExamStates((all) => ({ ...all, [primary]: initialExamState(CATEGORIES[primary]) }))
    setComposition(session)
    setSavedComposition(null)
    setCompositionBaseRevision(0)
  }

  const removeCompositionComponent = (componentId: string) => {
    if (!composition) return
    const removed = composition.components.find((c) => c.componentId === componentId)
    if (!removed) return
    if (typeof window !== 'undefined' && !window.confirm(
      `Remover ${nameOf(removed.categoryCode)} da associação? Os achados preenchidos neste exame serão descartados.`,
    )) return
    const remaining = removeComponent(composition, componentId)
    moveDocument(compositionKey(composition.compositionId), remaining.category)
    setExamStates((all) => ({ ...all, [remaining.category]: remaining.state }))
    setComposition(null)
    setSavedComposition(null)
    setCategoria(remaining.category)
  }

  /** Trocar de categoria com uma associação aberta encerra a associação. */
  const changeCategory = (nextCategory: string) => {
    if (composition) {
      if (typeof window !== 'undefined' && !window.confirm(
        'Sair da associação de exames? Os achados dos exames associados serão descartados desta tela.',
      )) return
      dropDocument(compositionKey(composition.compositionId))
      setComposition(null)
      setSavedComposition(null)
    }
    selectCategory(nextCategory)
  }

  const compositionScopes: Array<{ ref: CompositionComponentRef; scope: SectionScope; sections: WorkspaceSection[] }> = composition
    ? composition.components.map((ref) => {
        const state = composition.states[ref.componentId] ?? {}
        const opts = (state.__opts as Record<string, unknown> | undefined) ?? {}
        const category = CATEGORIES[ref.categoryCode]
        const hidden = hiddenSharedSections(composition, ref.componentId)
        const scopeCalculators = calculatorsFor(ref.categoryCode, opts)
        const baseList: WorkspaceSection[] = (category?.resolveSections?.(opts as never) ?? category?.sections ?? [])
          .filter((section) => !hidden.has(section.id))
        const scope: SectionScope = {
          key: ref.componentId,
          categoria: ref.categoryCode,
          state,
          update: (fn) => setComposition((current) => current && current.compositionId === composition.compositionId
            ? updateComponentState(current, ref.componentId, fn)
            : current),
          calculators: scopeCalculators,
        }
        const sections: WorkspaceSection[] = [
          ...baseList,
          ...(ref.categoryCode === 'ABDOMEN_TOTAL' ? [LIVER_SECTION] : []),
          ...(ref.componentId === composition.primaryComponentId ? [RECOMMENDATIONS_SECTION] : []),
          ...scopeCalculators.map((c) => ({ id: `calc:${c.id}`, label: c.name, group: 'calculos' as const })),
        ]
        return { ref, scope, sections }
      })
    : []

  const compositionSectionSize = (scope: SectionScope, section: WorkspaceSection): SectionCardSize => {
    if (section.id === 'liver-quantification') return 'wide'
    if (FULL_WIDTH_SECTIONS.has(section.id)) return 'full'
    if (section.id.startsWith('calc:')) return 'wide'
    const fields = section.module?.schema.fields.length ?? 0
    return fields >= 9 ? 'wide' : 'regular'
  }

  const resetCompositionSection = (scope: SectionScope, section: WorkspaceSection) => {
    const mod = section.module
    if (!mod) return
    scope.update((current) => ({ ...current, [section.id]: mod.initialState() }))
  }

  /**
   * REABRIR uma composição salva. O estado vem pela rota autenticada, o
   * envelope é conferido de novo aqui, e o texto do médico volta como estava —
   * inclusive o rascunho editado, que continua sendo dele.
   */
  useEffect(() => {
    if (!reopenReportId) return
    let cancelled = false
    loadCompositionReport(reopenReportId)
      .then((saved) => {
        if (cancelled) return
        const parsed = parseEnvelope(saved.envelope)
        if (parsed.kind !== 'composition') {
          setReopenState({ status: 'error', message: parsed.kind === 'legacy' ? 'Este laudo foi salvo só como texto e não reabre para edição.' : parsed.motivo })
          return
        }
        const { envelope, session } = parsed
        const key = compositionKey(session.compositionId)
        const primary = session.components.find((c) => c.componentId === session.primaryComponentId)!
        setReportDrafts((all) => ({ ...all, [key]: envelope.draft }))
        setCalculatorBlocksByCategory((all) => ({ ...all, [key]: envelope.extras.calculatorBlocks }))
        setCompanionNotesByCategory((all) => ({ ...all, [key]: envelope.extras.companionNotes }))
        setCompositionBaseRevision(envelope.revision)
        // As iniciais fazem parte do texto salvo: reabrir com as de hoje
        // mostraria outro laudo. Não grava a escolha como padrão.
        setInitials(envelope.initials)
        setComposition(session)
        setSavedComposition({ compositionId: session.compositionId, id: saved.id, updatedAt: saved.updatedAt })
        setCategoria(primary.categoryCode)
        setChoosingCategory(false)
        setReopenState({ status: 'idle' })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setReopenState({ status: 'error', message: error instanceof Error ? error.message : 'Não foi possível reabrir o laudo.' })
      })
    return () => { cancelled = true }
  }, [reopenReportId])

  const phoneStatus = companionState.connected ? 'Celular conectado' : 'Celular desconectado'
  const pendingLabel = companionState.pending > 0
    ? `, ${companionState.pending} ${companionState.pending === 1 ? 'envio pendente' : 'envios pendentes'}`
    : ''

  /** Ferramentas que valem para as duas abas: esquema visual e digitadora. */
  const secondaryTools = (
    <>
      {supportsVisualSchema ? (
        <ToolbarPill tone={visualSchemaOpen ? 'toggleOn' : 'neutral'} onClick={() => {
          setVisualSchemaOpen(true)
          selectPane('achados')
          revealSection(categoria, 'visual-schema')
        }}>
          <ScanLine aria-hidden="true" className="h-4 w-4" />
          Esquema visual
        </ToolbarPill>
      ) : null}

      {/*
        QUEM DIGITOU — decisão de antes de escrever. Some quando não há
        ninguém cadastrado: um seletor vazio é ruído para quem digita os
        próprios laudos.
      */}
      {digitadoras.length > 0 ? (
        <label className="inline-flex items-center gap-1.5" title="Quem digitou — as iniciais saem no fim do laudo">
          <span className="sr-only">Digitadora</span>
          <select
            value={initials}
            onChange={(e) => {
              setInitials(e.target.value)
              gravarAtual(e.target.value)
            }}
            className="h-9 max-w-full rounded-full border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-600 outline-none transition hover:bg-gray-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-emerald-900/40"
          >
            <option value="">Sem digitadora</option>
            {digitadoras.map((d) => (
              <option key={d.iniciais} value={d.iniciais}>
                {d.nome || d.iniciais.toUpperCase()} · /{d.iniciais}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  )
  const hasSecondaryTools = supportsVisualSchema || digitadoras.length > 0
  const hasExamOptions = controls.length > 0 || isTireoide || categoria === 'DOPPLER_OBSTETRICO'

  return (
    <>
      {reopenState.status !== 'idle' ? (
        <div
          role={reopenState.status === 'error' ? 'alert' : 'status'}
          data-reopen-state={reopenState.status}
          className={`mx-auto mt-4 w-[min(100%-32px,720px)] rounded-2xl border px-4 py-3 text-sm ${reopenState.status === 'error'
            ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
            : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}
        >
          {reopenState.status === 'error'
            ? <><strong className="font-semibold">Não foi possível reabrir para edição.</strong> {reopenState.message} O texto salvo continua no histórico.</>
            : 'Reabrindo o laudo salvo…'}
        </div>
      ) : null}
      {choosingCategory && reopenState.status !== 'loading' && <ExamCategoryPicker onSelect={(id) => {
        changeCategory(id)
        setChoosingCategory(false)
      }} />}
      <div
        ref={rootRef}
        hidden={choosingCategory}
        className="laudar-web-responsive min-h-screen overflow-x-clip bg-[#F2F2F7] text-gray-900 dark:bg-[#0B0B0F] dark:text-gray-100"
      >
        <style>{`
          .laudar-web-responsive [hidden] { display: none !important; }

          @container organ-card (min-width: 580px) {
                .renal-pair-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              }
              /* HEADER — três colunas: as abas ficam no centro geométrico. */
          .laudar-web-responsive .laudar-header-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
            grid-template-areas: "start center end";
            align-items: center;
            column-gap: 16px;
            min-height: 64px;
            padding: 8px 20px;
          }
          .laudar-web-responsive .laudar-header-start { grid-area: start; }
          .laudar-web-responsive .laudar-header-center { grid-area: center; }
          .laudar-web-responsive .laudar-header-end { grid-area: end; }
          .laudar-web-responsive [data-category-selector] { min-width: 0; max-width: 100%; }

          /* CONTEÚDO — margem do rail no desktop. */
          .laudar-web-responsive .achados-layout,
          .laudar-web-responsive .laudo-layout {
            margin-left: ${workspaceV2 ? '56px' : '64px'};
            padding: 20px 24px 40px;
          }
          .laudar-web-responsive .laudo-frame {
            height: calc(100dvh - var(--laudar-header-height, 64px) - 112px);
            min-height: 480px;
          }
          .laudar-web-responsive .laudo-frame > section { border-left-width: 0; }

          /* GRADE DE CARDS */
          .laudar-web-responsive .workspace-section-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
            align-items: start;
          }
          .laudar-web-responsive .workspace-section-card {
            scroll-margin-top: calc(var(--laudar-header-height, 64px) + 16px);
            container-type: inline-size;
            container-name: organ-card;
          }
          @container organ-card (min-width: 700px) {
            [data-organ-schema="feto"] {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
              align-items: start;
            }
            [data-organ-schema="feto"] > * { margin-top: 0 !important; }
          }
          @media (min-width: 900px) {
            .laudar-web-responsive .workspace-section-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .laudar-web-responsive .workspace-section-grid > [data-card-size="full"] { grid-column: 1 / -1; }
          }
          @media (min-width: 1360px) {
            .laudar-web-responsive .workspace-section-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .laudar-web-responsive .workspace-section-grid > [data-card-size="wide"] { grid-column: span 2; }
          }
          @media (max-width: 1023px) {
            .laudar-web-responsive .laudar-header-grid {
              grid-template-columns: minmax(0, 1fr) auto;
              grid-template-areas: "start end" "center center";
              row-gap: 8px;
              padding: 8px 12px;
            }
            .laudar-web-responsive .laudo-frame { height: auto; min-height: 70vh; }
            .laudar-web-responsive .achados-layout,
            .laudar-web-responsive .laudo-layout { padding: 16px 16px 32px; }
          }
          @media (max-width: 767px) {
            .laudar-web-responsive > main > aside {
              display: none;
            }
            .laudar-web-responsive > main {
              padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
            }
            .laudar-web-responsive .laudar-mobile-navigation {
              bottom: calc(8px + env(safe-area-inset-bottom, 0px));
            }
            .laudar-web-responsive .achados-layout,
            .laudar-web-responsive .laudo-layout {
              margin-left: 0;
              padding: 12px 12px 24px;
            }
          }
          @media (max-width: 639px) {
            .laudar-web-responsive .laudar-brand-divider,
            .laudar-web-responsive .laudar-phone-label { display: none; }
            .laudar-web-responsive .laudar-header-start {
              display: grid;
              grid-template-columns: 32px minmax(0, 1fr);
              grid-template-areas: "back brand" "back category";
              gap: 5px 6px;
            }
            .laudar-web-responsive .laudar-header-start > button {
              grid-area: back;
              width: 32px;
            }
            .laudar-web-responsive .laudar-header-start > .laudar-brand { grid-area: brand; }
            .laudar-web-responsive .laudar-header-start > [data-category-selector] { grid-area: category; }
            .laudar-web-responsive .laudar-header-center [role="tablist"] {
              width: 100%;
              min-width: 0;
            }
          }
        `}</style>
        <header
          ref={headerRef}
          className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-[#111113]/70"
        >
          <div className="laudar-header-grid">
            <div className="laudar-header-start flex min-w-0 items-center gap-2.5">
              <button type="button" onClick={() => setChoosingCategory(true)} aria-label="Voltar às categorias" title="Voltar às categorias"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-gray-300 dark:hover:bg-white/10">
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <div className="laudar-brand flex shrink-0 items-baseline gap-1.5 font-barlow leading-none tracking-tight">
                <span className="text-[19px]">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300">Laudo</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">USG</span>
                </span>
                <span className="text-[13px] font-medium text-gray-400 dark:text-gray-500">Web</span>
              </div>
              <span aria-hidden="true" className="laudar-brand-divider h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />
              <CategorySelector
                categoria={categoria}
                currentName={composition ? associationByCode(composition.associationCode).label : currentCategory.name}
                compact
                onChange={changeCategory}
              />
            </div>

            <div className="laudar-header-center flex min-w-0 justify-center">
              <WorkspaceTabs active={activePane} onChange={selectPane} laudoState={laudoTabState} />
            </div>

            <div className="laudar-header-end flex min-w-0 items-center justify-end">
              <button
                type="button"
                onClick={() => setCompanionOpen((open) => !open)}
                aria-label={`${phoneStatus}${pendingLabel}`}
                aria-expanded={companionOpen}
                title={phoneStatus}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3 text-[13px] font-semibold text-gray-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/10"
              >
                <Smartphone aria-hidden="true" className="h-4 w-4" />
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${companionState.connected ? 'animate-pulse bg-emerald-500 motion-reduce:animate-none' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className="laudar-phone-label whitespace-nowrap">{phoneStatus}</span>
                {companionState.pending > 0 ? (
                  <span aria-hidden="true" className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-gray-950">{companionState.pending}</span>
                ) : null}
              </button>
            </div>
          </div>
        </header>

        <main className="relative">
        <LaudarRail workspaceV2={workspaceV2} />
        <div
          id="workspace-panel-achados"
          role="tabpanel"
          aria-labelledby="workspace-tab-achados"
          hidden={activePane !== 'achados'}
          aria-hidden={activePane !== 'achados'}
          className="achados-layout"
        >
          <div className="mx-auto w-full max-w-[1440px] space-y-4">
            {!isTireoide ? (
              <AssociationPanel
                categoria={categoria}
                session={composition}
                onAssociate={startCompositionWith}
                onRemove={removeCompositionComponent}
              />
            ) : null}

            {composition ? (
              <>
                {compositionScopes.map(({ ref, scope, sections: groupSections }) => {
                  const category = CATEGORIES[ref.categoryCode]
                  const groupOpts = (scope.state.__opts as Record<string, string | string[]> | undefined) ?? {}
                  const hidden = hiddenSharedSections(composition, ref.componentId)
                  return (
                    <section
                      key={ref.componentId}
                      data-composition-component={ref.categoryCode}
                      data-component-id={ref.componentId}
                      aria-labelledby={`composition-group-${ref.componentId}`}
                      className="space-y-3 rounded-[26px] border border-black/[0.05] bg-white/40 p-3 dark:border-white/[0.06] dark:bg-white/[0.02] sm:p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${categoryDotClass(ref.categoryCode)}`} />
                        <h2 id={`composition-group-${ref.componentId}`} className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
                          {nameOf(ref.categoryCode)}
                        </h2>
                        {hidden.has('bexiga') ? (
                          <span data-shared-bladder-note className="text-[12px] text-gray-500 dark:text-gray-400">
                            Bexiga: avaliada no grupo {nameOf('ABDOMEN_TOTAL')} (compartilhada).
                          </span>
                        ) : null}
                      </div>
                      {category?.controls?.length ? (
                        <ExamOptionsBar
                          controls={category.controls}
                          opts={groupOpts}
                          onOpts={(key, value) => scope.update((current) => ({
                            ...current,
                            __opts: { ...((current.__opts as Record<string, string | string[]>) ?? {}), [key]: value },
                          }))}
                        />
                      ) : null}
                      <WorkspaceSectionGrid
                        scopeKey={ref.componentId}
                        sections={groupSections}
                        contentGroupLabel={categoryContentGroupLabel(ref.categoryCode)}
                        sizeOf={(section) => compositionSectionSize(scope, section)}
                        canReset={(section) => Boolean(section.module)}
                        onReset={(section) => resetCompositionSection(scope, section)}
                        renderBody={(section) => renderSectionBodyIn(scope, section)}
                      />
                    </section>
                  )
                })}
              </>
            ) : null}

            {!composition && hasExamOptions ? (
              <ExamOptionsBar controls={controls} opts={opts} onOpts={onOpts}>
                {categoria === 'DOPPLER_OBSTETRICO' ? (
                  <label className="flex min-h-9 cursor-pointer items-center gap-2 self-end text-[13px] font-semibold text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      role="switch"
                      className="h-4 w-4 shrink-0 accent-emerald-600"
                      checked={opts.somente_doppler === 'sim'}
                      onChange={(event) => onOpts('somente_doppler', event.target.checked ? 'sim' : 'nao')}
                    />
                    Somente Doppler
                  </label>
                ) : null}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-end">
                  {isTireoide ? (
                    <ToolbarPill
                      tone={tireoideState.doppler ? 'toggleOn' : 'neutral'}
                      pressed={tireoideState.doppler}
                      onClick={() => setTireoideState((state) => ({ ...state, doppler: !state.doppler }))}
                    >
                      Doppler
                    </ToolbarPill>
                  ) : null}
                  {secondaryTools}
                </div>
              </ExamOptionsBar>
            ) : null}

            {!composition ? <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-[12.5px] text-gray-500 dark:text-gray-400">
                {isTireoide
                  ? 'Preencha medidas, nódulos e classificações informadas pelo médico.'
                  : 'Tudo pré-marcado como normal. Mude só o que estiver alterado.'}
              </p>
              {!hasExamOptions && hasSecondaryTools ? <div className="flex flex-wrap items-center gap-2">{secondaryTools}</div> : null}
            </div>

            {isTireoide ? <TireoideCompanionNotice state={tireoideState} /> : null}

            <WorkspaceSectionGrid
              scopeKey={categoria}
              sections={sections}
              contentGroupLabel={categoryContentGroupLabel(categoria)}
              sizeOf={sectionCardSize}
              canReset={canResetSection}
              onReset={resetSection}
              renderBody={renderSectionBody}
              highlightedId={highlightedSectionId}
            />
            </> : null}

            {workspaceV2 && agentWorkspace ? (
              <div className="overflow-hidden rounded-[22px] border border-black/[0.06] dark:border-white/[0.08]">
                <WorkspaceInputDock
                  canGoPrevious={false}
                  canGoNext={false}
                  onPrevious={() => undefined}
                  onNext={() => undefined}
                  hasPendingSuggestion={sourceChanged}
                  canUndoSuggestion={canUndoSuggestion}
                  onAcceptSuggestion={applyCurrentModel}
                  onRejectSuggestion={rejectCurrentModel}
                  onUndoSuggestion={undoAcceptedSuggestion}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div
          id="workspace-panel-laudo"
          role="tabpanel"
          aria-labelledby="workspace-tab-laudo"
          hidden={activePane !== 'laudo'}
          aria-hidden={activePane !== 'laudo'}
          className="laudo-layout"
        >
          {/*
            O ESTADO DO MOTOR, acima do laudo.

            As categorias migradas vêm do renderer, e isso é assíncrono: entre a tecla
            e a resposta há um intervalo em que o texto na tela não corresponde
            ao formulário. Sem dizer isso, o médico leria como atual um laudo de
            dois segundos atrás — e no erro, um laudo de antes da falha.
          */}
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3">
            {hasSecondaryTools ? (
              <div className="flex flex-wrap items-center justify-end gap-2">{secondaryTools}</div>
            ) : null}

            {remoto && motor.erro ? (
              <p data-laudo-error className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <strong className="font-semibold">{composition ? 'O laudo associado não foi montado por inteiro.' : 'O laudo não foi montado.'}</strong>{' '}
                {motor.erro}
                {composition && composicao.componentesComFalha.length
                  ? ` Com falha: ${composition.components.filter((c) => composicao.componentesComFalha.includes(c.componentId)).map((c) => nameOf(c.categoryCode)).join(', ')}.`
                  : ''}
                {composition && composicao.conflitos.length
                  ? ` ${composicao.conflitos.map((c) => c.motivo).join(' · ')}`
                  : ''}
                {(composition ? composicao.texto : laudoCanonico.texto) ? ' O texto abaixo é de antes desta falha e não pode ser salvo.' : ''}
              </p>
            ) : null}

            {composition && composicao.blocks.length && !motor.erro ? (
              <details data-composition-provenance className="rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2 text-xs text-gray-600 dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:text-gray-300">
                <summary className="cursor-pointer font-semibold">Origem dos blocos do laudo</summary>
                <ul className="mt-2 space-y-1">
                  {composicao.blocks.map((block) => (
                    <li key={block.blockId} data-block-id={block.blockId} className="flex flex-wrap gap-1.5">
                      <span className="font-semibold">{{ title: 'Título', technique: 'Técnica', findings: 'Achados', conclusion: 'Conclusão' }[block.section]}</span>
                      <span>·</span>
                      <span>{block.structureCode === 'URINARY_BLADDER' ? 'Bexiga (compartilhada)' : block.categoryCodes.map((c) => nameOf(c)).join(' + ')}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <div className="laudo-frame relative flex min-h-0 overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-20px_rgba(15,23,42,0.22)] dark:border-white/[0.08] dark:bg-[#1C1C1E]">
              <LaudoPreview
                documentKey={documentKey}
                text={preview}
                saveState={saveState}
                saveError={saveError}
                onSave={onSave}
                workspaceV2={workspaceV2}
                editable={richEditor}
                editableHtml={documentHtml}
                formattedHtml={previewHtml}
                draftDirty={activeDraft.dirty}
                sourceChanged={sourceChanged}
                suggestionDiff={suggestionDiff}
                onDocumentChange={onDocumentChange}
                onResetDraft={resetDocumentDraft}
                onAcceptSuggestion={applyCurrentModel}
                onRejectSuggestion={rejectCurrentModel}
                canUndoSuggestion={canUndoSuggestion}
                onUndoSuggestion={undoAcceptedSuggestion}
                updating={remoto && (motor.carregando || motor.desatualizado)}
              />

            </div>
          </div>
        </div>
      </main>
      <CompanionPanel
        open={companionOpen}
        onClose={() => setCompanionOpen((open) => !open)}
        onStateChange={setCompanionState}
        onApplyText={(text) => setCompanionNotesByCategory((all) => ({
          ...all,
          [documentKey]: [...(all[documentKey] ?? []), text],
        }))}
        onApplyStructured={(payload: CompanionStructuredPayload) => {
          // O envio estruturado escreve no estado AVULSO da categoria. Numa
          // associação isso cairia fora dos componentes — e sumiria em silêncio.
          if (composition) {
            window.alert('O envio estruturado do celular não é aplicado a exames associados. Remova a associação para usá-lo.')
            return
          }
          if (payload.category === 'TIREOIDE') {
            setTireoideState((state) => applyCompanionThyroid(state, payload))
            selectCategory(TIREOIDE_ID)
            revealSection(TIREOIDE_ID, payload.data.thyroidNodules?.length ? 'nodulos' : 'lobo_direito')
            return
          }
          if (payload.category === 'MAMARIA') {
            setExamStates((all) => ({ ...all, MAMARIA: applyCompanionBreast(all.MAMARIA ?? {}, payload) }))
            selectCategory('MAMARIA')
            revealSection('MAMARIA', 'mamas')
            return
          }
          if (payload.category === 'DOPPLER_CAROTIDAS') {
            setExamStates((all) => ({ ...all, DOPPLER_CAROTIDAS: applyCompanionCarotids(all.DOPPLER_CAROTIDAS ?? {}, payload) }))
            selectCategory('DOPPLER_CAROTIDAS')
            revealSection('DOPPLER_CAROTIDAS', 'direita')
            return
          }
          // Peso/IG vindos do celular também invalidam percentil que não veio junto.
          setExamStates((all) => ({
            ...all,
            [payload.category]: invalidarPercentilManual(
              all[payload.category],
              applyCompanionStructured(all[payload.category] ?? {}, payload),
              companionReenviaPercentil(payload),
            ),
          }))
          selectCategory(payload.category)
          revealSection(payload.category, payload.category === 'DOPPLER_OBSTETRICO' ? 'doppler' : 'biometria')
        }}
      />
    </div>
    </>
  )
}
