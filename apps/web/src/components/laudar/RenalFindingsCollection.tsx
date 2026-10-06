'use client'

import { Plus, X } from 'lucide-react'
import type { OrganState } from '@/lib/deterministic'

type Props = {
  state: OrganState
  onChange: (next: OrganState) => void
}

type FindingItem = {
  id: string
  prefix: string
  legacy: boolean
}

const MAX_FINDINGS = 20
const POLES = [
  ['nao_informada', 'Selecione'],
  ['sup', 'Polo superior'],
  ['medio', 'Terço médio'],
  ['inf', 'Polo inferior'],
] as const

const values = (state: OrganState, key: string): string[] =>
  Array.isArray(state[key]) ? state[key].filter((value): value is string => typeof value === 'string') : []

const text = (state: OrganState, key: string): string =>
  typeof state[key] === 'string' ? state[key] as string : ''

function newId(): string {
  return crypto.randomUUID()
}

export function RenalFindingsCollection({ state, onChange }: Props) {
  const calculationIds = values(state, 'calculos_ids')
  const cystIds = values(state, 'cistos_simples_ids')
  const legacyCalculation = values(state, 'litiase').includes('calculo')
  const legacyCyst = values(state, 'cistos').includes('simples')
  const multipleCysts = values(state, 'cistos').includes('multiplos')

  const calculations: FindingItem[] = [
    ...(legacyCalculation ? [{ id: 'legacy', prefix: 'litiase.calculo', legacy: true }] : []),
    ...calculationIds.map((id) => ({ id, prefix: `calculos.${id}`, legacy: false })),
  ]
  const cysts: FindingItem[] = [
    ...(legacyCyst ? [{ id: 'legacy', prefix: 'cistos.simples', legacy: true }] : []),
    ...cystIds.map((id) => ({ id, prefix: `cistos_simples.${id}`, legacy: false })),
  ]

  const set = (key: string, value: string | string[]) => onChange({ ...state, [key]: value })

  const add = (idsKey: 'calculos_ids' | 'cistos_simples_ids', prefix: 'calculos' | 'cistos_simples') => {
    const ids = values(state, idsKey)
    if (ids.length >= MAX_FINDINGS) return
    const id = newId()
    onChange({
      ...state,
      [idsKey]: [...ids, id],
      [`${prefix}.${id}.dimensao`]: '',
      [`${prefix}.${id}.polo`]: 'nao_informada',
    })
  }

  const remove = (item: FindingItem, kind: 'calculo' | 'cisto') => {
    const next = { ...state }
    if (item.legacy) {
      const listKey = kind === 'calculo' ? 'litiase' : 'cistos'
      const option = kind === 'calculo' ? 'calculo' : 'simples'
      next[listKey] = values(state, listKey).filter((value) => value !== option)
    } else {
      const idsKey = kind === 'calculo' ? 'calculos_ids' : 'cistos_simples_ids'
      next[idsKey] = values(state, idsKey).filter((id) => id !== item.id)
    }
    delete next[`${item.prefix}.dimensao`]
    delete next[`${item.prefix}.polo`]
    onChange(next)
  }

  const toggleMultipleCysts = () => {
    const current = values(state, 'cistos')
    set('cistos', multipleCysts ? current.filter((value) => value !== 'multiplos') : [...current, 'multiplos'])
  }

  const group = (
    title: string,
    buttonLabel: string,
    items: FindingItem[],
    idsKey: 'calculos_ids' | 'cistos_simples_ids',
    prefix: 'calculos' | 'cistos_simples',
    kind: 'calculo' | 'cisto',
  ) => (
    <section className="col-span-2 rounded-lg border border-gray-100 bg-gray-50/65 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/55">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">{items.length}/{MAX_FINDINGS}</span>
        <button
          type="button"
          disabled={items.length >= MAX_FINDINGS}
          onClick={() => add(idsKey, prefix)}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {buttonLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Nenhum achado individualizado.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div key={`${kind}-${item.id}-${index}`} className="rounded-lg border border-emerald-100 bg-white p-2 dark:border-emerald-900/50 dark:bg-gray-950">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <strong className="text-[12px] text-gray-800 dark:text-gray-200">{kind === 'calculo' ? 'Cálculo' : 'Cisto simples'} {index + 1}</strong>
                <button type="button" aria-label={`Remover ${kind === 'calculo' ? 'cálculo' : 'cisto'} ${index + 1}`} onClick={() => remove(item, kind)} className="rounded-full p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Dimensões</span>
                  <input
                    aria-label={`${kind === 'calculo' ? 'Cálculo' : 'Cisto simples'} ${index + 1} — dimensões`}
                    value={text(state, `${item.prefix}.dimensao`)}
                    onChange={(event) => set(`${item.prefix}.dimensao`, event.target.value)}
                    placeholder={kind === 'calculo' ? '5 mm' : '20 x 18 x 16 mm'}
                    className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 md:h-8 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Localização</span>
                  <select
                    aria-label={`${kind === 'calculo' ? 'Cálculo' : 'Cisto simples'} ${index + 1} — localização`}
                    value={text(state, `${item.prefix}.polo`) || 'nao_informada'}
                    onChange={(event) => set(`${item.prefix}.polo`, event.target.value)}
                    className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-[12px] text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 md:h-8 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  >
                    {POLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )

  return (
    <>
      {group('Litíase', 'Adicionar cálculo', calculations, 'calculos_ids', 'calculos', 'calculo')}
      {group('Cistos simples', 'Adicionar cisto', cysts, 'cistos_simples_ids', 'cistos_simples', 'cisto')}
      <section className="col-span-2 rounded-lg border border-gray-100 bg-gray-50/65 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/55">
        <button type="button" aria-pressed={multipleCysts} onClick={toggleMultipleCysts} className="flex min-h-11 w-full items-center gap-1.5 text-left md:min-h-8">
          <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] font-bold ${multipleCysts ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-900'}`}>✓</span>
          <span className="text-[11.5px] font-semibold text-gray-800 dark:text-gray-200">Cistos simples múltiplos, sem individualização</span>
        </button>
      </section>
    </>
  )
}
