'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { composeCase, type ComposedLine } from './heroCases'
import { HeroFieldControl } from './HeroFieldControl'
import { useHeroDemo } from './useHeroDemo'

const STATUS_TEXT = {
  'pronto': 'Pronto para revisar',
  'copiado-demo': 'Copiado (simulação)',
  'copiado': 'Copiado para a área de transferência',
  'copia-falhou': 'Não foi possível copiar',
} as const

/**
 * Vitrine do hero: quatro exames sintéticos em ciclo, 5 a 6 s cada. A
 * autoplay escolhe, digita a medida e mostra "pronto" e "copiado (simulação)".
 * Qualquer toque humano assume o controle e o que estiver nos campos fica.
 *
 * Contrato para QA: [data-hero-demo][data-stage] (achados | redigindo |
 * laudo), [data-hero-mode] (auto | manual), fieldsets no desktop e
 * article[aria-label="Laudo de exemplo"]; no mobile o grupo "Escolher órgão de
 * exemplo" e o painel [data-hero-organ].
 */
export function HeroDemo({ reduce }: { reduce: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const { state, dispatch, copy, interruptProps, cases } = useHeroDemo(root, reduce)
  const heroCase = cases[state.caseIndex]
  const values = state.values[heroCase.id]
  const doc = useMemo(() => composeCase(heroCase, values), [heroCase, values])
  const [focusField, setFocusField] = useState(heroCase.fields[0].id)
  const tabs = useRef<HTMLDivElement>(null)

  // A aba do caso atual sempre à vista na faixa rolável (mobile), sem rolar a página.
  useEffect(() => {
    const strip = tabs.current
    const active = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!strip || !active) return
    const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2
    strip.scrollTo({
      left: Math.max(0, left),
      behavior: reduce || state.mode === 'auto' ? 'auto' : 'smooth',
    })
  }, [state.caseIndex, state.mode, reduce])

  // A frase escolhida é "redigida" na hora; o resto do laudo já está lá.
  const [typed, setTyped] = useState<number | null>(null)
  const changedLine = doc.body.find((l) => l.field === state.changed)
  const changedText = changedLine?.kind === 'text' ? changedLine.text : ''
  useEffect(() => {
    if (!state.revision || reduce) return
    setTyped(0)
  }, [state.revision, reduce])
  useEffect(() => {
    if (typed === null) return
    if (typed >= changedText.length) {
      setTyped(null)
      return
    }
    const t = window.setTimeout(() => setTyped((n) => (n === null ? null : n + 4)), 12)
    return () => window.clearTimeout(t)
  }, [typed, changedText.length])

  // No mobile o painel acompanha a estrutura que acabou de mudar.
  useEffect(() => {
    setFocusField(state.changed ?? heroCase.fields[0].id)
  }, [state.changed, heroCase])

  const stage = typed !== null ? 'redigindo' : state.changed ? 'laudo' : 'achados'
  const statusText =
    state.status === 'editando'
      ? doc.pending ? 'Aguardando medida' : state.changed ? 'Laudo atualizado' : 'Marque um achado'
      : STATUS_TEXT[state.status]

  const renderLine = (line: ComposedLine, serif = true) => {
    if (line.kind === 'pending') {
      return (
        <p key={line.field} className="mb-2 font-sans text-[0.78rem] italic text-amber-800">
          {line.label}
        </p>
      )
    }
    const isChanged = line.field === state.changed
    const shown = isChanged && typed !== null ? line.text.slice(0, typed) : line.text
    return (
      <p key={line.field} className={`mb-2 rounded-sm transition-colors duration-700 ${isChanged ? 'bg-emerald-50' : 'bg-transparent'} ${serif ? '' : 'font-sans'}`}>
        {shown}
        {isChanged && typed !== null ? <span aria-hidden className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-emerald-600" /> : null}
      </p>
    )
  }

  const copyButton = (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex min-h-11 min-w-[11.5rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 font-sans text-[0.78rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:min-h-9 ${
        state.status === 'copiado-demo' ? 'border-dashed border-emerald-500 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-950'
      }`}
    >
      {state.status === 'copiado' || state.status === 'copiado-demo'
        ? <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
        : <Copy aria-hidden className="h-3.5 w-3.5" />}
      {state.status === 'copiado-demo' ? 'Copiado (simulação)' : state.status === 'copiado' ? 'Exemplo copiado' : 'Copiar exemplo'}
    </button>
  )

  const choose = (field: string, option: string) => dispatch({ type: 'choose', field, option })
  const input = (field: string, value: string) => dispatch({ type: 'input', field, input: value })

  return (
    <div
      ref={root}
      data-hero-demo
      data-stage={stage}
      data-hero-mode={state.mode}
      data-hero-case={heroCase.id}
      {...interruptProps}
      className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-slate-900/10 bg-slate-50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_40px_80px_-40px_rgba(15,23,42,0.45),0_12px_24px_-12px_rgba(15,23,42,0.18)] lg:rounded-r-none"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-3 py-2.5 md:px-4">
        <div
          ref={tabs}
          role="group"
          aria-label="Exames de exemplo"
          className="flex min-w-0 gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] xl:[mask-image:none]"
        >
          {cases.map((c, i) => {
            const active = i === state.caseIndex
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: 'enterCase', caseIndex: i, reset: false })}
                className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-[0.78rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {c.tab}
              </button>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-800">Demonstração</span>
          <span role="status" aria-live={state.mode === 'auto' ? 'off' : 'polite'} className="sr-only whitespace-nowrap text-[0.72rem] font-medium text-slate-500 xl:not-sr-only xl:w-[9.5rem] xl:text-right">
            {statusText}
          </span>
        </div>
      </div>

      {/* MOBILE: uma estrutura por vez, com o trecho do laudo logo abaixo. */}
      <div className="p-3 md:hidden">
        <div role="group" aria-label="Escolher órgão de exemplo" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/60 p-1">
          {heroCase.fields.map((field) => {
            const selected = focusField === field.id
            const altered = values[field.id].option !== field.options[0].id
            return (
              <button
                key={field.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFocusField(field.id)}
                className={`min-h-11 truncate rounded-xl px-1 text-[0.74rem] font-semibold transition-colors ${
                  selected ? 'bg-white text-slate-950 shadow-sm' : altered ? 'text-emerald-800' : 'text-slate-600'
                }`}
              >
                {field.label}
              </button>
            )
          })}
        </div>
        {(() => {
          const field = heroCase.fields.find((f) => f.id === focusField) ?? heroCase.fields[0]
          const line = doc.body.find((l) => l.field === field.id)
          return (
            <div data-hero-organ={field.id} className="mt-2.5 flex h-[35rem] flex-col rounded-2xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[0.84rem] font-semibold text-slate-900">{field.label}</p>
              <HeroFieldControl
                compact
                caseId={`${heroCase.id}-m`}
                field={field}
                value={values[field.id]}
                autoTyping={state.autoTyping === field.id}
                onChoose={(o) => choose(field.id, o)}
                onInput={(v) => input(field.id, v)}
              />
              <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-3 font-['Times_New_Roman',Georgia,serif] text-[0.9rem] leading-[1.55] text-slate-800">
                <p className="mb-1 font-sans text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">No laudo</p>
                <div className="min-h-[7.8rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_88%,transparent)] min-[400px]:min-h-[6.3rem]">
                  {line ? renderLine(line) : <p className="font-sans text-[0.78rem] text-slate-500">Sem frase para esta escolha.</p>}
                </div>
                <p className="mt-2 font-sans text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">Conclusão</p>
                <p className="line-clamp-3 min-h-[4.2rem]">{doc.conclusion.join(' ')}</p>
                <div className="mt-auto pt-3">{copyButton}</div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* DESKTOP: estruturas à esquerda, prévia do laudo à direita. */}
      <div className="hidden md:grid md:h-[620px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:h-[640px]">
        <div className="grid grid-cols-1 content-start gap-2.5 p-4" aria-label="Achados de exemplo">
          {heroCase.fields.map((field) => (
            <fieldset key={field.id} className="h-[11rem] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <legend className="sr-only">{field.label}</legend>
              <p aria-hidden className="mb-2 text-[0.82rem] font-semibold text-slate-900">{field.label}</p>
              <HeroFieldControl
                caseId={heroCase.id}
                field={field}
                value={values[field.id]}
                autoTyping={state.autoTyping === field.id}
                onChoose={(o) => choose(field.id, o)}
                onInput={(v) => input(field.id, v)}
              />
            </fieldset>
          ))}
        </div>

        <article
          aria-label="Laudo de exemplo"
          className="relative m-4 ml-0 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 font-['Times_New_Roman',Georgia,serif] text-[0.92rem] leading-[1.6] text-slate-800"
        >
          <h2 className="mb-1 min-h-[2.6em] text-center text-[0.86rem] font-bold uppercase tracking-wide">{heroCase.title}</h2>
          <p className="mb-4 text-center font-sans text-[0.7rem] text-slate-500">Prévia parcial. Caso demonstrativo com dados sintéticos.</p>
          <div className="min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_90%,transparent)]">
            <p className="mb-1 text-[0.78rem] font-bold uppercase">Achados:</p>
            {doc.body.map((line) => renderLine(line))}
          </div>
          <div className="min-h-[6.2rem] shrink-0 pt-3">
            <p className="mb-1 text-[0.78rem] font-bold uppercase">Conclusão:</p>
            {doc.conclusion.slice(0, 3).map((c, i) => <p key={c}>{i + 1}) {c}</p>)}
          </div>
          <div className="flex min-h-[4.5rem] shrink-0 items-center gap-3 pt-3">
            {copyButton}
            <span
              aria-hidden={state.status !== 'copiado-demo'}
              className={`font-sans text-[0.7rem] leading-4 text-slate-500 transition-opacity ${state.status === 'copiado-demo' ? 'opacity-100' : 'opacity-0'}`}
            >
              Nada foi copiado. Clique para copiar de verdade.
            </span>
          </div>
        </article>
      </div>
    </div>
  )
}
