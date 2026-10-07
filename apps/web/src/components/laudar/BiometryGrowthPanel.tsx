'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Printer, Trash2 } from 'lucide-react'
import type { OrganModule, OrganState } from '@/lib/deterministic'
import { chaveFemurDoSchema, pesoHadlock1985DaBiometria } from '@/lib/calculators/fetalWeight'
import { biometryWeightMode, setBiometryWeightMode, updateBiometryMeasurements } from './biometryAutomation'
import { OrganFormPanel } from './OrganFormPanel'
import { IntergrowthPreview } from './IntergrowthPreview'
import { IntergrowthPrintSheet } from './IntergrowthPrintSheet'
import {
  formatarPercentilIntergrowth,
  intergrowthBiometryPreviewFromDating,
} from '@/lib/calculators/intergrowthBiometry'
import {
  PRIOR_GROWTH_EXAM_DATE_KEY,
  PRIOR_GROWTH_EXAM_WEIGHT_KEY,
  derivePriorGrowthExams,
  priorGrowthInputsFromChartState,
  priorGrowthRejectionMessage,
  storedGrowthChartFromPreview,
} from '@/lib/calculators/growthChartPersistence'

type Props = {
  biometry: OrganModule
  biometryState: OrganState
  onBiometryChange: (next: OrganState) => void
  growth: OrganModule
  growthState: OrganState
  igState: OrganState
  onGrowthChange: (next: OrganState) => void
  chartState?: OrganState
  onChartStateChange?: (next: OrganState) => void
  compact?: boolean
}

/** Medidas e peso automático compartilham a atualização que invalida percentis antigos.
 * Pesos existentes/importados permanecem manuais até escolha explícita do médico.
 * INTERGROWTH continua uma prévia independente, com sua fórmula de três medidas.
 */
