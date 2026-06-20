'use client'

import { useState } from 'react'
import { Copy, Wand2 } from 'lucide-react'
import type { CalcSpec, ExamStateLike } from '@/lib/calculators/specs'

export function CalcPanel({ spec, examState }: { spec: CalcSpec; examState?: ExamStateLike }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: s[k] === v ? '' : v }))

  const extract = () => {
    if (!spec.extract || !examState) return
    const v = spec.extract(examState)
    if (v) setValues(v)
  }

  let result: ReturnType<CalcSpec['compute']> = null
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
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{spec.name}</h3>
        {spec.extract && examState ? (
          <button
            type="button"
            onClick={extract}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-100"
          >
            <Wand2 className="h-3 w-3" /> Extrair dos achados
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {spec.fields.map((field) => (
          <div key={field.key}>
            <div className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-gray-400">{field.label}</div>
            {field.type === 'text' ? (
              <input
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((s) => ({ ...s, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="h-8 w-28 rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(field.options ?? []).map((o) => {
                  const active = values[field.key] === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set(field.key, o.value)}
                      className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition ${
                        active ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
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

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
        {result ? (
          <>
            <div className="font-barlow text-lg font-bold text-emerald-800">{result.headline}</div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-gray-600">{result.block}</pre>
            <button
              type="button"
              onClick={copy}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar resultado
            </button>
          </>
        ) : (
          <p className="text-[12px] text-gray-400">Selecione as características para calcular.</p>
        )}
      </div>
    </section>
  )
}
