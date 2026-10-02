'use client'

import { useMemo, useState } from 'react'
import {
  type HepaticAssessment,
  type HepaticInterpretationConfirmation,
  type HepaticMeasurement,
  type HepaticModule,
  type HepaticModuleKey,
} from '@laudousg/shared'
import {
  HEPATIC_METHODS,
  HEPATIC_UNITS,
  buildHepaticCorrelation,
  buildHepaticTechniquePatch,
  calculateHepaticIqrRatio,
  changeHepaticMethod,
  changeHepaticModuleStatus,
  changeHepaticUnit,
  clearHepaticMeasurement,
  editHepaticModule,
  hepaticWorkspaceReadiness,
  replaceHepaticAssessmentContext,
  reviewHepaticAssessment,
  reviewHepaticModule,
  upsertHepaticMeasurement,
  type HepaticMethod,
  type HepaticQualityConfiguration,
  type HepaticUnit,
} from '@/lib/hepaticAssessmentWorkspace'

type Reference = HepaticInterpretationConfirmation['reference']
type ModuleConfiguration = {
  measurementReference: Reference
  interpretationReference: Reference
  protocolReference: Reference
  qualityByMethod: Partial<Record<HepaticMethod, HepaticQualityConfiguration>>
}

export type HepaticAssessmentWorkspaceProps = {
  value: HepaticAssessment
  onChange: (next: HepaticAssessment) => void
  physicianId: string
  configurations: Record<HepaticModuleKey, ModuleConfiguration>
  integratedInterpretationReference: Reference
  now?: () => string
}

