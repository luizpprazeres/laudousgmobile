'use client'

import { useCallback, useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import type { OrganModule, OrganState } from '@/lib/deterministic'
import { chaveFemurDoSchema, pesoHadlock1985DaBiometria } from '@/lib/calculators/fetalWeight'
import { biometryWeightMode, setBiometryWeightMode, updateBiometryMeasurements } from './biometryAutomation'
import { OrganFormPanel } from './OrganFormPanel'
import { IntergrowthPreview } from './IntergrowthPreview'
import { IntergrowthPrintSheet } from './IntergrowthPrintSheet'
import { intergrowthBiometryPreview } from '@/lib/calculators/intergrowthBiometry'

type Props = {
  biometry: OrganModule
  biometryState: OrganState
  onBiometryChange: (next: OrganState) => void
  growth: OrganModule
  growthState: OrganState
  igState: OrganState
  onGrowthChange: (next: OrganState) => void
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
  compact = false,
}: Props) {
  const [printOpen, setPrintOpen] = useState(false)
  const closePrint = useCallback(() => setPrintOpen(false), [])
  const femurKey = chaveFemurDoSchema(biometry.schema.fields)
  const printable = intergrowthBiometryPreview(biometryState, femurKey, igState) !== null
  useEffect(() => { if (!printable) setPrintOpen(false) }, [printable])
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
        {printable && <div className="mb-1 flex justify-end">
          <button type="button" onClick={() => setPrintOpen(true)} aria-label="Abrir folha de crescimento fetal" title="Abrir folha de crescimento fetal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            <Printer className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
        <IntergrowthPreview biometryState={biometryState} chaveFemur={chaveFemurDoSchema(biometry.schema.fields)} igState={igState} />
        <h2 className={headingClass}>Crescimento fetal · avaliação manual</h2>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">O percentil abaixo é informado pelo médico para o peso do laudo e a curva escolhida. A prévia não substitui esse valor.</p>
        <OrganFormPanel
          schema={growth.schema}
          state={growthState}
          compact={compact}
          onChange={onGrowthChange}
        />
      </section>
      <IntergrowthPrintSheet open={printOpen} biometryState={biometryState} chaveFemur={femurKey} igState={igState} onClose={closePrint} />
    </div>
  )
}
