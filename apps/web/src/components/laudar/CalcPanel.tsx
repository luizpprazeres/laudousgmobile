'use client'

import { useState } from 'react'
import { Copy, Wand2 } from 'lucide-react'
import type { ExamStateLike, StandardCalcSpec } from '@/lib/calculators/specs'

export function CalcPanel({ spec, examState }: { spec: StandardCalcSpec; examState?: ExamStateLike }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: s[k] === v ? '' : v }))
  const setMultiple = (k: string, v: string) => setValues((s) => {
    const current = new Set((s[k] ?? '').split('|').filter(Boolean))
    if (v === 'nenhum_cauda_cometa') {
      return { ...s, [k]: current.has(v) ? '' : v }
    }
    current.delete('nenhum_cauda_cometa')
    if (current.has(v)) current.delete(v)
    else current.add(v)
    return { ...s, [k]: Array.from(current).join('|') }
  })

  const extract = () => {
    if (!spec.extract || !examState) return
    const v = spec.extract(examState)
    if (v) setValues(v)
  }

  let result: ReturnType<StandardCalcSpec['compute']> = null
  try {
    result = spec.compute(values)
  } catch {
    result = null
  }

  const copy = async () => {
    if (result && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(result.block)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{spec.name}</h3>
        {spec.extract && examState ? (
          <button
            type="button"
            onClick={extract}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40"
          >
            <Wand2 className="h-3 w-3" /> Extrair dos achados
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {spec.fields.map((field) => (
          <div key={field.key}>
            <div className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{field.label}</div>
            {field.type === 'text' ? (
              <input
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((s) => ({ ...s, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="h-8 w-28 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-emerald-900/50"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(field.options ?? []).map((o) => {
                  const active = field.multiple
                    ? (values[field.key] ?? '').split('|').includes(o.value)
                    : values[field.key] === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => field.multiple ? setMultiple(field.key, o.value) : set(field.key, o.value)}
                      className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition ${
                        active ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        {result ? (
          <>
            <div className="font-barlow text-lg font-bold text-emerald-800 dark:text-emerald-300">{result.headline}</div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">{result.block}</pre>
            <button
              type="button"
              onClick={copy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar resultado
            </button>
          </>
        ) : (
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Selecione as características para calcular.</p>
        )}
      </div>
    </section>
  )
}
