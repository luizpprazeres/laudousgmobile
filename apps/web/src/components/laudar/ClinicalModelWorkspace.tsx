'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, Save, ShieldCheck } from 'lucide-react'
import {
  createInitialClinicalModelInput,
  calculateGrafSuggestion,
  renderClinicalModelReport,
  validateClinicalModelInput,
  type AbdomenTotalDopplerInput,
  type ClinicalModelCode,
  type ClinicalModelInput,
  type DopplerArterialMmssInput,
  type DopplerVenosoMmssInput,
  type QuadrilInfantilInput,
  type ThoraxInput,
} from '@laudousg/shared'
import { clinicalModelName } from '@/lib/clinicalModels'
import {
  canReleaseClinicalReport,
  clinicalReportPersisted,
  clinicalReportPersistenceFailed,
  clinicalReportReviewed,
  clinicalReportReviewFailed,
  initialClinicalReportFlow,
  invalidateClinicalReportFlow,
  persistClinicalReportDraft,
  reviewClinicalReport,
  startClinicalReportPersistence,
  startClinicalReportReview,
} from '@/lib/clinicalReportFlow'

type Props = { category: ClinicalModelCode; onBack: () => void }

export function ClinicalModelWorkspace({ category, onBack }: Props) {
  const [value, setValue] = useState<ClinicalModelInput>(() => createInitialClinicalModelInput(category))
  const [flow, setFlow] = useState(initialClinicalReportFlow)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const editRevision = useRef(0)
  const updateValue = (next: ClinicalModelInput) => {
    editRevision.current += 1
    setValue({ ...next, physicianReviewed: false } as ClinicalModelInput)
    setFlow(invalidateClinicalReportFlow())
    setCopyState('idle')
  }
  const validation = useMemo(() => validateClinicalModelInput(value, { requirePhysicianReview: false }), [value])
  const report = useMemo(() => {
    if (!validation.success) return ''
    try { return renderClinicalModelReport(validation.data) } catch { return '' }
  }, [validation])
  const released = canReleaseClinicalReport(flow)
  const visibleReport = flow.persisted?.generatedOutput ?? report

  async function copyReport() {
    if (!released || !flow.persisted) return
    try { await navigator.clipboard.writeText(flow.persisted.generatedOutput); setCopyState('copied') } catch { setCopyState('error') }
  }

  async function persistDraft() {
    if (!report || !validation.success || flow.phase === 'persisting') return
    const startedAtRevision = editRevision.current
    setFlow(startClinicalReportPersistence())
    try {
      const persisted = await persistClinicalReportDraft({ ...validation.data, physicianReviewed: false } as ClinicalModelInput)
      if (editRevision.current === startedAtRevision) setFlow(clinicalReportPersisted(persisted))
    } catch (error) {
      if (editRevision.current === startedAtRevision) setFlow(clinicalReportPersistenceFailed(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.'))
    }
  }

  async function confirmReview() {
    if (!flow.persisted || flow.phase !== 'pending_review') return
    const startedAtRevision = editRevision.current
    const reviewing = startClinicalReportReview(flow)
    setFlow(reviewing)
    try {
      await reviewClinicalReport(flow.persisted)
      if (editRevision.current === startedAtRevision) setFlow(clinicalReportReviewed(reviewing))
    } catch (error) {
      if (editRevision.current === startedAtRevision) setFlow(clinicalReportReviewFailed(reviewing, error instanceof Error ? error.message : 'Não foi possível confirmar a revisão médica.'))
    }
  }

  return <main className="min-h-screen bg-gray-50 px-4 py-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900"><ArrowLeft className="h-4 w-4" /> Exames</button>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">Modelo clínico estruturado</p><h1 className="truncate text-xl font-bold">{clinicalModelName(category)}</h1></div>
        <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Ativação conjunta pendente</span>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)]">
        <section className="space-y-4">
          {category === 'ABDOMEN_TOTAL_DOPPLER' ? <AbdomenForm value={value as AbdomenTotalDopplerInput} onChange={updateValue} /> : null}
          {category === 'DOPPLER_VENOSO_MMSS' ? <VenousForm value={value as DopplerVenosoMmssInput} onChange={updateValue} /> : null}
          {category === 'DOPPLER_ARTERIAL_MMSS' ? <ArterialForm value={value as DopplerArterialMmssInput} onChange={updateValue} /> : null}
          {category === 'TORAX' ? <ThoraxForm value={value as ThoraxInput} onChange={updateValue} /> : null}
          {category === 'QUADRIL_INFANTIL' ? <HipForm value={value as QuadrilInfantilInput} onChange={updateValue} /> : null}
        </section>

        <aside className="xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prévia clínica</p><h2 className="mt-1 font-bold">{released ? 'Laudo revisado e liberado' : flow.persisted ? 'Rascunho salvo · revisão pendente' : 'Laudo pronto para revisão'}</h2></div>{released ? <ShieldCheck className="h-6 w-6 text-emerald-600" /> : validation.success ? <CheckCircle2 className="h-6 w-6 text-amber-500" /> : null}</div>
            {!validation.success ? <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"><p className="font-semibold">Complete os campos clínicos antes de gerar:</p><ul className="mt-2 list-inside list-disc space-y-1">{validation.issues.map((entry, index) => <li key={`${entry.code}-${index}`}>{entry.message}</li>)}</ul></div> : null}
            {validation.success && validation.issues.length ? <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">{validation.issues.map((entry) => entry.message).join(' ')}</div> : null}
            <pre className="mt-4 max-h-[62vh] min-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-gray-50 p-4 font-serif text-[14px] leading-relaxed dark:bg-gray-950">{visibleReport || 'A prévia será liberada quando todos os bloqueios clínicos forem resolvidos.'}</pre>
            {flow.error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{flow.error}</p> : null}
            {flow.phase === 'pending_review' ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">O rascunho foi persistido como revisão {flow.persisted?.contentRevision}. Leia o texto acima e confirme a revisão médica para liberar a cópia e o status pronto na Sala.</p> : null}
            {released ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">Revisão vinculada ao texto e à revisão {flow.persisted?.contentRevision}. Cópia liberada e laudo sinalizado como revisado para a Sala.</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!released} onClick={() => void copyReport()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-semibold disabled:opacity-40 dark:border-gray-700"><Clipboard className="h-4 w-4" /> {copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'Não foi possível copiar' : 'Copiar laudo'}</button>
              {!flow.persisted ? <button type="button" disabled={!report || flow.phase === 'persisting'} onClick={() => void persistDraft()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> {flow.phase === 'persisting' ? 'Salvando rascunho…' : 'Gerar e salvar rascunho'}</button> : null}
              {flow.persisted && !released ? <button type="button" disabled={flow.phase === 'reviewing'} onClick={() => void confirmReview()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" /> {flow.phase === 'reviewing' ? 'Confirmando revisão…' : 'Confirmar revisão médica'}</button> : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  </main>
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"><h2 className="mb-4 text-base font-bold">{title}</h2><div className="grid gap-3 sm:grid-cols-2">{children}</div></section>
}
function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</span>{children}</label>
}
const control = 'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-emerald-900/40'
function NumberInput({ value, onChange, placeholder }: { value?: number; onChange: (value: number | undefined) => void; placeholder?: string }) {
  return <input className={control} type="number" inputMode="decimal" value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} />
}
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) { return <select className={control} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select> }
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) { return <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3 text-sm font-medium dark:border-gray-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />{label}</label> }

function AbdomenForm({ value, onChange }: { value: AbdomenTotalDopplerInput; onChange: (value: ClinicalModelInput) => void }) {
  const set = (patch: Partial<AbdomenTotalDopplerInput>) => onChange({ ...value, ...patch })
  return <>
    <Card title="Veia porta · preenchimento obrigatório">
      <Field label="Calibre (cm)"><NumberInput value={value.portalVein.caliberCm} onChange={(caliberCm) => set({ portalVein: { ...value.portalVein, caliberCm } })} /></Field>
      <Field label="Velocidade (cm/s)"><NumberInput value={value.portalVein.velocityCms} onChange={(velocityCms) => set({ portalVein: { ...value.portalVein, velocityCms } })} /></Field>
      <Field label="Direção do fluxo"><Select value={value.portalVein.flow ?? ''} onChange={(flow) => set({ portalVein: { ...value.portalVein, flow: flow ? flow as NonNullable<AbdomenTotalDopplerInput['portalVein']['flow']> : undefined } })}><option value="">Selecione</option><option value="hepatopetal">Hepatopetal</option><option value="hepatofugal">Hepatofugal</option><option value="ausente">Ausente</option><option value="outro">Outro</option></Select></Field>
      <Field label="Documentação fotográfica"><Select value={value.documentationPhoto} onChange={(documentationPhoto) => set({ documentationPhoto: documentationPhoto as 'include' | 'omit' })}><option value="include">Incluir frase configurável</option><option value="omit">Omitir</option></Select></Field>
    </Card>
    <Card title="Descrição completa do abdome"><Field label="Modelo-base normal do formulário canônico" wide><textarea className={`${control} min-h-40 py-3`} value={value.abdomenReport} onChange={(event) => set({ abdomenReport: event.target.value })} /></Field></Card>
    <Card title="Vasos opcionais · aparecem quando avaliados">{([
      ['hepaticVeins', 'Veias hepáticas'], ['splenicVein', 'Veia esplênica'], ['superiorMesentericVein', 'Veia mesentérica superior'], ['commonHepaticArtery', 'Artéria hepática comum'],
    ] as const).map(([key, label]) => {
      const vessel = value[key]
      return <div key={key} className="rounded-2xl border border-gray-200 p-3 dark:border-gray-700 sm:col-span-2"><Toggle label={label} checked={vessel.evaluated} onChange={(evaluated) => set({ [key]: evaluated ? { evaluated: true } : { evaluated: false } } as Partial<AbdomenTotalDopplerInput>)} />{vessel.evaluated ? <div className="mt-3 grid gap-3 sm:grid-cols-3"><NumberInput value={vessel.caliberCm} onChange={(caliberCm) => set({ [key]: { ...vessel, caliberCm } } as Partial<AbdomenTotalDopplerInput>)} placeholder="Calibre cm" /><NumberInput value={vessel.velocityCms} onChange={(velocityCms) => set({ [key]: { ...vessel, velocityCms } } as Partial<AbdomenTotalDopplerInput>)} placeholder="Velocidade cm/s" /><Select value={vessel.flow ?? ''} onChange={(flow) => set({ [key]: { ...vessel, flow: flow || undefined } } as Partial<AbdomenTotalDopplerInput>)}><option value="">Fluxo</option><option value="hepatopetal">Hepatopetal</option><option value="hepatofugal">Hepatofugal</option><option value="ausente">Ausente</option><option value="outro">Outro</option></Select></div> : null}</div>
    })}</Card>
    <Card title="Conclusão portal · exige critérios completos">
      <Field label="Situação"><Select value={value.portalPathology.status} onChange={(status) => set({ portalPathology: { status: status as AbdomenTotalDopplerInput['portalPathology']['status'], physicianConfirmed: status === 'absent' } })}><option value="absent">Sem alteração portal</option><option value="suspected">Suspeita</option><option value="confirmed">Confirmada</option></Select></Field>
      {value.portalPathology.status !== 'absent' ? <><Field label="Tipo"><Select value={value.portalPathology.kind ?? ''} onChange={(kind) => set({ portalPathology: { ...value.portalPathology, kind: kind as 'portal_hypertension' | 'portal_thrombosis' | 'other' } })}><option value="">Selecione</option><option value="portal_hypertension">Hipertensão portal</option><option value="portal_thrombosis">Trombose portal</option><option value="other">Outra</option></Select></Field><Field label="Critérios e achados" wide><textarea className={`${control} min-h-24 py-3`} value={value.portalPathology.evidence ?? ''} onChange={(event) => set({ portalPathology: { ...value.portalPathology, evidence: event.target.value } })} /></Field><div className="sm:col-span-2"><Toggle label="Critérios revisados e conclusão confirmada pelo médico" checked={value.portalPathology.physicianConfirmed} onChange={(physicianConfirmed) => set({ portalPathology: { ...value.portalPathology, physicianConfirmed } })} /></div></> : null}
    </Card>
  </>
}

function VenousForm({ value, onChange }: { value: DopplerVenosoMmssInput; onChange: (value: ClinicalModelInput) => void }) {
  const set = (patch: Partial<DopplerVenosoMmssInput>) => onChange({ ...value, ...patch })
  return <><Card title="Protocolo"><Field label="Indicação"><Select value={value.indication} onChange={(indication) => set({ indication: indication as DopplerVenosoMmssInput['indication'] })}><option value="elective">Eletivo</option><option value="thrombosis_research">Pesquisa de trombose</option><option value="catheter">Cateter</option></Select></Field><Field label="Lateralidade"><Select value={value.laterality} onChange={(laterality) => set({ laterality: laterality as DopplerVenosoMmssInput['laterality'], right: { ...value.right, examined: laterality !== 'left' }, left: { ...value.left, examined: laterality !== 'right' } })}><option value="right">Direito</option><option value="left">Esquerdo</option><option value="bilateral">Bilateral</option></Select></Field></Card>{(['right', 'left'] as const).filter((side) => value[side].examined).map((side) => <VenousSide key={side} side={side} value={value} onChange={set} />)}</>
}

function VenousSide({ side, value, onChange }: { side: 'right' | 'left'; value: DopplerVenosoMmssInput; onChange: (patch: Partial<DopplerVenosoMmssInput>) => void }) {
  const s = value[side]; const set = (patch: Partial<typeof s>) => onChange({ [side]: { ...s, ...patch } })
  return <Card title={`Membro superior ${side === 'right' ? 'direito' : 'esquerdo'}`}><Field label="Sistema profundo"><Select value={s.deepSystem} onChange={(deepSystem) => set({ deepSystem: deepSystem as typeof s.deepSystem })}><option value="patent">Pérvio</option><option value="thrombosis">Trombose</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Sistema superficial"><Select value={s.superficialSystem} onChange={(superficialSystem) => set({ superficialSystem: superficialSystem as typeof s.superficialSystem })}><option value="patent">Pérvio</option><option value="thrombosis">Trombose</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Veia jugular interna"><Select value={s.internalJugular} onChange={(internalJugular) => set({ internalJugular: internalJugular as typeof s.internalJugular })}><option value="not_assessed">Não incluída</option><option value="patent">Pérvia</option><option value="thrombosis">Trombose</option></Select></Field><div><Toggle label="Competência/refluxo testado" checked={s.competenceTested} onChange={(competenceTested) => set({ competenceTested, reflux: competenceTested ? 'absent' : 'not_assessed' })} /></div>{s.competenceTested ? <Field label="Refluxo"><Select value={s.reflux} onChange={(reflux) => set({ reflux: reflux as typeof s.reflux })}><option value="absent">Ausente</option><option value="present">Presente</option></Select></Field> : null}<div><Toggle label="Cateter presente" checked={s.catheter.present} onChange={(present) => set({ catheter: present ? { present: true, relation: 'adjacent', segment: '' } : { present: false } })} /></div>{s.catheter.present ? <><Field label="Relação"><Select value={s.catheter.relation ?? ''} onChange={(relation) => set({ catheter: { ...s.catheter, relation: relation as 'adjacent' | 'around_catheter' | 'occlusive' } })}><option value="adjacent">Adjacente</option><option value="around_catheter">Ao redor do cateter</option><option value="occlusive">Oclusiva</option></Select></Field><Field label="Segmento"><input className={control} value={s.catheter.segment ?? ''} onChange={(event) => set({ catheter: { ...s.catheter, segment: event.target.value } })} /></Field></> : null}<Field label="Fase da trombose"><Select value={s.thrombosisPhase} onChange={(thrombosisPhase) => set({ thrombosisPhase: thrombosisPhase as typeof s.thrombosisPhase })}><option value="not_applicable">Não aplicável</option><option value="acute">Aguda</option><option value="subacute">Subaguda</option><option value="chronic">Crônica</option><option value="indeterminate">Indeterminada</option></Select></Field>{!['not_applicable', 'indeterminate'].includes(s.thrombosisPhase) ? <div><Toggle label="Fase sustentada e confirmada" checked={s.phaseConfirmed} onChange={(phaseConfirmed) => set({ phaseConfirmed })} /></div> : null}</Card>
}

function ArterialForm({ value, onChange }: { value: DopplerArterialMmssInput; onChange: (value: ClinicalModelInput) => void }) {
  const set = (patch: Partial<DopplerArterialMmssInput>) => onChange({ ...value, ...patch })
  return <><Card title="Protocolo"><Field label="Lateralidade"><Select value={value.laterality} onChange={(laterality) => set({ laterality: laterality as typeof value.laterality, right: { ...value.right, examined: laterality !== 'left' }, left: { ...value.left, examined: laterality !== 'right' } })}><option value="right">Direito</option><option value="left">Esquerdo</option><option value="bilateral">Bilateral</option></Select></Field></Card>{(['right', 'left'] as const).filter((side) => value[side].examined).map((side) => <ArterialSide key={side} side={side} value={value} onChange={set} />)}</>
}
function ArterialSide({ side, value, onChange }: { side: 'right' | 'left'; value: DopplerArterialMmssInput; onChange: (patch: Partial<DopplerArterialMmssInput>) => void }) {
  const s = value[side]; const set = (patch: Partial<typeof s>) => onChange({ [side]: { ...s, ...patch } })
  const altered = s.status !== 'normal'
  const thoracic = s.thoracicOutlet
  return <Card title={`Membro superior ${side === 'right' ? 'direito' : 'esquerdo'}`}><Field label="Resultado"><Select value={s.status} onChange={(rawStatus) => {
    const status = rawStatus as typeof s.status
    set(status === 'normal'
      ? { status, affectedVessel: undefined, psvCms: {}, stenosisPercent: undefined, percentageDataSufficient: false, percentageConfirmed: false, distalPattern: undefined }
      : status === 'stenosis'
        ? { status }
        : { status, stenosisPercent: undefined, percentageDataSufficient: false, percentageConfirmed: false })
  }}><option value="normal">Normal</option><option value="stenosis">Estenose</option><option value="occlusion">Oclusão</option><option value="other">Outra alteração</option></Select></Field>{altered ? <><Field label="Vaso afetado"><input className={control} value={s.affectedVessel ?? ''} onChange={(event) => set({ affectedVessel: event.target.value })} /></Field><Field label="VPS no vaso afetado (cm/s)"><NumberInput value={s.affectedVessel ? s.psvCms[s.affectedVessel] : undefined} onChange={(number) => s.affectedVessel && set({ psvCms: number == null ? {} : { [s.affectedVessel]: number } })} /></Field>{s.status === 'stenosis' ? <Field label="Percentual de estenose"><NumberInput value={s.stenosisPercent} onChange={(stenosisPercent) => set({ stenosisPercent, ...(stenosisPercent == null ? { percentageDataSufficient: false, percentageConfirmed: false } : {}) })} /></Field> : null}{s.status === 'stenosis' && s.stenosisPercent != null ? <><div><Toggle label="Dados suficientes" checked={s.percentageDataSufficient} onChange={(percentageDataSufficient) => set({ percentageDataSufficient })} /></div><div><Toggle label="Percentual confirmado" checked={s.percentageConfirmed} onChange={(percentageConfirmed) => set({ percentageConfirmed })} /></div></> : null}{(s.status === 'stenosis' || s.status === 'occlusion') ? <Field label="Padrão/amortecimento/reenchimento distal" wide><textarea className={`${control} min-h-20 py-3`} value={s.distalPattern ?? ''} onChange={(event) => set({ distalPattern: event.target.value })} /></Field> : null}</> : null}<div className="sm:col-span-2"><Toggle label="Avaliar síndrome do desfiladeiro torácico" checked={thoracic.evaluated} onChange={(evaluated) => set({ thoracicOutlet: evaluated ? { evaluated: true, maneuvers: '', positions: '', result: 'indeterminate', physicianConfirmed: false } : { evaluated: false } })} /></div>{thoracic.evaluated ? <><Field label="Manobras"><input className={control} value={thoracic.maneuvers} onChange={(event) => set({ thoracicOutlet: { ...thoracic, maneuvers: event.target.value } })} /></Field><Field label="Posições"><input className={control} value={thoracic.positions} onChange={(event) => set({ thoracicOutlet: { ...thoracic, positions: event.target.value } })} /></Field><Field label="Resultado"><Select value={thoracic.result} onChange={(result) => set({ thoracicOutlet: { ...thoracic, result: result as 'negative' | 'positive' | 'indeterminate' } })}><option value="negative">Negativo</option><option value="positive">Positivo</option><option value="indeterminate">Indeterminado</option></Select></Field><div><Toggle label="Módulo confirmado" checked={thoracic.physicianConfirmed} onChange={(physicianConfirmed) => set({ thoracicOutlet: { ...thoracic, physicianConfirmed } })} /></div></> : null}</Card>
}

function ThoraxForm({ value, onChange }: { value: ThoraxInput; onChange: (value: ClinicalModelInput) => void }) {
  const set = (patch: Partial<ThoraxInput>) => onChange({ ...value, ...patch })
  return <>{(['right', 'left'] as const).map((side) => <ThoraxSide key={side} side={side} value={value} onChange={set} />)}<Card title="Conclusão e correlação"><Field label="Limitação técnica" wide><textarea className={`${control} min-h-20 py-3`} value={value.limitation ?? ''} onChange={(event) => set({ limitation: event.target.value })} /></Field><div className="sm:col-span-2"><Toggle label="Sugerir correlação clínica" checked={value.correlationSuggested} onChange={(correlationSuggested) => set({ correlationSuggested })} /></div></Card></>
}
function ThoraxSide({ side, value, onChange }: { side: 'right' | 'left'; value: ThoraxInput; onChange: (patch: Partial<ThoraxInput>) => void }) {
  const s = value[side]; const set = (patch: Partial<typeof s>) => onChange({ [side]: { ...s, ...patch } })
  const effusion = s.effusion
  return <Card title={`Hemitórax ${side === 'right' ? 'direito' : 'esquerdo'}`}><Field label="Linha pleural"><Select value={s.pleuralLine} onChange={(pleuralLine) => set({ pleuralLine: pleuralLine as typeof s.pleuralLine })}><option value="regular">Regular</option><option value="irregular">Irregular</option><option value="not_assessed">Não avaliada</option></Select></Field><Field label="Deslizamento"><Select value={s.sliding} onChange={(sliding) => set({ sliding: sliding as typeof s.sliding })}><option value="present">Presente</option><option value="absent">Ausente</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Número de linhas B"><NumberInput value={s.linesB.count} onChange={(count) => count != null && set({ linesB: { ...s.linesB, count } })} /></Field><Field label="Distribuição"><Select value={s.linesB.distribution} onChange={(distribution) => set({ linesB: { ...s.linesB, distribution: distribution as typeof s.linesB.distribution } })}><option value="none">Nenhuma</option><option value="focal">Focal</option><option value="multifocal">Multifocal</option><option value="diffuse">Difusa</option></Select></Field><Field label="Consolidação"><FindingSelect value={s.consolidation} onChange={(consolidation) => set({ consolidation })} /></Field><Field label="Atelectasia"><FindingSelect value={s.atelectasis} onChange={(atelectasis) => set({ atelectasis })} /></Field><Field label="Pneumotórax"><FindingSelect value={s.pneumothorax} onChange={(pneumothorax) => set({ pneumothorax })} /></Field><div><Toggle label="Derrame pleural" checked={effusion.present} onChange={(present) => set({ effusion: present ? { present: true, separationMm: 0, context: { adult: false, mechanicallyVentilated: false, supineTorso15Deg: false, endExpirationPosteriorAxillary: false, physicianConfirmed: false } } : { present: false } })} /></div>{effusion.present ? <><Field label="Separação máxima (mm)"><NumberInput value={effusion.separationMm || undefined} onChange={(separationMm) => set({ effusion: { ...effusion, separationMm: separationMm ?? 0 } })} /></Field><div className="sm:col-span-2 space-y-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20"><p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Método Balik · V (mL) = 20 × separação (mm)</p><Toggle label="Paciente adulto" checked={effusion.context.adult} onChange={(adult) => set({ effusion: { ...effusion, context: { ...effusion.context, adult } } })} /><Toggle label="Sob ventilação mecânica" checked={effusion.context.mechanicallyVentilated} onChange={(mechanicallyVentilated) => set({ effusion: { ...effusion, context: { ...effusion.context, mechanicallyVentilated } } })} /><Toggle label="Supino, tronco a 15°" checked={effusion.context.supineTorso15Deg} onChange={(supineTorso15Deg) => set({ effusion: { ...effusion, context: { ...effusion.context, supineTorso15Deg } } })} /><Toggle label="Medida máxima no fim da expiração, linha axilar posterior" checked={effusion.context.endExpirationPosteriorAxillary} onChange={(endExpirationPosteriorAxillary) => set({ effusion: { ...effusion, context: { ...effusion.context, endExpirationPosteriorAxillary } } })} /><Toggle label="Contexto e técnica confirmados pelo médico" checked={effusion.context.physicianConfirmed} onChange={(physicianConfirmed) => set({ effusion: { ...effusion, context: { ...effusion.context, physicianConfirmed } } })} /><p className="text-[11px] text-blue-800 dark:text-blue-200">DOI 10.1007/s00134-005-0024-2 · erro absoluto médio aproximado de 158 mL. Não determina conduta automaticamente.</p></div></> : null}</Card>
}
function FindingSelect({ value, onChange }: { value: 'not_seen' | 'suspected' | 'confirmed'; onChange: (value: 'not_seen' | 'suspected' | 'confirmed') => void }) { return <Select value={value} onChange={(next) => onChange(next as typeof value)}><option value="not_seen">Não identificada</option><option value="suspected">Suspeita</option><option value="confirmed">Confirmada</option></Select> }

function HipForm({ value, onChange }: { value: QuadrilInfantilInput; onChange: (value: ClinicalModelInput) => void }) {
  const set = (patch: Partial<QuadrilInfantilInput>) => onChange({ ...value, ...patch })
  return <><Card title="Paciente"><Field label="Idade (dias) · obrigatória"><NumberInput value={value.ageDays} onChange={(ageDays) => set({ ageDays, right: { ...value.right, grafClassification: undefined, classificationConfirmed: false }, left: { ...value.left, grafClassification: undefined, classificationConfirmed: false } })} /></Field><p className="self-end text-xs text-gray-500">Fora de 0–6 meses gera alerta, sem bloquear o exame.</p></Card>{(['right', 'left'] as const).map((side) => <HipSide key={side} side={side} value={value} onChange={set} />)}<Card title="Controle ou encaminhamento"><Field label="Sugestão não vinculante" wide><textarea className={`${control} min-h-20 py-3`} value={value.recommendation ?? ''} onChange={(event) => set({ recommendation: event.target.value })} /></Field>{value.recommendation ? <div className="sm:col-span-2"><Toggle label="Inserção confirmada pelo médico" checked={value.recommendationConfirmed} onChange={(recommendationConfirmed) => set({ recommendationConfirmed })} /></div> : null}</Card></>
}
function HipSide({ side, value, onChange }: { side: 'right' | 'left'; value: QuadrilInfantilInput; onChange: (patch: Partial<QuadrilInfantilInput>) => void }) {
  const s = value[side]
  const set = (patch: Partial<typeof s>) => {
    const next = { ...s, ...patch, classificationConfirmed: patch.classificationConfirmed ?? false }
    const suggestion = calculateGrafSuggestion({ ageDays: value.ageDays, ...next })
    onChange({ [side]: { ...next, grafClassification: suggestion.success ? suggestion.classification : undefined } })
  }
  const suggestion = calculateGrafSuggestion({ ageDays: value.ageDays, ...s })
  return <Card title={`Quadril ${side === 'right' ? 'direito' : 'esquerdo'}`}><div className="sm:col-span-2"><Toggle label="Corte padrão adequado" checked={s.adequateStandardPlane} onChange={(adequateStandardPlane) => set({ adequateStandardPlane })} /></div><Field label="Ângulo alfa (°)"><NumberInput value={s.alphaDeg} onChange={(alphaDeg) => set({ alphaDeg })} /></Field><Field label="Ângulo beta (°)"><NumberInput value={s.betaDeg} onChange={(betaDeg) => set({ betaDeg })} /></Field><Field label="Teto ósseo"><Select value={s.bonyRoof} onChange={(bonyRoof) => set({ bonyRoof: bonyRoof as typeof s.bonyRoof })}><option value="normal">Bem formado</option><option value="rounded">Arredondado</option><option value="deficient">Deficiente</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Teto cartilaginoso"><Select value={s.cartilaginousRoof} onChange={(cartilaginousRoof) => set({ cartilaginousRoof: cartilaginousRoof as typeof s.cartilaginousRoof })}><option value="normal">Preservado</option><option value="displaced">Deslocado</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Cabeça femoral"><Select value={s.femoralHead} onChange={(femoralHead) => set({ femoralHead: femoralHead as typeof s.femoralHead })}><option value="centered">Centrada</option><option value="decentered">Descentrada</option><option value="dislocated">Luxada</option><option value="not_assessed">Não avaliada</option></Select></Field><Field label="Posição do labrum"><Select value={s.labrumPosition} onChange={(labrumPosition) => set({ labrumPosition: labrumPosition as typeof s.labrumPosition })}><option value="normal">Normal</option><option value="everted">Evertido</option><option value="interposed">Interposto</option><option value="not_assessed">Não avaliado</option></Select></Field><Field label="Cobertura (%) · opcional"><NumberInput value={s.coveragePercent} onChange={(coveragePercent) => set({ coveragePercent })} /></Field><div className="rounded-xl bg-gray-100 p-3 text-sm dark:bg-gray-800"><span className="text-xs text-gray-500">Sugestão calculada</span><strong className="block">{suggestion.success ? `Graf ${suggestion.classification}` : 'Pendente'}</strong>{!suggestion.success ? <span className="text-xs text-amber-700 dark:text-amber-300">{suggestion.message}</span> : null}</div><div><Toggle label="Classificação confirmada" checked={s.classificationConfirmed} onChange={(classificationConfirmed) => set({ classificationConfirmed })} /></div></Card>
}
