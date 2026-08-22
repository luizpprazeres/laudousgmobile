'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Calculator, ChevronDown, Image, Mic, RotateCcw, Sparkles } from 'lucide-react'
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
  type TireoideState,
} from '@/lib/deterministic'
import { adaptarTireoide } from '@/lib/catalog/tireoideParaCatalogo'
import { adaptarPelve } from '@/lib/catalog/pelveParaCatalogo'
import { adaptarMamaria } from '@/lib/catalog/mamariaParaCatalogo'
import { adaptarObstetrica } from '@/lib/catalog/obstetricaParaCatalogo'
import { categoriaMigrada } from '@/lib/catalog/migradas'
import { useLaudoCanonico } from '@/lib/catalog/useLaudoCanonico'
import { tiRadsSpec } from '@/lib/calculators/specs'
import { CalcPanel } from './CalcPanel'
import { PreEclampsiaFmfPanel } from './PreEclampsiaFmfPanel'
import { ExamSectionNav } from './ExamSectionNav'
import { LaudarRail } from './LaudarRail'
import { lerAtual, lerDigitadoras, gravarAtual, type Digitadora } from '@/lib/digitadoras'
import { LaudoPreview } from './LaudoPreview'
import { saveWebReport } from '@/lib/webReports'
import { categoryCompactName, categoryDotClass } from './categoryPresentation'
import { WorkspaceInputDock } from './WorkspaceInputDock'
import { diffReportBlocks } from './reportSuggestion'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
import { OrganFormPanel } from './OrganFormPanel'
import { TireoideFormPanel } from './TireoideFormPanel'

const TIREOIDE_ID = 'TIREOIDE'
type UiSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

const TIREOIDE_CATEGORY = {
  id: TIREOIDE_ID,
  name: 'Tireoide',
}

type LaudarWebExperienceProps = {
  workspaceV2?: boolean
  richEditor?: boolean
  agentWorkspace?: boolean
}

type ReportDraft = {
  text: string
  sourceText: string
  dirty: boolean
}

