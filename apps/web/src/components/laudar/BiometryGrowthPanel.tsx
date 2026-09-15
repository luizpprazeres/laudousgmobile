'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, Printer } from 'lucide-react'
import type { OrganModule, OrganState } from '@/lib/deterministic'
import { chaveFemurDoSchema, pesoHadlock1985DaBiometria, pesoJaAplicado } from '@/lib/calculators/fetalWeight'
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

/**
 * As duas metades de uma mesma leitura: as medidas (DBP, CC, CA, CF e o peso
 * estimado) e, logo abaixo, a classificação do crescimento — percentil e
 * curva, informados pelo médico.
 *
 * O peso Hadlock 1985 usa quatro medidas em mm. Ele
 * aparece ao lado, mas só entra no campo `peso` quando o médico aplica pelo
 * botão; até lá o peso digitado fica como está. A aplicação passa pelo
 * `onBiometryChange` de sempre, que invalida o percentil se o peso mudar.
 * A previa INTERGROWTH usa separadamente Hadlock CC/CA/CF, sem alterar campos.
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
  const aplicado = hadlock ? pesoJaAplicado(biometryState.peso, hadlock.valor) : false
  const aplicarLabel = hadlock
    ? aplicado
      ? `Peso estimado já está em ${hadlock.valor} g`
      : `Aplicar ${hadlock.valor} g ao peso estimado`
    : ''
  return (
    <div className={`min-w-0 ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <section className="min-w-0">
        <h2 className={headingClass}>Biometria</h2>
        <OrganFormPanel
          schema={biometry.schema}
          state={biometryState}
          compact={compact}
          onChange={onBiometryChange}
        />
        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5" role="status" aria-live="polite">
          <span className="min-w-0 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Peso calculado · Hadlock (DBP/CC/CA/CF)
          </span>
          {hadlock ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">{hadlock.valor} g</span>
              <button
                type="button"
                onClick={() => onBiometryChange({ ...biometryState, peso: hadlock.valor })}
                disabled={aplicado}
                aria-label={aplicarLabel}
                title={aplicarLabel}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 disabled:cursor-default disabled:text-gray-300 disabled:hover:border-gray-200 disabled:hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 dark:focus-visible:ring-emerald-900/50 dark:disabled:text-gray-600 dark:disabled:hover:bg-gray-900"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <span className="text-[12px] text-gray-400 dark:text-gray-500">Indisponível: informe DBP, CC, CA e CF válidos em mm</span>
          )}
        </div>
      </section>
      <section className={`min-w-0 border-t pt-3 ${compact ? 'border-gray-100 dark:border-gray-800' : 'border-gray-200 dark:border-gray-800'}`}>
        {printable && <div className="mb-1 flex justify-end">
          <button type="button" onClick={() => setPrintOpen(true)} aria-label="Abrir folha de crescimento fetal" title="Abrir folha de crescimento fetal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            <Printer className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
        <IntergrowthPreview biometryState={biometryState} chaveFemur={chaveFemurDoSchema(biometry.schema.fields)} igState={igState} />
        <h2 className={headingClass}>Crescimento fetal</h2>
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
