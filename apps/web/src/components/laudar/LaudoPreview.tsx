'use client'

import { Copy, RotateCcw, WandSparkles } from 'lucide-react'

type Props = {
  text: string
  initialsOn: boolean
  onToggleInitials: () => void
  initials: string
}

function HeaderPrefix({ paragraph }: { paragraph: string }) {
  const matches = ['COMENTÁRIOS:', 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:', 'CONCLUSÃO:']
  const prefix = matches.find((item) => paragraph.startsWith(item))
  if (!prefix) return <span className="whitespace-pre-line">{paragraph}</span>
  return (
    <span className="whitespace-pre-line">
      <strong>{prefix}</strong>
      {paragraph.slice(prefix.length)}
    </span>
  )
}

export function LaudoPreview({ text, initialsOn, onToggleInitials, initials }: Props) {
  const paragraphs = text.split('\n\n')

  const copy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  return (
    <section className="flex min-h-0 flex-col border-l border-gray-200 bg-gray-100">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 px-5 py-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Preview · laudo</div>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
              Atualizando · salvo há 2s
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['B', 'I', 'U'].map((label) => (
            <button key={label} type="button" className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 shadow-sm">
              {label}
            </button>
          ))}
          <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
            Destacar
          </button>
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
            <WandSparkles className="h-3.5 w-3.5" />
            Refazer com IA
          </button>
          <span className="mx-1 h-7 w-px bg-gray-200" />
          <button
            type="button"
            onClick={onToggleInitials}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              initialsOn ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-500'
            }`}
          >
            /{initials} · iniciais
          </button>
          <div className="flex-1" />
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">
            <Copy className="h-3.5 w-3.5" />
            Copiar com formatação
          </button>
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            Copiar texto puro
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <article className="mx-auto min-h-full max-w-[760px] rounded-sm bg-white px-12 py-12 font-['Times_New_Roman'] text-[15px] leading-[1.62] text-gray-950 shadow-xl">
          {paragraphs.map((paragraph, index) => {
            const trimmed = paragraph.trim()
            if (!trimmed) return null
            if (index === 0) {
              return <h1 key={index} className="mb-7 text-center text-base font-bold uppercase tracking-wide">{trimmed}</h1>
            }
            if (/^\/[a-z]+$/i.test(trimmed)) {
              return <p key={index} className="mt-8 text-right font-mono text-[11px] text-gray-400">{trimmed}</p>
            }
            return (
              <p key={index} className="mb-4">
                <HeaderPrefix paragraph={trimmed} />
              </p>
            )
          })}
        </article>
      </div>
    </section>
  )
}