type UndoSnapshot = {
  previousText: string
  appliedText: string
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
            {category.name}
          </option>
        ))}
        <option value={TIREOIDE_ID}>Tireoide</option>
      </select>
      {compact ? <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${categoryDotClass(categoria)}`} /> : null}
      <span className="truncate">{compact ? categoryCompactName(categoria, currentName) : currentName}</span>
      <ChevronDown className={`absolute right-3 ${compact ? 'h-3.5 w-3.5 text-gray-400' : 'h-4 w-4'}`} />
    </label>
  )
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

export function LaudarWebExperience({ workspaceV2 = false, richEditor = false, agentWorkspace = false }: LaudarWebExperienceProps) {
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
    return null
  }, [categoria, examStates, isTireoide, tireoideState])

  const laudoCanonico = useLaudoCanonico(categoria, achadosCanonicos, migrada)

  const generatedText = useMemo(() => {
    if (migrada) return laudoCanonico.texto
    const cat = CATEGORIES[categoria]
    return cat ? composeReport(cat, examStates[categoria]).text : ''
  }, [categoria, examStates, migrada, laudoCanonico.texto])

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
  const calculatorBlocks = calculatorBlocksByCategory[categoria] ?? {}
  const composedText = useMemo(
    () => [generatedText, ...Object.values(calculatorBlocks)].filter(Boolean).join('\n\n'),
    [calculatorBlocks, generatedText]
  )
  const insertCalculatorBlock = (calculatorId: string, block: string) => {
    setCalculatorBlocksByCategory((all) => ({
      ...all,
      [categoria]: { ...(all[categoria] ?? {}), [calculatorId]: block },
    }))
  }
  const removeCalculatorBlock = (calculatorId: string) => {
    setCalculatorBlocksByCategory((all) => {
      const current = { ...(all[categoria] ?? {}) }
      delete current[calculatorId]
      return { ...all, [categoria]: current }
    })
  }

  // O texto manual é preservado por categoria. Enquanto o usuário não editar,
  // os controles determinísticos continuam atualizando o documento ao vivo.
  // Depois da primeira edição, uma nova composição nunca sobrescreve o rascunho.
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({})
  const [undoByCategory, setUndoByCategory] = useState<Record<string, UndoSnapshot | undefined>>({})
  const storedDraft = reportDrafts[categoria]
  const activeDraft: ReportDraft = storedDraft ?? {
    text: composedText,
    sourceText: composedText,
    dirty: false,
  }
  const documentText = richEditor && activeDraft.dirty ? activeDraft.text : composedText
  const sourceChanged = richEditor && activeDraft.dirty && activeDraft.sourceText !== composedText
  const suggestionDiff = useMemo(
    () => sourceChanged ? diffReportBlocks(documentText, composedText) : null,
    [composedText, documentText, sourceChanged]
  )
  const onDocumentChange = (text: string) => {
    setUndoByCategory((undo) => ({ ...undo, [categoria]: undefined }))
    setReportDrafts((drafts) => {
      const sourceText = drafts[categoria]?.dirty ? drafts[categoria].sourceText : composedText
      return {
        ...drafts,
        [categoria]: {
          text,
          sourceText,
          dirty: text !== sourceText,
        },
      }
    })
  }
  const applyCurrentModel = () => {
    setUndoByCategory((undo) => ({
      ...undo,
      [categoria]: { previousText: documentText, appliedText: composedText },
    }))
    setReportDrafts((drafts) => ({
      ...drafts,
      [categoria]: { text: composedText, sourceText: composedText, dirty: false },
    }))
  }
  const resetDocumentDraft = () => {
    if (activeDraft.dirty && typeof window !== 'undefined') {
      const confirmed = window.confirm('Substituir a edição manual pelo modelo gerado a partir dos campos atuais?')
      if (!confirmed) return
    }
    applyCurrentModel()
  }
  const rejectCurrentModel = () => {
    setReportDrafts((drafts) => {
      const current = drafts[categoria] ?? activeDraft
      return {
        ...drafts,
        [categoria]: {
          text: current.text,
          sourceText: composedText,
          dirty: current.text !== composedText,
        },
      }
    })
  }
  const undoAcceptedSuggestion = () => {
    const snapshot = undoByCategory[categoria]
    if (!snapshot || snapshot.appliedText !== composedText || documentText !== composedText) return
    setReportDrafts((drafts) => ({
      ...drafts,
      [categoria]: {
        text: snapshot.previousText,
        sourceText: composedText,
        dirty: snapshot.previousText !== composedText,
      },
    }))
    setUndoByCategory((undo) => ({ ...undo, [categoria]: undefined }))
  }
  const undoSnapshot = undoByCategory[categoria]
  const canUndoSuggestion = Boolean(
    undoSnapshot &&
    undoSnapshot.appliedText === composedText &&
    documentText === composedText
  )
  const preview = useMemo(
    () => appendInitials(documentText, initials || undefined),
    [documentText, initials]
  )

  // Persistência real (S9) — substitui o status falso. Volta a "idle" quando o
  // laudo muda (o salvo anterior fica desatualizado).
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  useEffect(() => {
    setSaveState('idle')
    setSaveError(null)
  }, [preview])
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
  const laudoNaoConfere =
    migrada && !activeDraft.dirty && (laudoCanonico.carregando || laudoCanonico.desatualizado || laudoCanonico.erro !== null)

  const onSave = async () => {
    if (laudoNaoConfere) {
      setSaveState('error')
      setSaveError(
        laudoCanonico.erro
          ? 'O laudo não foi montado — não dá para salvar o texto anterior como se fosse este exame.'
          : 'Espere o laudo terminar de montar: o texto na tela ainda é o anterior.',
      )
      return
    }
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
    <div className={`min-h-screen overflow-hidden text-gray-900 dark:text-gray-100 ${workspaceV2 ? 'bg-[#F2F2F7] p-2 dark:bg-[#0B0B0F]' : 'bg-gray-100 dark:bg-gray-950'}`}>
      <header className={workspaceV2
        ? 'sticky top-0 z-40 flex h-[76px] items-center gap-3 bg-transparent px-2'
        : 'sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/70 px-5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/70'}>
        {workspaceV2 ? (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-end gap-2">
              <div className="flex items-end gap-0.5 font-barlow text-[19px] leading-none tracking-tight">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300">Laudo</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">USG</span>
              </div>
              <span className="font-barlow text-xs font-medium text-gray-400 dark:text-gray-500">Web</span>
            </div>
            <CategorySelector
              categoria={categoria}
              currentName={currentCategory.name}
              compact
              onChange={setCategoria}
            />
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 font-barlow text-[22px] leading-none tracking-tight">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-500">Laudo</span>
              <span className="font-normal text-emerald-600 dark:text-emerald-400">USG</span>
              <span className="mb-1 ml-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
            <span className="font-barlow text-base font-medium text-gray-500 dark:text-gray-400">Web</span>
            <CategorySelector
              categoria={categoria}
              currentName={currentCategory.name}
              compact={false}
              onChange={setCategoria}
            />
          </>
        )}

        {isTireoide ? (
          <ToolbarPill
            tone={tireoideState.doppler ? 'toggleOn' : 'neutral'}
            onClick={() => setTireoideState((state) => ({ ...state, doppler: !state.doppler }))}
          >
            Doppler
          </ToolbarPill>
        ) : null}

        {!workspaceV2 ? (
          <>
            <ToolbarPill><Calculator className="h-4 w-4" />Cálculos</ToolbarPill>
            <ToolbarPill><Mic className="h-4 w-4" />Ditar</ToolbarPill>
            <ToolbarPill><Image className="h-4 w-4" />Imagem</ToolbarPill>
            <ToolbarPill tone="purple">Múltiplos</ToolbarPill>
          </>
        ) : null}
        <div className="flex-1" />

        {/*
          QUEM DIGITOU — a escolha vive aqui, junto da categoria, porque é
          decisão de antes de escrever. Some quando não há ninguém cadastrado:
          um seletor vazio é ruído para quem digita os próprios laudos.
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
              className="h-8 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 outline-none transition hover:bg-gray-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus:ring-emerald-900/40"
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

        {!workspaceV2 ? <ToolbarPill tone="primary"><Sparkles className="h-4 w-4" />Gerar com IA</ToolbarPill> : null}
      </header>

      <main className={`relative ${workspaceV2 ? 'h-[calc(100vh-92px)]' : 'h-[calc(100vh-64px)]'}`}>
        <LaudarRail workspaceV2={workspaceV2} />
        <div className={workspaceV2
          ? 'ml-14 grid h-full grid-cols-[142px_minmax(330px,0.88fr)_minmax(420px,1.32fr)] gap-2'
          : 'ml-16 grid h-full grid-cols-[196px_minmax(420px,1fr)_minmax(460px,1fr)]'}>
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
            workspaceV2={workspaceV2}
          />

          <section className={`min-h-0 ${workspaceV2 ? 'flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]' : 'overflow-y-auto bg-gray-50 dark:bg-gray-900'}`}>
            <div className={workspaceV2
              ? 'sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-gray-800 dark:bg-[#1C1C1E]/95'
              : 'border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950'}>
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

            <div className={workspaceV2 ? 'min-h-0 flex-1 overflow-y-auto px-3 py-2.5' : 'px-6 py-5'}>
              {activeSection?.id?.startsWith('calc:') ? (
                (() => {
                  const spec = calculators.find((c) => `calc:${c.id}` === activeSection.id)
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
                  return <CalcPanel spec={spec} examState={isTireoide ? undefined : examState} />
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
                  compact={workspaceV2}
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

            {workspaceV2 && agentWorkspace ? (
              <WorkspaceInputDock
                canGoPrevious={Boolean(previous && previous.id !== activeSection?.id)}
                canGoNext={Boolean(next && next.id !== activeSection?.id)}
                onPrevious={() => previous && setActiveSectionId(previous.id)}
                onNext={() => next && setActiveSectionId(next.id)}
                hasPendingSuggestion={sourceChanged}
                canUndoSuggestion={canUndoSuggestion}
                onAcceptSuggestion={applyCurrentModel}
                onRejectSuggestion={rejectCurrentModel}
                onUndoSuggestion={undoAcceptedSuggestion}
              />
            ) : (
              <footer className={`sticky bottom-0 flex items-center gap-3 border-t backdrop-blur-xl ${workspaceV2 ? 'border-gray-100 bg-white/95 px-4 py-3 dark:border-gray-800 dark:bg-[#1C1C1E]/95' : 'border-gray-200 bg-white/90 px-7 py-4 dark:border-gray-800 dark:bg-gray-950/90'}`}>
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
            )}
          </section>

          {/*
            O ESTADO DO MOTOR, acima do laudo.
            
            As categorias migradas vêm do renderer, e isso é assíncrono: entre a tecla
            e a resposta há um intervalo em que o texto na tela não corresponde
            ao formulário. Sem dizer isso, o médico leria como atual um laudo de
            dois segundos atrás — e no erro, um laudo de antes da falha.
          */}
          {migrada && (laudoCanonico.erro || laudoCanonico.desatualizado) ? (
            <p
              className={`mb-2 rounded-xl px-3.5 py-2 text-xs ${
                laudoCanonico.erro
                  ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                  : 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200'
              }`}
            >
              {laudoCanonico.erro ? (
                <>
                  <strong className="font-semibold">O laudo não foi montado.</strong>{' '}
                  {laudoCanonico.erro}
                  {laudoCanonico.texto ? ' O texto abaixo é de antes desta falha.' : ''}
                </>
              ) : (
                <>Montando o laudo com o que você mudou — o texto abaixo ainda é o anterior.</>
              )}
            </p>
          ) : null}

          <LaudoPreview
            documentKey={categoria}
            text={preview}
            saveState={saveState}
            saveError={saveError}
            onSave={onSave}
            workspaceV2={workspaceV2}
            editable={workspaceV2 && richEditor}
            editableText={documentText}
            draftDirty={activeDraft.dirty}
            sourceChanged={sourceChanged}
            suggestionDiff={suggestionDiff}
            onTextChange={onDocumentChange}
            onResetDraft={resetDocumentDraft}
            onAcceptSuggestion={applyCurrentModel}
            onRejectSuggestion={rejectCurrentModel}
            canUndoSuggestion={canUndoSuggestion}
            onUndoSuggestion={undoAcceptedSuggestion}
          />
        </div>
      </main>
    </div>
  )
}
