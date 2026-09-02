'use client'

import { Plus, Trash2 } from 'lucide-react'
import { sugerirBiradsMamaria } from '@laudousg/shared'
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

const BIRADS = ['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'] as const

const DESCRITORES = {
  eco: [['hipoecoico', 'Hipoecoica'], ['isoecoico', 'Isoecoica'], ['anecoico', 'Anecoica'], ['hiperecoico', 'Hiperecoica']],
  forma: [['oval', 'Oval'], ['redonda', 'Redonda'], ['irregular', 'Irregular']],
  orientacao: [['paralela', 'Paralela à pele'], ['nao_paralela', 'Não paralela']],
  posterior: [['nenhuma', 'Sem alteração'], ['reforco', 'Reforço'], ['sombra', 'Sombra'], ['combinado', 'Combinado']],
  margemNaoCircunscrita: [['indistinta', 'Indistinta'], ['angular', 'Angular'], ['microlobulada', 'Microlobulada'], ['espiculada', 'Espiculada']],
} as const

const choiceClass = (active: boolean) => `rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${active
  ? 'border-emerald-500 bg-emerald-600 text-white'
  : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`

export function MamariaFormPanel({ state, onChange }: Props) {
  const ids = Array.isArray(state.achados_ids) ? state.achados_ids : []
  const conflicts = Array.isArray(state.companion_conflitos) ? state.companion_conflitos as string[] : []
  const get = (id: string, key: string) => String(state[`achados.${id}.${key}`] ?? '')
  const set = (id: string, key: string, value: string | string[]) =>
    onChange({ ...state, [`achados.${id}.${key}`]: value })

  const sugestaoBirads = (id: string, tipo: string): string | null => {
    const margem = get(id, 'margem')
    if (tipo === 'nodulo' && !margem) return null
    const microcalcificacoes = Array.isArray(state[`achados.${id}.calc`]) && (state[`achados.${id}.calc`] as string[]).includes('microcalc')
    return sugerirBiradsMamaria({
      tipo: tipo === 'nodulo' ? 'nodulo_solido' : tipo,
      forma: get(id, 'forma') || 'oval',
      margem,
      orientacao: get(id, 'orientacao') || 'paralela',
      posterior: get(id, 'posterior') || 'nenhuma',
      calcificacoes: tipo === 'calcificacoes'
        ? (get(id, 'calc_sub') === 'grosseiras' || !get(id, 'calc_sub') ? 'grosseiras_benignas' : get(id, 'calc_sub'))
        : microcalcificacoes ? 'microcalcificacoes' : null,
    })
  }

  const add = () => {
    const id = crypto.randomUUID()
    onChange({
      ...state,
      achados_ids: [...ids, id],
      [`achados.${id}.lado`]: 'direita',
      [`achados.${id}.tipo`]: 'nodulo',
      [`achados.${id}.eco`]: 'hipoecoico',
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
      {conflicts.length ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>A imagem trouxe dados diferentes dos já digitados.</strong><div className="mt-1">Mantivemos o formulário. Revise: {conflicts.join(' · ')}</div></div> : null}
      <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Ecotextura de fundo</div>
        <div className="flex flex-wrap gap-2">
          {[
            ['heterogeneo', 'Heterogênea'], ['denso', 'Fibroglandular'], ['adiposo', 'Adiposa'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => onChange({ ...state, fundo: value! })} className={choiceClass((state.fundo ?? 'heterogeneo') === value)}>{label}</button>
          ))}
        </div>
      </section>

      {ids.map((id, index) => {
        const tipo = get(id, 'tipo') || 'nodulo'
        const isNodulo = tipo === 'nodulo'
        const isCalc = tipo === 'calcificacoes'
        const margem = get(id, 'margem')
        const margemTipo = margem === 'circunscrita' ? 'circunscrita' : margem ? 'nao_circunscrita' : get(id, 'margem_tipo')
        const biradsDefinido = get(id, 'birads').toUpperCase()
        const biradsSugerido = sugestaoBirads(id, tipo)
        const choiceRow = (label: string, key: string, options: readonly (readonly [string, string])[]) => (
          <div>
            <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</div>
            <div className="flex flex-wrap gap-1.5">
              {options.map(([value, optionLabel]) => (
                <button key={value} type="button" aria-pressed={get(id, key) === value} onClick={() => set(id, key, value)} className={choiceClass(get(id, key) === value)}>{optionLabel}</button>
              ))}
            </div>
          </div>
        )
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
            </div>
            {isNodulo ? (
              <div className="mt-3 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                {choiceRow('Ecogenicidade', 'eco', DESCRITORES.eco)}
                {choiceRow('Forma', 'forma', DESCRITORES.forma)}
                <div>
                  <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">Margem</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" aria-pressed={margemTipo === 'circunscrita'} onClick={() => onChange({ ...state, [`achados.${id}.margem_tipo`]: 'circunscrita', [`achados.${id}.margem`]: 'circunscrita' })} className={choiceClass(margemTipo === 'circunscrita')}>Circunscrita</button>
                    <button type="button" aria-pressed={margemTipo === 'nao_circunscrita'} onClick={() => onChange({ ...state, [`achados.${id}.margem_tipo`]: 'nao_circunscrita', [`achados.${id}.margem`]: margem === 'circunscrita' ? '' : margem })} className={choiceClass(margemTipo === 'nao_circunscrita')}>Não circunscrita</button>
                  </div>
                  {margemTipo === 'nao_circunscrita' ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-l-2 border-emerald-300 pl-2 dark:border-emerald-800">
                      {DESCRITORES.margemNaoCircunscrita.map(([value, optionLabel]) => <button key={value} type="button" aria-pressed={margem === value} onClick={() => set(id, 'margem', value)} className={choiceClass(margem === value)}>{optionLabel}</button>)}
                    </div>
                  ) : null}
                </div>
                {choiceRow('Orientação', 'orientacao', DESCRITORES.orientacao)}
                {choiceRow('Fenômeno acústico posterior', 'posterior', DESCRITORES.posterior)}
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={Array.isArray(state[`achados.${id}.calc`]) && (state[`achados.${id}.calc`] as string[]).includes('microcalc')} onChange={(event) => set(id, 'calc', event.target.checked ? ['microcalc'] : [])} />
                  Microcalcificações de permeio
                </label>
              </div>
            ) : null}
            {isCalc ? (
              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">Padrão das calcificações</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['grosseiras', 'Grosseiras'], ['microcalcificacoes', 'Microcalcificações'], ['em_nodulo', 'Em nódulo'], ['intraductais', 'Intraductais'], ['fora_nodulo', 'Extranodulares'],
                  ].map(([value, label]) => <button key={value} type="button" onClick={() => set(id, 'calc_sub', value!)} className={choiceClass((get(id, 'calc_sub') || 'grosseiras') === value)}>{label}</button>)}
                </div>
              </div>
            ) : null}
            {biradsSugerido || biradsDefinido ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950/60">
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500">BI-RADS definido pelo médico</div>
                <p className="mt-1 text-[11px] text-gray-500">A sugestão do sistema não entra no laudo sem sua confirmação.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {BIRADS.map((value) => <button key={value} type="button" aria-pressed={biradsDefinido === value} onClick={() => set(id, 'birads', biradsDefinido === value ? '' : value)} className={choiceClass(biradsDefinido === value)}>{value}</button>)}
                </div>
                {!biradsDefinido && biradsSugerido ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>Sugestão do sistema: <strong>BI-RADS {biradsSugerido}</strong></span>
                    <button type="button" onClick={() => set(id, 'birads', biradsSugerido)} className="rounded-md border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300">Confirmar sugestão</button>
                  </div>
                ) : null}
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
