'use client'

import { useState } from 'react'
import type { Field, OrganSchema, OrganState } from '@/lib/deterministic'

type Props = {
  schema: OrganSchema
  state: OrganState
  onChange: (next: OrganState) => void
  compact?: boolean
  gestationalWeeks?: number | null
}

function asArray(value: OrganState[string]) {
  return Array.isArray(value) ? value : []
}

function isSelected(state: OrganState, field: Field, value: string) {
  const current = state[field.key]
  if (field.kind === 'checklist') return asArray(current).includes(value)
  return current === value
}

export function OrganFormPanel({ schema, state, onChange, compact = false, gestationalWeeks }: Props) {
  const [rareOpen, setRareOpen] = useState(false)

  const fieldCardClass = compact
    ? 'rounded-lg border border-gray-100 bg-gray-50/65 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900/55'
    : 'rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900'

  const setValue = (key: string, value: string | string[]) => onChange({ ...state, [key]: value })

  const toggleChecklist = (field: Field, value: string) => {
    const current = asArray(state[field.key])
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
    setValue(field.key, next)
  }

  const renderMiniField = (field: Field, keyPrefix?: string) => {
    if (
      field.minGestationalWeeks !== undefined &&
      gestationalWeeks !== undefined &&
      gestationalWeeks !== null &&
      gestationalWeeks < field.minGestationalWeeks
    ) return null
    const key = keyPrefix ?? field.key
    const widthClass = field.halfWidth ? 'min-w-0' : 'col-span-2'
    if (field.kind === 'text') {
      return (
        <label key={key} className={`block ${widthClass}`}>
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</span>
          <input
            value={(state[key] as string) ?? ''}
            onChange={(event) => setValue(key, event.target.value)}
            placeholder={field.placeholder}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50"
          />
        </label>
      )
    }

    return (
      <div key={key} className={widthClass}>
        <div className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</div>
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((option) => {
            const active = state[key] === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue(key, option.value)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderField = (field: Field) => {
    if (
      field.minGestationalWeeks !== undefined &&
      gestationalWeeks !== undefined &&
      gestationalWeeks !== null &&
      gestationalWeeks < field.minGestationalWeeks
    ) return null
    if (field.kind === 'volume') {
      const factor = field.factor ?? 0.523
      const unit = field.unit ?? 'mL'
      const dimKey = (i: number) => `${field.key}.d${i}`
      const calc = () => {
        const d = [1, 2, 3].map((i) => parseFloat(String(state[dimKey(i)] ?? '').replace(',', '.')))
        if (d.every((n) => Number.isFinite(n) && n > 0)) {
          setValue(field.key, String(Math.round((d[0] as number) * (d[1] as number) * (d[2] as number) * factor)))
        }
      }
      const dimInput = (i: number) => (
        <input
          key={i}
          value={(state[dimKey(i)] as string) ?? ''}
          onChange={(event) => setValue(dimKey(i), event.target.value)}
          placeholder={['L', 'AP', 'T'][i - 1]}
          className="h-8 w-14 rounded-lg border border-gray-200 bg-white px-2 text-center text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50"
        />
      )
      return (
        <section key={field.key} className={fieldCardClass}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{field.label}</h3>
            {field.hint ? <span className="text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={(state[field.key] as string) ?? ''}
              onChange={(event) => setValue(field.key, event.target.value)}
              placeholder={field.placeholder}
              className="h-9 w-24 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50"
            />
            <span className="text-[12px] text-gray-500 dark:text-gray-400">{unit}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">ou calcular:</span>
            {dimInput(1)}<span className="text-gray-500 dark:text-gray-400">×</span>{dimInput(2)}<span className="text-gray-500 dark:text-gray-400">×</span>{dimInput(3)}
            <button
              type="button"
              onClick={calc}
              className="ml-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              = calcular
            </button>
          </div>
        </section>
      )
    }
    if (field.kind === 'segmented') {
      return (
        <section key={field.key} className={fieldCardClass}>
          <div className={compact ? 'grid grid-cols-[92px_minmax(0,1fr)] items-start gap-2' : undefined}>
            <div className={`${compact ? 'pt-1' : 'mb-2.5'} flex items-start justify-between gap-2`}>
              <h3 className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</h3>
              {field.hint ? <span className={`${compact ? 'hidden' : ''} text-[11px] text-gray-500 dark:text-gray-400`}>{field.hint}</span> : null}
            </div>
            <div className={`grid grid-cols-2 gap-1 ${compact ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
              {(field.options ?? []).map((option) => {
                const active = isSelected(state, field, option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue(field.key, option.value)}
                    className={`rounded-md border px-2 py-1 text-left text-[12px] leading-tight transition ${
                      active
                        ? 'border-emerald-200 bg-white font-bold text-gray-900 shadow-sm ring-1 ring-emerald-100 dark:border-emerald-800 dark:bg-gray-900 dark:text-gray-100 dark:ring-emerald-900/50'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          {(field.options ?? []).map((option) =>
            isSelected(state, field, option.value) && option.subFields?.length ? (
              <div
                key={`sub-${option.value}`}
                className="mt-2.5 grid grid-cols-2 gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/35 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              >
                {option.subFields.map((subField) =>
                  renderMiniField(subField, `${field.key}.${option.value}.${subField.key}`)
                )}
              </div>
            ) : null
          )}
        </section>
      )
    }

    if (field.kind === 'checklist') {
      const selected = asArray(state[field.key])
      return (
        <section key={field.key} className={fieldCardClass}>
          <div className={`${compact ? 'mb-1.5' : 'mb-2'} flex items-center justify-between gap-3`}>
            <h3 className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</h3>
            {field.hint ? <span className="text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</span> : null}
          </div>
          <div className={compact ? 'grid grid-cols-3 gap-1' : 'space-y-1.5'}>
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option.value)
              return (
                <div key={option.value} className={`rounded-md border border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/40 ${compact && active && option.subFields?.length ? 'col-span-3' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleChecklist(field, option.value)}
                    className={`flex w-full items-center text-left ${compact ? 'gap-1.5 px-2 py-1.5' : 'gap-2.5 px-3 py-2'}`}
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                      active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-900'
                    }`}>
                      ✓
                    </span>
                    <span className={`${compact ? 'text-[11.5px] leading-tight' : 'text-[13px]'} flex-1 font-semibold text-gray-800 dark:text-gray-200`}>{option.label}</span>
                    {option.isDefault ? <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">default</span> : null}
                  </button>
                  {active && option.subFields?.length ? (
                    <div className="mx-3 mb-3 grid grid-cols-2 gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/35 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      {option.subFields.map((subField) =>
                        renderMiniField(subField, `${field.key}.${option.value}.${subField.key}`)
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      )
    }

    return (
      <section key={field.key} className={fieldCardClass}>
        {renderMiniField(field)}
      </section>
    )
  }

  const rareSelected = asArray(state.raros)
  const rareLabels = (schema.rareFindings ?? []).map((finding) => finding.label).join(', ')

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      {schema.id === 'ig' ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-1.5">
            {schema.fields.slice(0, 2).map(renderField)}
          </div>
          {schema.fields.slice(2).map(renderField)}
        </>
      ) : schema.fields.map(renderField)}
      {schema.rareFindings?.length ? (
        <section className={`${compact ? 'rounded-lg px-2.5 py-2' : 'rounded-xl px-3.5 py-2.5'} border border-dashed border-gray-300 bg-white/70 dark:border-gray-700 dark:bg-gray-900/70`}>
          <button
            type="button"
            onClick={() => setRareOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">+ Achados raros</span>
              <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">{rareLabels}</span>
            </span>
            <span className="flex-shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">{schema.rareFindings.length}</span>
          </button>
          {rareOpen ? (
            <div className="mt-2.5 grid gap-1.5">
              {schema.rareFindings.map((option) => {
                const active = rareSelected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? rareSelected.filter((item) => item !== option.value)
                        : [...rareSelected, option.value]
                      setValue('raros', next)
                    }}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-[13px] transition ${
                      active ? 'border-violet-200 bg-violet-50 font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 flex-shrink-0 rounded border ${active ? 'border-violet-500 bg-violet-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
