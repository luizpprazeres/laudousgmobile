'use client'

import { useState } from 'react'
import type { Field, OrganSchema, OrganState } from '@/lib/deterministic'

type Props = {
  schema: OrganSchema
  state: OrganState
  onChange: (next: OrganState) => void
}

function asArray(value: OrganState[string]) {
  return Array.isArray(value) ? value : []
}

function isSelected(state: OrganState, field: Field, value: string) {
  const current = state[field.key]
  if (field.kind === 'checklist') return asArray(current).includes(value)
  return current === value
}

export function OrganFormPanel({ schema, state, onChange }: Props) {
  const [rareOpen, setRareOpen] = useState(false)

  const setValue = (key: string, value: string | string[]) => onChange({ ...state, [key]: value })

  const toggleChecklist = (field: Field, value: string) => {
    const current = asArray(state[field.key])
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
    setValue(field.key, next)
  }

  const renderMiniField = (field: Field, keyPrefix?: string) => {
    const key = keyPrefix ?? field.key
    if (field.kind === 'text') {
      return (
        <label key={key} className="block">
          <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-400">{field.label}</span>
          <input
            value={(state[key] as string) ?? ''}
            onChange={(event) => setValue(key, event.target.value)}
            placeholder={field.placeholder}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      )
    }

    return (
      <div key={key}>
        <div className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-400">{field.label}</div>
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
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
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
    if (field.kind === 'segmented') {
      return (
        <section key={field.key} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{field.label}</h3>
            {field.hint ? <span className="text-[11px] text-gray-400">{field.hint}</span> : null}
          </div>
          <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4">
            {(field.options ?? []).map((option) => {
              const active = isSelected(state, field, option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue(field.key, option.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition ${
                    active
                      ? 'border-emerald-200 bg-white font-bold text-gray-900 shadow-sm ring-1 ring-emerald-100'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>
      )
    }

    if (field.kind === 'checklist') {
      const selected = asArray(state[field.key])
      return (
        <section key={field.key} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{field.label}</h3>
            {field.hint ? <span className="text-[11px] text-gray-400">{field.hint}</span> : null}
          </div>
          <div className="space-y-1.5">
            {(field.options ?? []).map((option) => {
              const active = selected.includes(option.value)
              return (
                <div key={option.value} className="rounded-lg border border-gray-100 bg-gray-50/70">
                  <button
                    type="button"
                    onClick={() => toggleChecklist(field, option.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                      active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-gray-800">{option.label}</span>
                    {option.isDefault ? <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-gray-400">default</span> : null}
                  </button>
                  {active && option.subFields?.length ? (
                    <div className="mx-3 mb-3 grid gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/35 p-2.5">
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
      <section key={field.key} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
        {renderMiniField(field)}
      </section>
    )
  }

  const rareSelected = asArray(state.raros)
  const rareLabels = (schema.rareFindings ?? []).map((finding) => finding.label).join(', ')

  return (
    <div className="space-y-2.5">
      {schema.fields.map(renderField)}
      {schema.rareFindings?.length ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => setRareOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <span className="text-[13px] font-semibold text-gray-800">+ Achados raros</span>
              <span className="ml-2 text-[11px] text-gray-400">{rareLabels}</span>
            </span>
            <span className="flex-shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-500">{schema.rareFindings.length}</span>
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
                      active ? 'border-violet-200 bg-violet-50 font-semibold text-violet-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 flex-shrink-0 rounded border ${active ? 'border-violet-500 bg-violet-500' : 'border-gray-300 bg-white'}`} />
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
