'use client'

import { checkMeasure, rangeMessage, type FieldValue, type HeroField } from './heroCases'

type Props = {
  caseId: string
  field: HeroField
  value: FieldValue
  autoTyping: boolean
  onChoose: (option: string) => void
  onInput: (input: string) => void
  compact?: boolean
}

/**
 * Uma estrutura: opções em chips e, quando a opção pede medida, um campo
 * numérico de verdade (controlado, teclado decimal). A autoplay escreve no
 * mesmo campo que a pessoa usa; nada é botão com a medida embutida.
 */
export function HeroFieldControl({ caseId, field, value, autoTyping, onChoose, onInput, compact }: Props) {
  const option = field.options.find((o) => o.id === value.option) ?? field.options[0]
  const measure = option.measure
  const check = measure ? checkMeasure(value.input, measure) : null
  const error = check && (check.kind === 'invalid' || check.kind === 'out-of-range')
  const inputId = `hero-${caseId}-${field.id}-medida`
  const helpId = `${inputId}-ajuda`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {field.options.map((opt) => {
          const active = opt.id === value.option
          const isBaseline = opt.id === field.options[0].id
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChoose(opt.id)}
              className={`min-h-11 rounded-xl border px-3 text-[0.8rem] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${compact ? '' : 'md:min-h-9'} ${
                active
                  ? isBaseline
                    ? 'border-slate-300 bg-slate-100 text-slate-900'
                    : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {measure ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-[0.72rem] font-medium text-slate-600">
            {measure.label}
          </label>
          <div
            className={`flex h-11 w-[9.5rem] items-center rounded-xl border bg-white pr-3 transition-[border-color,box-shadow] duration-150 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/25 md:h-9 ${
              error ? 'border-rose-400' : autoTyping ? 'border-emerald-500 ring-2 ring-emerald-500/25' : 'border-slate-300'
            }`}
          >
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              value={value.input}
              onChange={(e) => onInput(e.target.value)}
              aria-invalid={error || undefined}
              aria-describedby={helpId}
              placeholder="0,0"
              className="h-full min-w-0 flex-1 rounded-xl bg-transparent px-3 text-[0.86rem] tabular-nums text-slate-950 placeholder:text-slate-400 focus:outline-none"
            />
            <span aria-hidden className="text-[0.78rem] text-slate-500">{measure.unit}</span>
          </div>
          <p id={helpId} className={`min-h-[1rem] text-[0.7rem] leading-4 ${error ? 'text-rose-700' : 'text-slate-500'}`}>
            {check?.kind === 'invalid'
              ? 'Número com vírgula, ex.: 1,2.'
              : check?.kind === 'out-of-range'
                ? rangeMessage(measure)
                : check?.kind === 'ok'
                  ? 'Medida no laudo.'
                  : 'Digite a medida para redigir a frase.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
