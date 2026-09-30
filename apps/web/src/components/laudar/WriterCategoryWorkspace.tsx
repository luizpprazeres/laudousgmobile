'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { TireoideState } from '@/lib/deterministic'
import type { SanityResult } from '@laudousg/shared'
import { createClient } from '@/lib/supabase/client'
import { WRITER_CATEGORY_OPTIONS, writerCategoryName, type WriterCategory } from '@/lib/writerCategories'
import { generateWriterReport } from '@/lib/writerGeneration'
import { clarifyIsAnswered, initialWriterFlow, writerFlowReducer } from '@/lib/writerFlow'
import { questionsFromPendingClarify, type PendingWriterReport } from '@/lib/writerPendingClarify'
import { VisualSchemaPanel } from '@/components/visualSchemas/VisualSchemaPanel'

type Props = { category: WriterCategory; onBack: () => void }
export function WriterCategoryWorkspace({ category, onBack }: Props) {
  const [flow, dispatch] = useReducer(writerFlowReducer, initialWriterFlow)
  const [rawInput, setRawInput] = useState('')
  const [finalDraft, setFinalDraft] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [mapOpen, setMapOpen] = useState(false)
  const [pendingReports, setPendingReports] = useState<PendingWriterReport[]>([])
  const [pendingLoadState, setPendingLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const controllerRef = useRef<AbortController | null>(null)
  const finalDraftRef = useRef('')
  const option = WRITER_CATEGORY_OPTIONS.find((entry) => entry.id === category)!
  const completedReportId = flow.kind === 'done' ? flow.reportId : null
  const completedText = flow.kind === 'done' ? flow.text : null
  const completedVenousMap = flow.kind === 'done' ? flow.venousMap : undefined

  useEffect(() => {
    if (!completedReportId || completedText === null) return
    setFinalDraft(completedText)
    finalDraftRef.current = completedText
    if (!completedText.trim()) {
      setSaveState('error')
      setSaveMessage('O gerador encerrou sem texto final. O registro permanece no Histórico para conferência.')
      return
    }
    setSaveState('idle')
    setSaveMessage('Revise o texto e salve a versão final quando estiver de acordo.')
  }, [completedReportId, completedText])

  useEffect(() => {
    if (completedVenousMap) setMapOpen(true)
  }, [completedVenousMap])

  useEffect(() => () => {
    controllerRef.current?.abort()
  }, [])

  useEffect(() => {
    let cancelled = false
    setPendingLoadState('loading')
    const supabase = createClient()
    void supabase.from('reports').select('id, raw_input, generation_metadata, updated_at')
      .eq('category_code', category).eq('status', 'awaiting_clarify')
      .order('updated_at', { ascending: false }).limit(10)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setPendingReports([])
          setPendingLoadState('error')
          return
        }
        const resumable = (data ?? []).flatMap((row) => {
          const questions = questionsFromPendingClarify(row.generation_metadata)
          if (!questions || typeof row.raw_input !== 'string' || typeof row.updated_at !== 'string') return []
          return [{ id: row.id, rawInput: row.raw_input, updatedAt: row.updated_at, questions }]
        })
        setPendingReports(resumable)
        setPendingLoadState('ready')
      })
    return () => { cancelled = true }
  }, [category])

  async function run(resume?: Extract<typeof flow, { kind: 'clarifying' }>) {
    const text = rawInput.trim()
    if (text.length < 2) return
    if (resume && !clarifyIsAnswered(resume)) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    dispatch({ type: 'start', expectedReportId: resume?.reportId })
    let terminal = false
    try {
      const request = {
        raw_input: text,
        category_hint: category,
        ...(resume ? {
          resume_from_report_id: resume.reportId,
          clarify_answers: resume.questions.map((question) => ({ question_id: question.id, answer: resume.answers[question.id]!.trim() })),
        } : {}),
      }
      for await (const event of generateWriterReport(request, controller.signal)) {
        if (event.type === 'done' || event.type === 'clarify' || event.type === 'blocked' || event.type === 'error') terminal = true
        if (event.type === 'scheme' && category !== 'DOPPLER_VENOSO_MMII') continue
        dispatch({ type: 'event', event })
      }
      if (!terminal) dispatch({ type: 'error', message: 'A conexão terminou sem resultado final. Confira o Histórico antes de reenviar para evitar duplicidade.' })
    } catch (error) {
      if (controller.signal.aborted) return
      dispatch({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível gerar o laudo.' })
    }
  }

  async function saveEdit() {
    if (flow.kind !== 'done' || !flow.reportId || !finalDraft.trim()) return
    setSaveState('saving')
    setSaveMessage('')
    try {
      await saveReportOutput(flow.reportId, finalDraft)
      if (finalDraftRef.current === finalDraft) {
        setSaveState('saved')
        setSaveMessage('Edição salva no relatório original.')
      } else {
        setSaveState('idle')
        setSaveMessage('O texto mudou durante o salvamento. Salve novamente.')
      }
    } catch (error) {
      setSaveState('error')
      setSaveMessage(error instanceof Error ? error.message : 'Não foi possível salvar a edição.')
    }
  }

  const isWorking = flow.kind === 'generating'
  return <main className="mx-auto min-h-screen w-full max-w-5xl bg-gray-50 px-4 py-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
    <header className="mb-5 flex items-center gap-3">
      <button type="button" onClick={onBack} disabled={isWorking} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"><ArrowLeft className="h-4 w-4" /> Exames</button>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Caminho por texto</p><h1 className="truncate text-xl font-bold">{option.name}</h1></div>
    </header>

    {flow.kind === 'ready' || flow.kind === 'error' ? <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <label htmlFor="writer-findings" className="block text-sm font-semibold">Achados do exame</label>
      <p className="mt-1 text-sm text-gray-500">Digite os achados observados ou use o ditado do teclado neste campo. O navegador envia somente o texto, não o áudio.</p>
      <textarea id="writer-findings" value={rawInput} onChange={(event) => setRawInput(event.target.value)} maxLength={20_000} rows={8}
        placeholder="Digite ou cole o ditado do exame…" className="mt-3 min-h-44 w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-sm leading-relaxed outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-emerald-900/40" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={rawInput.trim().length < 2} onClick={() => void run()} className="ml-auto min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50">Gerar laudo</button>
      </div>
      {saveMessage && saveState === 'error' ? <p role="status" className="mt-2 text-xs text-rose-700">{saveMessage}</p> : null}
      {pendingLoadState === 'loading' ? <p role="status" className="mt-4 text-xs text-gray-500">Verificando esclarecimentos pendentes…</p> : null}
      {pendingLoadState === 'error' ? <p role="status" className="mt-4 text-xs text-gray-500">Não foi possível carregar esclarecimentos pendentes. Você ainda pode iniciar um novo laudo.</p> : null}
      {pendingReports.length ? <section aria-labelledby="writer-pending-title" data-pending-clarify-list className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
        <h2 id="writer-pending-title" className="text-sm font-semibold">Retomar esclarecimento</h2>
        <p className="mt-1 text-xs text-gray-500">Continue uma tentativa já iniciada. Ela manterá o ID original do relatório.</p>
        <ul className="mt-2 space-y-2">{pendingReports.map((pending) => <li key={pending.id}>
          <button type="button" onClick={() => {
            setRawInput(pending.rawInput)
            finalDraftRef.current = ''
            dispatch({ type: 'resumePending', reportId: pending.id, questions: pending.questions })
          }} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 text-left text-sm hover:border-emerald-500 dark:border-gray-700">
            <span>Laudo iniciado em {new Date(pending.updatedAt).toLocaleString('pt-BR')}</span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Retomar</span>
          </button>
        </li>)}</ul>
      </section> : null}
      {flow.kind === 'error' ? <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{flow.message}</p> : null}
    </section> : null}

    {flow.kind === 'generating' ? <section aria-live="polite" data-writer-state="generating" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-semibold">Gerando com o serviço clínico da categoria…</p>
      {flow.partial ? <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{flow.partial}</pre> : null}
      <button type="button" onClick={() => {
        controllerRef.current?.abort()
        dispatch({ type: 'error', message: 'Conexão cancelada. O serviço pode já ter criado o relatório; confira o Histórico antes de enviar outra vez.' })
      }} className="mt-4 min-h-10 rounded-full border border-gray-200 px-4 text-sm dark:border-gray-700">Cancelar conexão</button>
    </section> : null}

    {flow.kind === 'clarifying' ? <section data-writer-state="clarify" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
      <h2 className="font-semibold">O gerador precisa esclarecer</h2>
      {flow.questions.map((question) => <label key={question.id} className="block text-sm font-medium">
        {question.question}
        {question.choices?.length || question.expects === 'yesno' ? <select value={flow.answers[question.id] ?? ''} onChange={(event) => dispatch({ type: 'answer', id: question.id, value: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900">
          <option value="">Escolha uma resposta</option>{(question.choices?.length ? question.choices : ['Sim', 'Não']).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select> : <input type={question.expects === 'number' ? 'text' : 'text'} inputMode={question.expects === 'number' ? 'decimal' : undefined} value={flow.answers[question.id] ?? ''} onChange={(event) => dispatch({ type: 'answer', id: question.id, value: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900" />}
      </label>)}
      <button type="button" disabled={!clarifyIsAnswered(flow)} onClick={() => void run(flow)} className="min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50">Continuar no mesmo laudo</button>
    </section> : null}

    {flow.kind === 'blocked' ? <section role="alert" data-writer-state="blocked" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
      <h2 className="font-semibold">Geração bloqueada para revisão</h2><p className="mt-1">{flow.reason}</p>
      {flow.sanity?.issues.length ? <ul className="mt-3 list-inside list-disc">{flow.sanity.issues.map((issue, index) => <li key={`${issue.type}-${index}`}>{issue.detail}</li>)}</ul> : null}
      <p className="mt-3 text-xs">A tentativa mantém o mesmo ID do gerador; uma retomada após esclarecimento não cria outro relatório.</p>
    </section> : null}

    {flow.kind === 'done' ? <section data-writer-state="done" className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <label htmlFor="writer-final" className="block text-sm font-semibold">Laudo gerado · revise antes de salvar a versão final</label>
        <textarea id="writer-final" value={finalDraft} onChange={(event) => { finalDraftRef.current = event.target.value; setFinalDraft(event.target.value); setSaveState('idle') }} rows={14} className="mt-3 min-h-64 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm leading-relaxed outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-emerald-900/40" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void saveEdit()} disabled={saveState === 'saving' || saveState === 'saved'} className="min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Salvo' : 'Salvar edição'}</button>
          <p role={saveState === 'error' ? 'alert' : 'status'} className="text-xs text-gray-500">{saveMessage}</p>
        </div>
        {flow.sanity ? <SanityNotice result={flow.sanity} /> : null}
      </section>
      {flow.venousMap ? <section aria-label="Mapa venoso recebido do gerador" data-venous-map-received="true">
        {mapOpen ? <VisualSchemaPanel category="VENOUS" breastState={{}} fetalState={{}} thyroidState={{} as TireoideState} venousMap={flow.venousMap}
          onBreastChange={() => undefined} onThyroidChange={() => undefined} onClose={() => setMapOpen(false)} embedded />
          : <button type="button" onClick={() => setMapOpen(true)} className="mt-2 min-h-10 rounded-full border border-gray-200 px-4 text-sm dark:border-gray-700">Abrir cartografia</button>}
      </section> : category === 'DOPPLER_VENOSO_MMII' ? <p role="status" data-venous-map-received="false" className="rounded-xl bg-gray-100 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">Nenhuma cartografia válida foi recebida para este relatório.</p> : null}
      <p className="text-xs text-gray-500">Relatório {flow.reportId} · {writerCategoryName(category)} · origem única: Histórico de laudos IA.</p>
    </section> : null}
  </main>
}

function SanityNotice({ result }: { result: SanityResult }) {
  if (result.verdict === 'ok' && result.issues.length === 0) return <p role="status" className="mt-3 text-xs text-emerald-700">Verificação automática concluída sem apontamentos.</p>
  return <section role="status" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
    <p className="font-semibold">Revise os apontamentos antes de finalizar.</p><p className="mt-1">{result.summary}</p>
    {result.issues.length ? <ul className="mt-2 list-inside list-disc">{result.issues.map((issue, index) => <li key={`${issue.type}-${index}`}>{issue.detail}</li>)}</ul> : null}
  </section>
}

async function saveReportOutput(reportId: string, finalOutput: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('reports').update({ final_output: finalOutput, updated_at: new Date().toISOString() })
    .eq('id', reportId).select('id')
  if (error || data?.length !== 1) throw new Error(error?.message ?? 'O relatório não foi atualizado; não criei outro registro.')
}