export function BiometryGrowthPanel({
  biometry,
  biometryState,
  onBiometryChange,
  growth,
  growthState,
  igState,
  onGrowthChange,
  chartState = {},
  onChartStateChange,
  compact = false,
}: Props) {
  const [printOpen, setPrintOpen] = useState(false)
  const [priorEditorOpen, setPriorEditorOpen] = useState(false)
  const closePrint = useCallback(() => setPrintOpen(false), [])
  const femurKey = chaveFemurDoSchema(biometry.schema.fields)
  const preview = intergrowthBiometryPreviewFromDating(biometryState, femurKey, igState)
  const printable = preview !== null
  const chartIncluded = chartState.incluir === 'sim'
  const priorInputs = useMemo(() => priorGrowthInputsFromChartState(chartState), [chartState])
  const priorResult = useMemo(() => {
    if (!preview || priorInputs.length === 0) return null
    return derivePriorGrowthExams(storedGrowthChartFromPreview(preview), priorInputs)
  }, [preview, priorInputs])
  const priorExams = priorResult?.ok ? priorResult.priorExams : []
  const priorVisible = priorEditorOpen || priorInputs.length > 0
  useEffect(() => { if (!printable) setPrintOpen(false) }, [printable])
  useEffect(() => {
    if (!printable && chartIncluded && onChartStateChange) {
      onChartStateChange({ ...chartState, incluir: 'nao' })
    }
  }, [chartIncluded, chartState, onChartStateChange, printable])
  const headingClass = 'mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'
  const hadlock = pesoHadlock1985DaBiometria(biometryState, chaveFemurDoSchema(biometry.schema.fields))
  const mode = biometryWeightMode(biometryState)
  const measurementSchema = mode === 'automatico'
    ? { ...biometry.schema, fields: biometry.schema.fields.filter((field) => field.key !== 'peso') }
    : biometry.schema
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[1100px]:grid-cols-2 min-[1100px]:gap-6">
      <section className="min-w-0">
        <h2 className={headingClass}>Biometria</h2>
        <OrganFormPanel
          schema={measurementSchema}
          state={biometryState}
          compact={compact}
          onChange={(next) => onBiometryChange(updateBiometryMeasurements(biometryState, next, femurKey))}
        />
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Peso do laudo · {mode === 'manual' ? 'Manual' : 'Automático'}</span>
            <button type="button"
              onClick={() => onBiometryChange(setBiometryWeightMode(biometryState, femurKey, mode === 'manual' ? 'automatico' : 'manual'))}
              className="min-h-9 rounded-md border border-gray-200 px-3 text-xs text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:text-emerald-300">
              {mode === 'manual' ? 'Usar peso automático' : 'Informar peso manual'}
            </button>
          </div>
          <p role="status" aria-live="polite" className="text-xs text-gray-600 dark:text-gray-400">
            Hadlock DBP/CC/CA/CF: {hadlock ? `${hadlock.valor} g` : 'aguardando DBP, CC, CA e CF válidos em mm.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {mode === 'manual'
              ? 'O peso manual é preservado quando as medidas mudam. A curva ao lado usa seu próprio peso calculado.'
              : 'Ao editar as medidas, o peso do laudo é recalculado. Se faltar uma medida, o peso automático é removido.'}
          </p>
        </div>
      </section>
      <section className={`min-w-0 border-t pt-3 min-[1100px]:border-l min-[1100px]:border-t-0 min-[1100px]:pl-6 min-[1100px]:pt-0 ${compact ? 'border-gray-100 dark:border-gray-800' : 'border-gray-200 dark:border-gray-800'}`}>
        {printable && <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          {onChartStateChange ? (
            <button
              type="button"
              onClick={() => onChartStateChange({ ...chartState, incluir: chartIncluded ? 'nao' : 'sim' })}
              aria-pressed={chartIncluded}
              className={`min-h-8 rounded-md border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${chartIncluded
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-gray-200 text-emerald-700 hover:bg-emerald-50 dark:border-gray-700 dark:text-emerald-300'}`}
            >
              {chartIncluded ? 'Remover gráfico do laudo' : 'Incluir gráfico no laudo'}
            </button>
          ) : null}
          <button type="button" onClick={() => setPrintOpen(true)} aria-label="Abrir folha de crescimento fetal" title="Abrir folha de crescimento fetal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            <Printer className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
        <IntergrowthPreview
          biometryState={biometryState}
          chaveFemur={chaveFemurDoSchema(biometry.schema.fields)}
          igState={igState}
          priorExams={priorExams}
        />
        {onChartStateChange ? (
          <div className="mb-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Histórico de crescimento</h3>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Um exame anterior, usando data e PFE informado. Não altera o texto nem a conclusão.</p>
              </div>
              {!priorVisible ? (
                <button
                  type="button"
                  onClick={() => setPriorEditorOpen(true)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-semibold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:text-emerald-300"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Adicionar exame anterior
                </button>
              ) : null}
            </div>
            {priorVisible ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <label className="min-w-0 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Data do exame anterior
                  <input
                    type="date"
                    value={String(chartState[PRIOR_GROWTH_EXAM_DATE_KEY] ?? '')}
                    max={preview?.dating?.examDate}
                    onChange={(event) => onChartStateChange({ ...chartState, [PRIOR_GROWTH_EXAM_DATE_KEY]: event.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </label>
                <label className="min-w-0 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  PFE informado no exame anterior (g)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={String(chartState[PRIOR_GROWTH_EXAM_WEIGHT_KEY] ?? '')}
                    onChange={(event) => onChartStateChange({ ...chartState, [PRIOR_GROWTH_EXAM_WEIGHT_KEY]: event.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    placeholder="Ex.: 400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...chartState }
                    delete next[PRIOR_GROWTH_EXAM_DATE_KEY]
                    delete next[PRIOR_GROWTH_EXAM_WEIGHT_KEY]
                    onChartStateChange(next)
                    setPriorEditorOpen(false)
                  }}
                  title="Remover exame anterior"
                  aria-label="Remover exame anterior"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="sm:col-span-3" aria-live="polite">
                  {priorResult?.ok && priorResult.priorExams[0] ? (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Exame anterior: {Math.floor(priorResult.priorExams[0].gestationalAgeDays / 7)}s{priorResult.priorExams[0].gestationalAgeDays % 7}d · {priorResult.priorExams[0].weightGrams} g · percentil {formatarPercentilIntergrowth(priorResult.priorExams[0].percentile)}.
                    </p>
                  ) : priorResult && !priorResult.ok ? (
                    <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{priorGrowthRejectionMessage(priorResult.reason)}</p>
                  ) : priorInputs.length > 0 && !preview ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">Complete a biometria e a datação atuais para posicionar o exame anterior.</p>
                  ) : (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">A idade gestacional e o percentil anteriores serão derivados da datação atual.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <h2 className={headingClass}>Crescimento fetal · avaliação manual</h2>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">O percentil abaixo é informado pelo médico para o peso do laudo e a curva escolhida. A prévia não substitui esse valor.</p>
        <OrganFormPanel
          schema={growth.schema}
          state={growthState}
          compact={compact}
          onChange={onGrowthChange}
        />
      </section>
      <IntergrowthPrintSheet open={printOpen} biometryState={biometryState} chaveFemur={femurKey} igState={igState} priorExams={priorExams} onClose={closePrint} />
    </div>
  )
}
