'use client'

import { Plus, Trash2 } from 'lucide-react'
import { sugestoesBiradsMamaria } from '@/lib/calculators/mamariaBiradsSugestao'
import type { OrganState } from '@/lib/deterministic'

type Props = {
  state: OrganState
  onChange: (next: OrganState) => void
  dopplerEnabled?: boolean
}

type Option = readonly [string, string]

const TIPOS = [
  ['cisto_simples', 'Cisto simples'],
  ['multiplos_cistos', 'Cistos múltiplos'],
  ['microcistos_agrupados', 'Microcistos agrupados'],
  ['cisto_complicado', 'Cisto complicado'],
  ['nodulo', 'Nódulo sólido'],
  ['linfonodo_intramamario', 'Linfonodo intramamário'],
  ['calcificacoes', 'Calcificações'],
  ['achado_nao_nodular', 'Achado não nodular'],
  ['ginecomastia', 'Ginecomastia'],
  ['proteses', 'Próteses'],
] as const

const LADOS = [['direita', 'Direita'], ['esquerda', 'Esquerda']] as const

const FUNDOS = [['heterogeneo', 'Heterogênea'], ['denso', 'Fibroglandular'], ['adiposo', 'Adiposa']] as const

const BIRADS = ['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'] as const

const DESCRITORES = {
  eco: [['hipoecoico', 'Hipoecoica'], ['isoecoico', 'Isoecoica'], ['anecoico', 'Anecoica'], ['hiperecoico', 'Hiperecoica']],
  forma: [['oval', 'Oval'], ['redonda', 'Redonda'], ['irregular', 'Irregular']],
  orientacao: [['paralela', 'Paralela à pele'], ['nao_paralela', 'Não paralela']],
  posterior: [['nenhuma', 'Sem alteração'], ['reforco', 'Reforço'], ['sombra', 'Sombra'], ['combinado', 'Combinado']],
  elasticidade: [['macia', 'Macia'], ['intermediaria', 'Intermediária'], ['dura', 'Dura']],
  vascularizacao: [['ausente', 'Ausente'], ['periferica', 'Periférica'], ['interna', 'Interna'], ['mista', 'Periférica e interna']],
  margemNaoCircunscrita: [['indistinta', 'Indistinta'], ['angular', 'Angular'], ['microlobulada', 'Microlobulada'], ['espiculada', 'Espiculada']],
} as const

const CALC_PADROES = [
  ['grosseiras', 'Grosseiras'], ['microcalcificacoes', 'Microcalcificações'], ['em_nodulo', 'Em nódulo'], ['intraductais', 'Intraductais'], ['fora_nodulo', 'Extranodulares'],
] as const

/**
 * COMPACTAÇÃO — a regra de apresentação é a cardinalidade:
 *   - até 4 opções curtas: chips (um toque, tudo visível);
 *   - mais que isso (tipo do achado, padrão das calcificações): lista nativa.
 * Os alvos têm 44 px no celular e encolhem para 32–36 px com ponteiro fino.
 * Nenhuma chave nem valor do estado mudou: o contrato com
 * `lib/catalog/mamariaParaCatalogo` é o mesmo.
 */
const TARGET = 'min-h-11 sm:min-h-8'

const chipClass = (active: boolean) => `${TARGET} inline-flex items-center rounded-full border px-2.5 text-[12px] font-semibold leading-tight transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${active
  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'}`

const fieldLabel = 'block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400'

const controlClass = `${TARGET} w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition motion-reduce:transition-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/40`

function Chips({
  label,
  options,
  value,
  onSelect,
  ariaLabel,
}: {
  label?: string
  options: readonly Option[]
  value: string
  onSelect: (value: string) => void
  ariaLabel?: string
}) {
  return (
    <div role="group" aria-label={ariaLabel ?? label} className="flex flex-wrap gap-1">
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => onSelect(optionValue)}
          className={chipClass(value === optionValue)}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  )
}

