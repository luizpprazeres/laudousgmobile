'use client'

import { useState } from 'react'
import type { Field, OrganSchema, OrganState } from '@/lib/deterministic'
import { RenalMeasurementsFields } from './RenalMeasurementsFields'
import { hasRenalMeasurementsGroup, RENAL_MEASUREMENT_KEYS } from './renalMeasurementsState'

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

// Alvos: 30-34px no desktop (md+), 44px no toque. As colunas nunca dependem do
// viewport: auto-fit adapta ao que o card do órgão realmente tem de largura.
const CONTROL_MIN_H = 'min-h-11 md:min-h-8'
const INPUT_H = 'h-11 md:h-8'
const OPTION_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-1'
const CHECKLIST_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-1'
const CHECKLIST_GRID_WIDE = 'grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-1'

function visibleHint(hint?: string) {
  return hint && !/^default\s*:/i.test(hint.trim()) ? hint : null
}

export function OrganFormPanel({ schema, state, onChange, compact = false, gestationalWeeks }: Props) {
  const [rareOpen, setRareOpen] = useState(false)
  const renalMeasurements = hasRenalMeasurementsGroup(schema)

  const compactFields = compact && (schema.id === 'bexiga' || schema.id.startsWith('rim_'))
  const fieldCardClass = (compactFields ? 'col-span-2 ' : '') + (compact
    ? 'rounded-lg border border-gray-100 bg-gray-50/65 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/55'
    : 'rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900')

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
    const widthClass = field.halfWidth ? 'min-w-0' : 'col-span-2 min-w-0'
    if (field.kind === 'text') {
      return (
        <label key={key} className={`block ${widthClass}`}>
          <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</span>
          <input
            value={(state[key] as string) ?? ''}
            onChange={(event) => setValue(key, event.target.value)}
            placeholder={field.placeholder}
            className={`${INPUT_H} w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50`}
          />
        </label>
      )
    }

    return (
      <div key={key} className={widthClass}>
        <div className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</div>
        <div className={OPTION_GRID}>
          {(field.options ?? []).map((option) => {
            const active = state[key] === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setValue(key, option.value)}
                className={`${CONTROL_MIN_H} flex min-w-0 items-center justify-center rounded-md border px-2 py-1 text-center text-[12px] font-semibold leading-tight transition [overflow-wrap:anywhere] ${
                  active
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
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
    if (renalMeasurements && RENAL_MEASUREMENT_KEYS.some(key => key === field.key)) return null
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
      const rawDimensions = [1, 2, 3].map(i => String(state[dimKey(i)] ?? '').trim())
      const dimensions = rawDimensions.map(raw => /^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(',', '.')) : NaN)
      const canCalculate = dimensions.every(n => Number.isFinite(n) && n > 0)
      const calc = () => {
        if (canCalculate) {
          setValue(field.key, String(Math.round(dimensions[0]! * dimensions[1]! * dimensions[2]! * factor)))
        }
      }
      const dimInput = (i: number) => (
        <input
          key={i}
          aria-label={`${field.label} — ${['L', 'AP', 'T'][i - 1]} (cm)`}
          inputMode="decimal"
          value={(state[dimKey(i)] as string) ?? ''}
          onChange={(event) => setValue(dimKey(i), event.target.value)}
          placeholder={['L', 'AP', 'T'][i - 1]}
          className={`${INPUT_H} w-12 min-w-0 max-w-14 flex-1 rounded-lg border border-gray-200 bg-white px-1 text-center text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50`}
        />
      )
      return (
        <section key={field.key} className={fieldCardClass}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{field.label}</h3>
            {visibleHint(field.hint) ? <span className="text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label={`${field.label} (${unit})`}
              inputMode="decimal"
              value={(state[field.key] as string) ?? ''}
              onChange={(event) => setValue(field.key, event.target.value)}
              placeholder={field.placeholder}
              className={`${INPUT_H} w-24 min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50`}
            />
            <span className="text-[12px] text-gray-500 dark:text-gray-400">{unit}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">ou calcular:</span>
            <div className="flex min-w-0 items-center gap-1">
              {dimInput(1)}<span className="text-gray-500 dark:text-gray-400">×</span>{dimInput(2)}<span className="text-gray-500 dark:text-gray-400">×</span>{dimInput(3)}
            </div>
            <button
              type="button"
              disabled={!canCalculate}
              onClick={calc}
              className={`${CONTROL_MIN_H} rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40`}
            >
              = calcular
            </button>
          </div>
          {rawDimensions.some(Boolean) && !canCalculate ? <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-300">Informe três medidas positivas em cm para calcular.</p> : null}
        </section>
      )
    }
    if (field.kind === 'segmented') {
      if (field.presentation === 'select') {
        const selected = String(state[field.key] ?? field.options?.find(option => option.isDefault)?.value ?? '')
        return (
          <section key={field.key} className={fieldCardClass}>
            <label className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={field.hideLabel ? 'sr-only' : 'text-[11px] font-semibold text-gray-500'}>{field.label}</span>
              <select aria-label={field.label} value={selected} onChange={event => setValue(field.key, event.target.value)}
                className={`${INPUT_H} min-w-0 max-w-full rounded-lg border border-gray-200 bg-gray-50 px-2 text-[12px] text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100`}>
                {(field.options ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {renalMeasurements && field.key === 'dimensoes' ? <RenalMeasurementsFields schema={schema} state={state} onChange={onChange} /> : null}
            {(field.options ?? []).filter(option => option.value === selected && option.subFields?.length).map(option => (
              <div key={option.value} className="mt-2 grid grid-cols-2 gap-2">
                {option.subFields?.map(subField => renderMiniField(subField, `${field.key}.${option.value}.${subField.key}`))}
              </div>
            ))}
          </section>
        )
      }
      return (
        <section key={field.key} className={fieldCardClass}>
          <div className={compact ? 'flex flex-wrap items-start gap-x-2 gap-y-1' : undefined}>
            <div className={`${compact ? 'w-[92px] flex-shrink-0 pt-1' : 'mb-1.5'} flex items-start justify-between gap-2`}>
              <h3 className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</h3>
              {visibleHint(field.hint) ? <span className={`${compact ? 'hidden' : ''} text-[11px] text-gray-500 dark:text-gray-400`}>{field.hint}</span> : null}
            </div>
            <div className={`${OPTION_GRID} ${compact ? 'min-w-0 flex-1 basis-40' : ''}`}>
              {(field.options ?? []).map((option) => {
                const active = isSelected(state, field, option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setValue(field.key, option.value)}
                    className={`${CONTROL_MIN_H} flex min-w-0 items-center rounded-md border px-2 py-1 text-left text-[12px] leading-tight transition [overflow-wrap:anywhere] ${
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
          {renalMeasurements && field.key === 'dimensoes' ? (
            <RenalMeasurementsFields schema={schema} state={state} onChange={onChange} />
          ) : null}
          {(field.options ?? []).map((option) =>
            isSelected(state, field, option.value) && option.subFields?.length ? (
              <div
                key={`sub-${option.value}`}
                className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/35 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/20"
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</h3>
            {visibleHint(field.hint) ? <span className="text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</span> : null}
          </div>
          <div className={compact ? CHECKLIST_GRID : CHECKLIST_GRID_WIDE}>
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option.value)
              return (
                <div key={option.value} className={`rounded-md border border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-800/40 min-w-0 ${active && option.subFields?.length ? '[grid-column:1/-1]' : field.options?.length === 1 ? 'w-fit' : ''}`}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChecklist(field, option.value)}
                    className={`${CONTROL_MIN_H} flex w-full min-w-0 items-center text-left ${active && option.subFields?.length ? '' : 'h-full'} ${compact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-2.5 py-1'}`}
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                      active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-900'
                    }`}>
                      ✓
                    </span>
                    <span className={`${compact ? 'text-[11.5px] leading-tight' : 'text-[13px]'} min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere] font-semibold text-gray-800 dark:text-gray-200`}>{option.label}</span>
                  </button>
                  {active && option.subFields?.length ? (
                    <div className="mx-2 mb-2 grid grid-cols-2 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/35 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
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
      <section key={field.key} className={compactFields && field.halfWidth ? fieldCardClass.replace('col-span-2', 'col-span-1') : fieldCardClass}>
        {renderMiniField(field)}
      </section>
    )
  }

  const rareSelected = asArray(state.raros)
  const rareLabels = (schema.rareFindings ?? []).map((finding) => finding.label).join(', ')

  return (
    <div data-organ-schema={schema.id} className={schema.id === 'biometria' || compactFields ? 'grid grid-cols-2 gap-2' : compact ? 'space-y-1' : 'space-y-2'}>
      {schema.id === 'ig' ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-1.5">
            {schema.fields.slice(0, 2).map(renderField)}
          </div>
          {schema.fields.slice(2).map(renderField)}
        </>
      ) : schema.fields.map(renderField)}
      {schema.rareFindings?.length ? (
        <section className={`${compactFields ? 'col-span-2' : ''} ${compact ? 'rounded-lg px-2 py-1.5' : 'rounded-xl px-3 py-2'} border border-dashed border-gray-300 bg-white/70 dark:border-gray-700 dark:bg-gray-900/70`}>
          <button
            type="button"
            aria-expanded={rareOpen}
            onClick={() => setRareOpen((value) => !value)}
            className={`${CONTROL_MIN_H} flex w-full items-center justify-between gap-3 text-left`}
          >
            <span className="min-w-0">
              <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">+ Achados raros</span>
              <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">{rareLabels}</span>
            </span>
            <span className="flex-shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-500 dark:bg-violet-950/40 dark:text-violet-300">{schema.rareFindings.length}</span>
          </button>
          {rareOpen ? (
            <div className="mt-2 grid gap-1">
              {schema.rareFindings.map((option) => {
                const active = rareSelected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const next = active
                        ? rareSelected.filter((item) => item !== option.value)
                        : [...rareSelected, option.value]
                      setValue('raros', next)
                    }}
                    className={`${CONTROL_MIN_H} flex items-center gap-2 rounded-lg border px-2.5 py-1 text-left text-[13px] transition ${
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
