'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { OrganState } from '@/lib/deterministic'

type Props = {
  state: OrganState
  onChange: (next: OrganState) => void
}

const TIPOS = [
  ['cisto_simples', 'Cisto simples'],
  ['multiplos_cistos', 'Cistos múltiplos'],
  ['nodulo', 'Nódulo sólido'],
  ['calcificacoes', 'Calcificações'],
] as const

const choiceClass = (active: boolean) => `rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${active
  ? 'border-emerald-500 bg-emerald-600 text-white'
  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`

export function MamariaFormPanel({ state, onChange }: Props) {
  const ids = Array.isArray(state.achados_ids) ? state.achados_ids : []
  const get = (id: string, key: string) => String(state[`achados.${id}.${key}`] ?? '')
  const set = (id: string, key: string, value: string | string[]) =>
    onChange({ ...state, [`achados.${id}.${key}`]: value })

  const add = () => {
    const id = crypto.randomUUID()
    onChange({
      ...state,
      achados_ids: [...ids, id],
      [`achados.${id}.lado`]: 'direita',
      [`achados.${id}.tipo`]: 'nodulo',
      [`achados.${id}.forma`]: 'oval',
      [`achados.${id}.orientacao`]: 'paralela',
      [`achados.${id}.posterior`]: 'nenhuma',
    })
  }

  const remove = (id: string) => {
    const next: OrganState = { ...state, achados_ids: ids.filter((item) => item !== id) }
    for (const key of Object.keys(next)) {
      if (key.startsWith(`achados.${id}.`)) delete next[key]
    }
    onChange(next)
  }

  const input = (id: string, key: string, label: string, placeholder = '') => (
    <label className="block">
      <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <input
        value={get(id, key)}
        onChange={(event) => set(id, key, event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950"
      />
    </label>
  )

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Ecotextura de fundo</div>
        <div className="flex flex-wrap gap-2">
          {[
            ['heterogeneo', 'Heterogêneo'], ['denso', 'Fibroglandular denso'], ['adiposo', 'Adiposo'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => onChange({ ...state, fundo: value! })} className={choiceClass((state.fundo ?? 'heterogeneo') === value)}>{label}</button>
          ))}
        </div>
      </section>

      {ids.map((id, index) => {
        const tipo = get(id, 'tipo') || 'nodulo'
        const isNodulo = tipo === 'nodulo'
        const isCalc = tipo === 'calcificacoes'
        return (
          <section key={id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-sm">Achado {index + 1}</strong>
              <button type="button" onClick={() => remove(id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Remover achado ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {['direita', 'esquerda'].map((lado) => <button key={lado} type="button" onClick={() => set(id, 'lado', lado)} className={choiceClass(get(id, 'lado') === lado)}>Mama {lado}</button>)}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {TIPOS.map(([value, label]) => <button key={value} type="button" onClick={() => set(id, 'tipo', value)} className={choiceClass(tipo === value)}>{label}</button>)}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {!isCalc ? input(id, 'medidas', 'Medidas (cm)', '1,2 x 1,0 x 0,8') : null}
              {input(id, 'local', 'Localização', 'quadrante / posição')}
              {input(id, 'horario', 'Horário', '10 horas')}
              {input(id, 'dist_pele', 'Distância da pele (cm)', '0,5')}
              {input(id, 'dist_mamilo', 'Distância do mamilo (cm)', '3,0')}
              {isNodulo ? input(id, 'birads', 'BI-RADS (forçar)', 'ex.: 4A') : null}
            </div>
            {isNodulo ? (
              <div className="mt-3 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                {[
                  ['eco', [['hipoecoico', 'Hipo'], ['isoecoico', 'Iso'], ['anecoico', 'Ane'], ['hiperecoico', 'Hiper']]],
                  ['forma', [['oval', 'Oval'], ['redonda', 'Redonda'], ['irregular', 'Irregular']]],
                  ['margem', [['circunscrita', 'Circunscrita'], ['indistinta', 'Indistinta'], ['angular', 'Angular'], ['microlobulada', 'Microlobulada'], ['espiculada', 'Espiculada']]],
                  ['orientacao', [['paralela', 'Paralela'], ['nao_paralela', 'Não paralela']]],
                  ['posterior', [['nenhuma', 'Sem alteração'], ['reforco', 'Reforço'], ['sombra', 'Sombra']]],
                ].map(([key, options]) => (
                  <div key={key as string} className="flex flex-wrap gap-1.5">
                    {(options as string[][]).map(([value, label]) => <button key={value} type="button" onClick={() => set(id, key as string, value!)} className={choiceClass(get(id, key as string) === value)}>{label}</button>)}
                  </div>
                ))}
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={Array.isArray(state[`achados.${id}.calc`]) && (state[`achados.${id}.calc`] as string[]).includes('microcalc')} onChange={(event) => set(id, 'calc', event.target.checked ? ['microcalc'] : [])} />
                  Microcalcificações de permeio
                </label>
              </div>
            ) : null}
            {isCalc ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['grosseiras', 'Grosseiras'], ['microcalcificacoes', 'Micro'], ['em_nodulo', 'Em nódulo'], ['intraductais', 'Intraductais'], ['fora_nodulo', 'Extranodular'],
                ].map(([value, label]) => <button key={value} type="button" onClick={() => set(id, 'calc_sub', value!)} className={choiceClass((get(id, 'calc_sub') || 'grosseiras') === value)}>{label}</button>)}
              </div>
            ) : null}
          </section>
        )
      })}

      <button type="button" onClick={add} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/60 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300">
        <Plus className="h-4 w-4" /> Adicionar achado
      </button>
    </div>
  )
}