/** Linha de descritor: rótulo à esquerda no desktop, em cima no celular. */
function DescriptorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <span className="text-[12px] font-semibold text-gray-600 sm:pt-1.5 dark:text-gray-300">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function MamariaFormPanel({ state, onChange, dopplerEnabled = false }: Props) {
  const ids = Array.isArray(state.achados_ids) ? state.achados_ids : []
  const conflicts = Array.isArray(state.companion_conflitos) ? state.companion_conflitos as string[] : []
  const get = (id: string, key: string) => String(state[`achados.${id}.${key}`] ?? '')
  const set = (id: string, key: string, value: string | string[]) =>
    onChange({ ...state, [`achados.${id}.${key}`]: value })

  /**
   * A sugestão de BI-RADS vem da MESMA regra do painel de Cálculos
   * (`mamariaBiradsSugestao`): sem descritor não há categoria, só critério
   * citado vira sugestão, e suspeito não ganha subcategoria. A regra antiga —
   * que completava forma/orientação/posterior com o valor benigno e sugeria
   * 4A/4B/4C/5 por soma de pontos — saiu daqui.
   */
  const sugestoes = new Map(sugestoesBiradsMamaria(state).map((item) => [item.id, item]))

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

  /**
   * Campo de texto com largura pelo CONTEÚDO que recebe: uma distância de uma
   * casa decimal não precisa de um terço da tela. `width` é a largura no
   * desktop; no celular os campos curtos dividem a linha dois a dois.
   */
  const input = (
    id: string,
    key: string,
    label: string,
    {
      placeholder = '',
      unit,
      numeric = false,
      width = 'wide',
    }: { placeholder?: string; unit?: string; numeric?: boolean; width?: 'narrow' | 'medium' | 'wide' } = {},
  ) => {
    const widthClass = {
      narrow: 'basis-[calc(50%-0.25rem)] sm:basis-auto sm:w-[6.5rem]',
      medium: 'basis-full sm:basis-auto sm:w-[10rem]',
      wide: 'basis-full sm:min-w-[12rem] sm:flex-1',
    }[width]
    return (
      <label className={`block min-w-0 ${widthClass}`} data-mama-field={key}>
        <span className={`${fieldLabel} mb-1`}>{label}</span>
        <span className="relative block">
          <input
            value={get(id, key)}
            onChange={(event) => set(id, key, event.target.value)}
            placeholder={placeholder}
            inputMode={numeric ? 'decimal' : undefined}
            className={`${controlClass} ${unit ? 'pr-9' : ''} ${numeric ? 'tabular-nums' : ''}`}
          />
          {unit ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[11px] font-medium text-gray-400">{unit}</span>
          ) : null}
        </span>
      </label>
    )
  }

  return (
    <div className="space-y-2.5">
      {conflicts.length ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><strong>A imagem trouxe dados diferentes dos já digitados.</strong><div className="mt-1">Mantivemos o formulário. Revise: {conflicts.join(' · ')}</div></div> : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">Ecotextura de fundo</span>
        <Chips
          ariaLabel="Ecotextura de fundo"
          options={FUNDOS}
          value={String(state.fundo ?? 'heterogeneo')}
          onSelect={(value) => onChange({ ...state, fundo: value })}
        />
      </div>

      {ids.map((id, index) => {
        const tipo = get(id, 'tipo') || 'nodulo'
        const lado = get(id, 'lado')
        const isNodulo = tipo === 'nodulo'
        const isCalc = tipo === 'calcificacoes'
        const isNaoNodular = tipo === 'achado_nao_nodular'
        const isSemMedidas = tipo === 'ginecomastia' || tipo === 'proteses'
        const margem = get(id, 'margem')
        const margemTipo = margem === 'circunscrita' ? 'circunscrita' : margem ? 'nao_circunscrita' : get(id, 'margem_tipo')
        const biradsDefinido = get(id, 'birads').toUpperCase()
        const sugestao = sugestoes.get(id)
        const biradsSugerido = sugestao?.status === 'sugerida' ? sugestao.categoria : null
        const microcalc = Array.isArray(state[`achados.${id}.calc`]) && (state[`achados.${id}.calc`] as string[]).includes('microcalc')
        const calcSub = get(id, 'calc_sub')
        const calcSubLabel = CALC_PADROES.find(([value]) => value === calcSub)?.[1] ?? calcSub
        const tipoLabel = TIPOS.find(([value]) => value === tipo)?.[1] ?? tipo
        const titleId = `mama-achado-${id}-titulo`
        return (
          <section
            key={id}
            aria-labelledby={titleId}
            data-mama-achado={id}
            className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h4 id={titleId} className="text-[13px] font-semibold text-gray-900 dark:text-gray-50">
                Achado {index + 1}
                <span className="sr-only">: {tipoLabel}, mama {lado || 'sem lado'}</span>
              </h4>
              <button
                type="button"
                onClick={() => remove(id)}
                className={`${TARGET} inline-flex min-w-11 items-center justify-center rounded-full text-rose-500 transition motion-reduce:transition-none hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:min-w-8 dark:hover:bg-rose-950/40`}
                aria-label={`Remover achado ${index + 1}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            {/*
              Identificação e posição numa linha que quebra: lado, tipo, medidas,
              localização, horário e distâncias — cada campo na largura do que
              recebe. No desktop largo cabe tudo numa linha só.
            */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0">
                <span className={`${fieldLabel} mb-1`}>Mama</span>
                <div role="group" aria-label={`Lado do achado ${index + 1}`} className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-950">
                  {LADOS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={lado === value}
                      aria-label={`Mama ${value}`}
                      onClick={() => set(id, 'lado', value)}
                      className={`min-h-11 sm:min-h-7 rounded-full px-3 text-[12px] font-semibold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${lado === value
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block min-w-0 basis-full sm:basis-auto sm:w-[13.5rem]">
                <span className={`${fieldLabel} mb-1`}>Tipo</span>
                <select
                  value={tipo}
                  onChange={(event) => set(id, 'tipo', event.target.value)}
                  aria-label={`Tipo do achado ${index + 1}`}
                  className={`${controlClass} pr-8 font-semibold`}
                >
                  {TIPOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {!isCalc && !isSemMedidas
                ? input(id, 'medidas', isNaoNodular ? 'Medidas (2 eixos)' : 'Medidas', {
                    placeholder: isNaoNodular ? '1,2 x 1,0' : '1,2 x 1,0 x 0,8',
                    unit: 'cm',
                    width: 'medium',
                  })
                : null}
              {input(id, 'local', 'Localização', { placeholder: 'quadrante / posição', width: 'wide' })}
              {input(id, 'horario', 'Horário', { placeholder: '10 horas', width: 'narrow' })}
              {input(id, 'dist_pele', 'Dist. pele', { placeholder: '0,5', unit: 'cm', numeric: true, width: 'narrow' })}
              {input(id, 'dist_mamilo', 'Dist. mamilo', { placeholder: '3,0', unit: 'cm', numeric: true, width: 'narrow' })}
            </div>

            {isNodulo ? (
              <div className="mt-2.5 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/30 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20" data-mama-descritores>
                <DescriptorRow label="Ecogenicidade">
                  <Chips ariaLabel="Ecogenicidade" options={DESCRITORES.eco} value={get(id, 'eco')} onSelect={(value) => set(id, 'eco', value)} />
                </DescriptorRow>
                <DescriptorRow label="Forma">
                  <Chips ariaLabel="Forma" options={DESCRITORES.forma} value={get(id, 'forma')} onSelect={(value) => set(id, 'forma', value)} />
                </DescriptorRow>
                <DescriptorRow label="Margem">
                  <div className="flex flex-wrap items-center gap-1">
                    <div role="group" aria-label="Margem" className="flex flex-wrap gap-1">
                      <button type="button" aria-pressed={margemTipo === 'circunscrita'} onClick={() => onChange({ ...state, [`achados.${id}.margem_tipo`]: 'circunscrita', [`achados.${id}.margem`]: 'circunscrita' })} className={chipClass(margemTipo === 'circunscrita')}>Circunscrita</button>
                      <button type="button" aria-pressed={margemTipo === 'nao_circunscrita'} onClick={() => onChange({ ...state, [`achados.${id}.margem_tipo`]: 'nao_circunscrita', [`achados.${id}.margem`]: margem === 'circunscrita' ? '' : margem })} className={chipClass(margemTipo === 'nao_circunscrita')}>Não circunscrita</button>
                    </div>
                    {margemTipo === 'nao_circunscrita' ? (
                      <div className="flex flex-wrap items-center gap-1 border-l-2 border-emerald-300 pl-2 dark:border-emerald-800">
                        <Chips
                          ariaLabel="Margem não circunscrita"
                          options={DESCRITORES.margemNaoCircunscrita}
                          value={margem}
                          onSelect={(value) => set(id, 'margem', value)}
                        />
                      </div>
                    ) : null}
                  </div>
                </DescriptorRow>
                <DescriptorRow label="Orientação">
                  <Chips ariaLabel="Orientação" options={DESCRITORES.orientacao} value={get(id, 'orientacao')} onSelect={(value) => set(id, 'orientacao', value)} />
                </DescriptorRow>
                <DescriptorRow label="Posterior">
                  <Chips ariaLabel="Fenômeno acústico posterior" options={DESCRITORES.posterior} value={get(id, 'posterior')} onSelect={(value) => set(id, 'posterior', value)} />
                </DescriptorRow>
                <DescriptorRow label="Elasticidade">
                  <Chips ariaLabel="Elasticidade (se realizada)" options={DESCRITORES.elasticidade} value={get(id, 'elasticidade')} onSelect={(value) => set(id, 'elasticidade', value)} />
                </DescriptorRow>
                <label className={`${TARGET} flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-gray-700 sm:pl-[8.25rem] dark:text-gray-200`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                    checked={microcalc}
                    onChange={(event) => set(id, 'calc', event.target.checked ? ['microcalc'] : [])}
                  />
                  Microcalcificações de permeio
                </label>
                {calcSub ? (
                  // Padrão de calcificação lido da imagem (companion): visível e removível.
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-700 sm:pl-[8.25rem] dark:text-gray-200" data-mama-calc-imagem>
                    <span>Calcificações: <strong>{calcSubLabel}</strong></span>
                    <button
                      type="button"
                      onClick={() => set(id, 'calc_sub', '')}
                      className={`${TARGET} rounded-full px-3 font-semibold text-gray-500 transition motion-reduce:transition-none hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-white/10`}
                    >
                      Remover calcificações
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isNaoNodular ? (
              <div className="mt-2.5 flex">
                {input(id, 'descricao_nao_nodular', 'Descrição do achado não nodular', { placeholder: 'área heterogênea, sem configuração nodular' })}
              </div>
            ) : null}
            {tipo === 'cisto_complicado' || tipo === 'microcistos_agrupados' || tipo === 'proteses' ? (
              <div className="mt-2.5 flex">
                {input(id, 'descritores', tipo === 'proteses' ? 'Plano / descrição das próteses' : 'Descritores adicionais', {
                  placeholder: tipo === 'proteses' ? 'predominantemente retromusculares' : 'finos ecos internos / coalescentes',
                })}
              </div>
            ) : null}
            {isCalc ? (
              <div className="mt-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <label className="block max-w-[16rem]">
                  <span className={`${fieldLabel} mb-1`}>Padrão das calcificações</span>
                  <select
                    value={calcSub || (microcalc ? 'microcalcificacoes' : '')}
                    onChange={(event) => set(id, 'calc_sub', event.target.value)}
                    className={`${controlClass} pr-8`}
                  >
                    {/* Sem padrão escolhido a lista diz isso — não finge "Grosseiras". */}
                    <option value="" disabled>Escolha o padrão</option>
                    {CALC_PADROES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
            ) : null}
            {dopplerEnabled && !isSemMedidas ? (
              <div className="mt-2.5 space-y-2 rounded-xl border border-sky-100 bg-sky-50/40 p-2.5 dark:border-sky-900/50 dark:bg-sky-950/20">
                <DescriptorRow label="Doppler">
                  <Chips ariaLabel="Vascularização ao Doppler" options={DESCRITORES.vascularizacao} value={get(id, 'vascularizacao')} onSelect={(value) => set(id, 'vascularizacao', value)} />
                </DescriptorRow>
                <div className="flex">
                  {input(id, 'vascularizacao_descricao', 'Detalhe opcional do Doppler', { placeholder: 'vasos internos de baixo fluxo' })}
                </div>
              </div>
            ) : null}
            {!isSemMedidas || biradsDefinido ? (
              <div className="mt-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-950/60" data-mama-birads-inline>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className={fieldLabel}>BI-RADS definido pelo médico</span>
                  <span className="text-[11px] text-gray-500">Só entra no laudo o que você escolher.</span>
                </div>
                <div role="group" aria-label="BI-RADS definido pelo médico" className="mt-1.5 flex flex-wrap gap-1">
                  {BIRADS.map((value) => <button key={value} type="button" aria-pressed={biradsDefinido === value} onClick={() => set(id, 'birads', biradsDefinido === value ? '' : value)} className={`${chipClass(biradsDefinido === value)} min-w-11 justify-center sm:min-w-9`}>{value}</button>)}
                </div>
                {sugestao && sugestao.status !== 'nao_se_aplica' ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300" data-mama-birads-status={sugestao.status}>
                    {sugestao.status === 'sugerida' && biradsSugerido ? (
                      <>
                        <span>Sugestão: <strong>BI-RADS {biradsSugerido}</strong></span>
                        {biradsDefinido !== biradsSugerido ? (
                          <button type="button" onClick={() => set(id, 'birads', biradsSugerido)} className={`${TARGET} rounded-full border border-emerald-300 bg-white px-3 font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300`}>Aplicar sugestão</button>
                        ) : null}
                      </>
                    ) : sugestao.status === 'suspeita' ? (
                      <span>{sugestao.motivo}</span>
                    ) : sugestao.status === 'incompleta' ? (
                      <span>Sem sugestão: falta {sugestao.faltando.join(', ').toLowerCase()}.</span>
                    ) : (
                      <span>Sem sugestão automática para este achado.</span>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}

      <button type="button" onClick={add} className={`${TARGET} flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/60 px-4 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-300`}>
        <Plus aria-hidden="true" className="h-4 w-4" /> Adicionar achado
      </button>
    </div>
  )
}