const inputClass = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-white/10 dark:bg-[#151517]'
const buttonClass = 'min-h-10 rounded-full border border-black/10 px-4 text-sm font-semibold transition hover:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10'

const issueLabels: Record<string, string> = {
  INDICATION_REQUIRED: 'Informe a indicação.',
  NO_QUANTITATIVE_RESULT: 'Registre ao menos um módulo quantitativo.',
  METHOD_REQUIRED_OR_INCOMPATIBLE: 'Selecione um método compatível.',
  EQUIPMENT_REQUIRED: 'Informe fabricante e equipamento.',
  ACQUISITION_REQUIRED: 'Complete a aquisição.',
  FASTING_CONTEXT_REQUIRED: 'Registre o contexto de jejum.',
  CONFOUNDERS_REVIEW_REQUIRED: 'Revise os fatores de confusão.',
  ONE_NATIVE_MEDIAN_REQUIRED: 'Informe uma mediana na unidade nativa.',
  ADEQUATE_QUALITY_REQUIRED: 'Registre qualidade técnica adequada.',
  PHYSICIAN_INTERPRETATION_REQUIRED: 'Confirme a interpretação médica.',
  INTEGRATED_REVIEW_REQUIRED: 'Confirme a conclusão integrada.',
  CORRELATION_REVIEW_REQUIRED: 'Revise a correlação entre os métodos.',
  LIMITATION_REASON_REQUIRED: 'Descreva a limitação.',
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1 block text-[11px] font-semibold text-gray-500">{label}</span>{children}</label>
}

function numberValue(raw: string) {
  if (!raw.trim()) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : null
}

function moduleLabel(key: HepaticModuleKey) { return key === 'stiffness' ? 'Rigidez hepática' : 'Gordura hepática' }

function ModuleEditor({ moduleKey, value, onChange, physicianId, configuration, now }: {
  moduleKey: HepaticModuleKey
  value: HepaticAssessment
  onChange: (next: HepaticAssessment) => void
  physicianId: string
  configuration: ModuleConfiguration
  now: () => string
}) {
  const module = value.modules[moduleKey]
  const [interpretation, setInterpretation] = useState(module.interpretation?.text ?? '')
  const [qualityMetrics, setQualityMetrics] = useState<Record<string, string>>({})
  const [unitDraft, setUnitDraft] = useState<HepaticUnit | ''>(
    module.measurements.find((item) => item.role === 'median')?.unit ?? '',
  )
  const [equipmentDraft, setEquipmentDraft] = useState({
    manufacturer: module.equipment?.manufacturer ?? '',
    model: module.equipment?.model ?? '',
    probe: module.equipment?.probe ?? '',
  })
  const [acquisitionDraft, setAcquisitionDraft] = useState({
    count: module.acquisition?.count ? String(module.acquisition.count) : '',
    lobe: module.acquisition?.lobe ?? 'right',
    depthCm: module.acquisition?.depthCm ? String(module.acquisition.depthCm) : '',
    roi: module.acquisition?.roi ?? '',
    position: module.acquisition?.position ?? '',
  })
  const [confounderDraft, setConfounderDraft] = useState({
    etiologicContext: module.confounders?.etiologicContext ?? '',
    items: module.confounders?.items.join('\n') ?? '',
  })
  const active = module.status === 'performed' || module.status === 'partially_limited'
  const median = module.measurements.find((item) => item.role === 'median')
  const iqr = module.measurements.find((item) => item.role === 'iqr')
  const units = module.method ? HEPATIC_UNITS[module.method] : []
  const unit = (median?.unit ?? unitDraft) || units[0]
  const qualityConfiguration = module.method ? configuration.qualityByMethod[module.method] : undefined

  const patch = (next: Partial<HepaticModule>) => onChange(editHepaticModule(value, moduleKey, next))
  const setMeasurement = (role: 'median' | 'iqr', raw: string) => {
    if (!raw.trim()) return onChange(clearHepaticMeasurement(value, moduleKey, role))
    const parsed = numberValue(raw)
    if (parsed === null || !unit) return
    onChange(upsertHepaticMeasurement(value, moduleKey, {
      id: `${moduleKey}-${role}`,
      role,
      value: parsed,
      unit,
      origin: 'manual',
      source: configuration.measurementReference,
    }))
  }
  const reviewQuality = () => {
    if (!module.method || !module.equipment || !qualityConfiguration || !unit) return
    const metrics = qualityConfiguration.metrics.map((metric) => ({
      code: metric.code,
      value: numberValue(qualityMetrics[metric.code] ?? '') ?? Number.NaN,
      unit: metric.unit,
    }))
    if (metrics.some((metric) => !Number.isFinite(metric.value))) return
    patch({ quality: {
      assessment: 'adequate',
      physicianId,
      assessedAt: now(),
      criterion: {
        reference: qualityConfiguration.reference,
        method: module.method,
        manufacturer: module.equipment.manufacturer,
        equipmentModel: module.equipment.model,
        unit,
        minimumAcquisitions: qualityConfiguration.minimumAcquisitions,
        requiredMetrics: qualityConfiguration.metrics.map((metric) => metric.code),
      },
      metrics,
    } })
  }
  const techniquePatch = buildHepaticTechniquePatch({ ...equipmentDraft, ...acquisitionDraft }, configuration.protocolReference)
  const applyTechnique = () => techniquePatch && patch(techniquePatch)
  const reviewConfounders = () => patch({ confounders: {
    reviewed: true,
    etiologicContext: confounderDraft.etiologicContext.trim(),
    items: confounderDraft.items.split('\n').map((item) => item.trim()).filter(Boolean),
  } })

  return <section data-hepatic-module={moduleKey} className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-emerald-700">Módulo quantitativo</p><h3 className="text-lg font-semibold">{moduleLabel(moduleKey)}</h3></div><select aria-label={`Status de ${moduleLabel(moduleKey)}`} className={`${inputClass} w-auto`} value={module.status} onChange={(event) => onChange(changeHepaticModuleStatus(value, moduleKey, event.target.value as HepaticModule['status']))}><option value="not_performed">Não realizado</option><option value="performed">Realizado</option><option value="partially_limited">Parcialmente limitado</option><option value="not_feasible">Não realizável</option></select></div>
    {(module.status === 'partially_limited' || module.status === 'not_feasible') ? <Field label="Motivo da limitação" wide><input className={inputClass} value={module.reason ?? ''} onChange={(event) => patch({ reason: event.target.value || undefined })} /></Field> : null}
    {active ? <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Método"><select className={inputClass} value={module.method ?? ''} onChange={(event) => { if (!event.target.value) return; const method = event.target.value as HepaticMethod; setUnitDraft(HEPATIC_UNITS[method][0] ?? ''); onChange(changeHepaticMethod(value, moduleKey, method)) }}><option value="">Selecione</option>{HEPATIC_METHODS[moduleKey].map((method) => <option key={method}>{method}</option>)}</select></Field>
        <Field label="Fabricante"><input className={inputClass} value={equipmentDraft.manufacturer} onChange={(event) => setEquipmentDraft((current) => ({ ...current, manufacturer: event.target.value }))} /></Field>
        <Field label="Modelo"><input className={inputClass} value={equipmentDraft.model} onChange={(event) => setEquipmentDraft((current) => ({ ...current, model: event.target.value }))} /></Field>
        <Field label="Transdutor"><input className={inputClass} value={equipmentDraft.probe} onChange={(event) => setEquipmentDraft((current) => ({ ...current, probe: event.target.value }))} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Aquisições"><input inputMode="numeric" className={inputClass} value={acquisitionDraft.count} onChange={(event) => setAcquisitionDraft((current) => ({ ...current, count: event.target.value }))} /></Field>
        <Field label="Lobo"><select className={inputClass} value={acquisitionDraft.lobe} onChange={(event) => setAcquisitionDraft((current) => ({ ...current, lobe: event.target.value as 'right' | 'left' }))}><option value="right">Direito</option><option value="left">Esquerdo</option></select></Field>
        <Field label="Profundidade (cm)"><input inputMode="decimal" className={inputClass} value={acquisitionDraft.depthCm} onChange={(event) => setAcquisitionDraft((current) => ({ ...current, depthCm: event.target.value }))} /></Field>
        <Field label="ROI"><input className={inputClass} value={acquisitionDraft.roi} onChange={(event) => setAcquisitionDraft((current) => ({ ...current, roi: event.target.value }))} /></Field>
        <Field label="Posição"><input className={inputClass} value={acquisitionDraft.position} onChange={(event) => setAcquisitionDraft((current) => ({ ...current, position: event.target.value }))} /></Field>
        <Field label="Jejum"><select className={inputClass} value={module.fasting?.status ?? 'unknown'} onChange={(event) => patch({ fasting: { status: event.target.value as 'fasting' | 'non_fasting' | 'unknown', hours: module.fasting?.hours } })}><option value="unknown">Não informado</option><option value="fasting">Em jejum</option><option value="non_fasting">Sem jejum</option></select></Field>
        {module.fasting?.status === 'fasting' ? <Field label="Horas de jejum"><input inputMode="decimal" className={inputClass} value={module.fasting.hours ?? ''} onChange={(event) => { const hours = numberValue(event.target.value); if (hours !== null) patch({ fasting: { status: 'fasting', hours } }) }} /></Field> : null}
        <Field label="Unidade nativa"><select className={inputClass} value={unit ?? ''} onChange={(event) => { const nextUnit = event.target.value as HepaticUnit; setUnitDraft(nextUnit); if (module.measurements.length || module.quality) onChange(changeHepaticUnit(value, moduleKey)) }} disabled={!module.method}>{units.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Mediana"><input inputMode="decimal" className={inputClass} value={median?.value ?? ''} onChange={(event) => setMeasurement('median', event.target.value)} disabled={!unit} /></Field>
        <Field label="IQR"><input inputMode="decimal" className={inputClass} value={iqr?.value ?? ''} onChange={(event) => setMeasurement('iqr', event.target.value)} disabled={!unit} /></Field>
      </div>
      <button type="button" className={buttonClass} disabled={!techniquePatch} onClick={applyTechnique}>{module.equipment && module.acquisition ? 'Aplicar alterações da técnica' : 'Aplicar técnica e aquisição'}</button>
      <div className="rounded-2xl bg-gray-50 p-3 dark:bg-black/20"><div><strong className="block text-sm">Fatores de confusão</strong><span className="text-xs text-gray-500">A revisão deve ser refeita após qualquer edição aplicada.</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Contexto etiológico"><input className={inputClass} value={confounderDraft.etiologicContext} onChange={(event) => setConfounderDraft((current) => ({ ...current, etiologicContext: event.target.value }))} /></Field><Field label="Fatores presentes (um por linha)"><textarea className={`${inputClass} h-20 py-2`} value={confounderDraft.items} onChange={(event) => setConfounderDraft((current) => ({ ...current, items: event.target.value }))} /></Field></div><button type="button" className={`${buttonClass} mt-3`} disabled={!confounderDraft.etiologicContext.trim()} onClick={reviewConfounders}>{module.confounders?.reviewed ? 'Reconfirmar revisão dos fatores' : 'Confirmar revisão dos fatores'}</button></div>
      <div className="rounded-2xl border border-black/[0.06] p-3 dark:border-white/[0.08]"><p className="mb-2 text-sm font-semibold">Qualidade técnica</p>{qualityConfiguration ? <div className="grid gap-3 sm:grid-cols-2">{qualityConfiguration.metrics.map((metric) => <Field key={metric.code} label={`${metric.label} (${metric.unit})`}><input inputMode="decimal" className={inputClass} value={qualityMetrics[metric.code] ?? ''} onChange={(event) => setQualityMetrics((current) => ({ ...current, [metric.code]: event.target.value }))} /></Field>)}</div> : <p className="text-xs text-amber-700">Critério versionado não configurado para este método.</p>}<button type="button" className={`${buttonClass} mt-3`} disabled={!qualityConfiguration || !module.equipment || !unit} onClick={reviewQuality}>{module.quality?.assessment === 'adequate' ? 'Qualidade adequada registrada' : 'Registrar qualidade adequada'}</button></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={!median || !iqr} onClick={() => onChange(calculateHepaticIqrRatio(value, moduleKey))}>Calcular IQR/mediana</button>{module.derived[0] ? <span className="self-center text-sm text-gray-600">IQR/mediana: {module.derived[0].value.toFixed(1)}%</span> : null}</div>
      <div className="rounded-2xl border border-emerald-700/20 bg-emerald-50/60 p-3 dark:bg-emerald-950/20"><Field label="Interpretação médica" wide><textarea className={`${inputClass} h-24 py-2`} value={interpretation} onChange={(event) => setInterpretation(event.target.value)} /></Field><button type="button" className={`${buttonClass} mt-3 border-emerald-700 bg-emerald-700 text-white`} disabled={!interpretation.trim()} onClick={() => onChange(reviewHepaticModule(value, moduleKey, { text: interpretation, physicianId, confirmedAt: now(), reference: configuration.interpretationReference }))}>Confirmar interpretação deste módulo</button>{module.interpretation?.status === 'physician_confirmed' ? <p className="mt-2 text-xs font-semibold text-emerald-700">Revisada pelo médico nesta versão.</p> : null}</div>
    </div> : null}
  </section>
}

export function HepaticAssessmentWorkspace({ value, onChange, physicianId, configurations, integratedInterpretationReference, now = () => new Date().toISOString() }: HepaticAssessmentWorkspaceProps) {
  const readiness = useMemo(() => hepaticWorkspaceReadiness(value), [value])
  const [integratedText, setIntegratedText] = useState(value.integratedInterpretation?.text ?? '')
  const [correlationDraft, setCorrelationDraft] = useState({
    modeB: value.correlation?.modeB ?? '',
    doppler: value.correlation?.doppler ?? '',
    concordance: value.correlation?.concordance ?? 'not_assessed',
    physicianResolution: value.correlation?.physicianResolution ?? '',
  })
  const context = (patch: Parameters<typeof replaceHepaticAssessmentContext>[1]) => onChange(replaceHepaticAssessmentContext(value, patch))
  const correlation = buildHepaticCorrelation(correlationDraft)
  const applyCorrelation = () => correlation && context({ correlation })

  return <div data-hepatic-assessment-workspace data-contract-version={value.contractVersion} className="space-y-4">
    <section className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]"><div className="mb-3 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-emerald-700">Avaliação hepática</p><h2 className="text-xl font-semibold">Dados do exame</h2></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/10">Revisão {value.revision}</span></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Finalidade"><select className={inputClass} value={value.purpose} onChange={(event) => context({ purpose: event.target.value as HepaticAssessment['purpose'] })}><option value="multiparametric">Avaliação multiparamétrica</option><option value="elastography">Elastografia hepática</option><option value="abdomen_total">Abdome total</option><option value="abdomen_superior">Abdome superior</option></select></Field><Field label="Indicação clínica"><input className={inputClass} value={value.indication ?? ''} onChange={(event) => context({ indication: event.target.value || undefined })} /></Field></div></section>
    <div className="grid gap-4 xl:grid-cols-2"><ModuleEditor moduleKey="stiffness" value={value} onChange={onChange} physicianId={physicianId} configuration={configurations.stiffness} now={now} /><ModuleEditor moduleKey="fat" value={value} onChange={onChange} physicianId={physicianId} configuration={configurations.fat} now={now} /></div>
    {value.purpose === 'multiparametric' ? <section className="rounded-[22px] border border-black/[0.07] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]"><h3 className="mb-3 text-lg font-semibold">Correlação multiparamétrica</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Modo B"><textarea className={`${inputClass} h-20 py-2`} value={correlationDraft.modeB} onChange={(event) => setCorrelationDraft((current) => ({ ...current, modeB: event.target.value }))} /></Field><Field label="Doppler"><textarea className={`${inputClass} h-20 py-2`} value={correlationDraft.doppler} onChange={(event) => setCorrelationDraft((current) => ({ ...current, doppler: event.target.value }))} /></Field><Field label="Concordância"><select className={inputClass} value={correlationDraft.concordance} onChange={(event) => setCorrelationDraft((current) => ({ ...current, concordance: event.target.value as typeof current.concordance }))}><option value="not_assessed">Não avaliada</option><option value="concordant">Concordante</option><option value="discordant">Discordante</option></select></Field>{correlationDraft.concordance === 'discordant' ? <Field label="Resolução médica"><textarea className={`${inputClass} h-20 py-2`} value={correlationDraft.physicianResolution} onChange={(event) => setCorrelationDraft((current) => ({ ...current, physicianResolution: event.target.value }))} /></Field> : null}</div><button type="button" className={`${buttonClass} mt-3`} disabled={!correlation} onClick={applyCorrelation}>{value.correlation ? 'Aplicar alterações da correlação' : 'Aplicar correlação'}</button><div className="mt-4 rounded-2xl border border-emerald-700/20 bg-emerald-50/60 p-3 dark:bg-emerald-950/20"><Field label="Conclusão integrada"><textarea className={`${inputClass} h-24 py-2`} value={integratedText} onChange={(event) => setIntegratedText(event.target.value)} /></Field><button type="button" className={`${buttonClass} mt-3 border-emerald-700 bg-emerald-700 text-white`} disabled={!integratedText.trim()} onClick={() => onChange(reviewHepaticAssessment(value, { text: integratedText, physicianId, confirmedAt: now(), reference: integratedInterpretationReference }))}>Confirmar conclusão integrada</button></div></section> : null}
    <section role="status" className={`rounded-[22px] border p-4 ${readiness.canConclude ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}><h3 className="font-semibold">{readiness.canConclude ? 'Pronto para concluir' : 'Revisão pendente'}</h3>{readiness.issues.length ? <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{readiness.issues.map((issue, index) => <li key={`${issue.path}-${issue.code}-${index}`}>{issueLabels[issue.code] ?? issue.code} <span className="text-xs opacity-60">{issue.path}</span></li>)}</ul> : <p className="mt-1 text-sm">Dados técnicos e interpretações médicas estão vinculados à revisão atual.</p>}</section>
  </div>
}
