'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clipboard, Save, ShieldCheck } from 'lucide-react'
import {
  evaluateHepaticConclusion,
  renderHepaticElastographyReport,
  renderHepaticMultiparametricReport,
  type HepaticAssessment,
} from '@laudousg/shared'
import { createClient } from '@/lib/supabase/client'
import {
  HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE,
  HEPATIC_WORKSPACE_CONFIGURATION,
  createInitialHepaticAssessment,
  hepaticModelName,
  hasApprovedHepaticQualityConfiguration,
  type HepaticWebModelCode,
} from '@/lib/hepaticModels'
import {
  canReleaseHepaticReport,
  hepaticReportPersisted,
  hepaticReportPersistenceFailed,
  hepaticReportReviewed,
  hepaticReportReviewFailed,
  initialHepaticReportFlow,
  invalidateHepaticReportFlow,
  persistHepaticReportDraft,
  reviewHepaticReport,
  startHepaticReportPersistence,
  startHepaticReportReview,
} from '@/lib/hepaticReportFlow'
import { HepaticAssessmentWorkspace } from './HepaticAssessmentWorkspace'

type Props = { category: HepaticWebModelCode; onBack: () => void }

function render(category: HepaticWebModelCode, value: HepaticAssessment) {
  return category === 'ELASTOGRAFIA_HEPATICA'
    ? renderHepaticElastographyReport(value)
    : renderHepaticMultiparametricReport(value)
}

export function HepaticReportWorkspace({ category, onBack }: Props) {
  const [value, setValue] = useState<HepaticAssessment>(() => createInitialHepaticAssessment(category))
  const [physicianId, setPhysicianId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [flow, setFlow] = useState(initialHepaticReportFlow)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const editRevision = useRef(0)

  useEffect(() => {
    let active = true
    createClient().auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (error || !data.user) setAuthError('Sessão expirada. Entre novamente.')
      else setPhysicianId(data.user.id)
    }).catch(() => { if (active) setAuthError('Não foi possível confirmar a sessão.') })
    return () => { active = false }
  }, [])

  const readiness = useMemo(() => evaluateHepaticConclusion(value), [value])
  const report = useMemo(() => {
    if (!readiness.canConclude) return ''
    try { return render(category, value) } catch { return '' }
  }, [category, readiness.canConclude, value])
  const released = canReleaseHepaticReport(flow)
  const visibleReport = flow.phase === 'editing' ? report : (flow.persisted?.generatedOutput ?? report)
  const busy = flow.phase === 'persisting' || flow.phase === 'reviewing'
  const lacksApprovedQualityRegistry = !hasApprovedHepaticQualityConfiguration(HEPATIC_WORKSPACE_CONFIGURATION)

  function updateValue(next: HepaticAssessment) {
    editRevision.current += 1
    setValue(next)
    setFlow((current) => invalidateHepaticReportFlow(current))
    setCopyState('idle')
  }

  async function persistDraft() {
    if (!report || !readiness.canConclude || flow.phase === 'persisting') return
    const startedAt = editRevision.current
    const startedFlow = startHepaticReportPersistence(flow)
    setFlow(startedFlow)
    try {
      const persisted = await persistHepaticReportDraft(value, flow.persisted)
      if (editRevision.current === startedAt) setFlow(hepaticReportPersisted(persisted))
    } catch (error) {
      if (editRevision.current === startedAt) setFlow(hepaticReportPersistenceFailed(startedFlow, error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.'))
    }
  }

  async function confirmReview() {
    if (!flow.persisted || flow.phase !== 'pending_review') return
    const startedAt = editRevision.current
    const reviewing = startHepaticReportReview(flow)
    setFlow(reviewing)
    try {
      await reviewHepaticReport(flow.persisted)
      if (editRevision.current === startedAt) setFlow(hepaticReportReviewed(reviewing))
    } catch (error) {
      if (editRevision.current === startedAt) setFlow(hepaticReportReviewFailed(reviewing, error instanceof Error ? error.message : 'Não foi possível confirmar a revisão.'))
    }
  }

  async function copyReport() {
    if (!released || !flow.persisted) return
    try { await navigator.clipboard.writeText(flow.persisted.generatedOutput); setCopyState('copied') }
    catch { setCopyState('error') }
  }

  return <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900"><ArrowLeft className="h-4 w-4" /> Exames</button>
        <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">Modelo hepático estruturado</p><h1 className="text-xl font-bold">{hepaticModelName(category)}</h1></div>
        <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Ativação conjunta pendente</span>
      </header>

      {authError ? <p role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{authError}</p> : null}
      {lacksApprovedQualityRegistry ? <section role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"><strong>Configuração técnica ainda pendente.</strong> Os métodos podem ser preenchidos, mas a conclusão permanece bloqueada até existir um critério de qualidade aprovado para o equipamento e a unidade usados. Nenhuma referência clínica foi presumida.</section> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(400px,.75fr)]">
        {physicianId ? <fieldset disabled={busy} className="min-w-0 disabled:opacity-70"><HepaticAssessmentWorkspace value={value} onChange={updateValue} physicianId={physicianId} configurations={HEPATIC_WORKSPACE_CONFIGURATION} integratedInterpretationReference={HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE} lockPurpose /></fieldset> : <div className="min-h-60 animate-pulse rounded-3xl bg-white dark:bg-gray-900" />}
        <aside className="xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prévia clínica</p>
            <h2 className="mt-1 font-bold">{released ? 'Laudo revisado e liberado' : flow.persisted ? 'Rascunho salvo · revisão pendente' : readiness.canConclude ? 'Laudo pronto para revisão' : 'Dados e revisões pendentes'}</h2>
            <pre className="mt-4 max-h-[62vh] min-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-gray-50 p-4 font-serif text-[14px] leading-relaxed dark:bg-gray-950">{visibleReport || 'A prévia será liberada quando os dados técnicos, o critério de qualidade aplicável e as interpretações médicas estiverem confirmados.'}</pre>
            {flow.error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{flow.error}</p> : null}
            {flow.phase === 'pending_review' ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Leia o texto persistido e confirme a revisão médica para liberar a cópia e o status pronto na Sala.</p> : null}
            {released ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Revisão vinculada ao texto e à revisão {flow.persisted?.contentRevision}. Laudo pronto para a Sala.</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!released} onClick={() => void copyReport()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-semibold disabled:opacity-40 dark:border-gray-700"><Clipboard className="h-4 w-4" />{copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'Falha ao copiar' : 'Copiar laudo'}</button>
              {(flow.phase === 'editing' || flow.phase === 'persisting') ? <button type="button" disabled={!report || flow.phase === 'persisting'} onClick={() => void persistDraft()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />{flow.phase === 'persisting' ? 'Salvando…' : flow.persisted ? 'Atualizar rascunho' : 'Gerar e salvar rascunho'}</button> : null}
              {(flow.phase === 'pending_review' || flow.phase === 'reviewing') && flow.persisted ? <button type="button" disabled={flow.phase === 'reviewing'} onClick={() => void confirmReview()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" />{flow.phase === 'reviewing' ? 'Confirmando…' : 'Confirmar revisão médica'}</button> : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  </main>
}
