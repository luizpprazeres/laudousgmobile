'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, FileDown, Move, Radio, X } from 'lucide-react'
import type { OrganState, TireoideState } from '@/lib/deterministic'
import { breastFindingsFromState, moveBreastFinding, moveThyroidFinding, thyroidFindingsFromState } from '@/lib/visualSchemas/adapters'
import { BreastSchema } from './BreastSchema'
import { ThyroidSchema } from './ThyroidSchema'
import { base64Only, downloadDataUrl, schemaPdf, schemaPng } from './exportSchema'

type Props = {
  category: 'MAMARIA' | 'TIREOIDE'
  breastState: OrganState
  thyroidState: TireoideState
  onBreastChange: (state: OrganState) => void
  onThyroidChange: (state: TireoideState) => void
  onClose: () => void
}

export function VisualSchemaPanel({ category, breastState, thyroidState, onBreastChange, onThyroidChange, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [status, setStatus] = useState<'idle' | 'working' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const breast = useMemo(() => breastFindingsFromState(breastState), [breastState])
  const thyroid = useMemo(() => thyroidFindingsFromState(thyroidState), [thyroidState])
  const findingsCount = category === 'MAMARIA' ? breast.length : thyroid.length
  const name = category === 'MAMARIA' ? 'esquema-mamas' : 'esquema-tireoide'

  async function createFiles() {
    if (!svgRef.current) throw new Error('O esquema ainda não está pronto.')
    const png = await schemaPng(svgRef.current)
    const pdf = await schemaPdf(png, category === 'MAMARIA')
    return { png, pdf }
  }

  async function run(action: 'png' | 'pdf' | 'sala') {
    setStatus('working')
    setMessage('Preparando o esquema…')
    try {
      const files = await createFiles()
      if (action === 'png') downloadDataUrl(files.png, `${name}.png`)
      if (action === 'pdf') downloadDataUrl(files.pdf, `${name}.pdf`)
      if (action === 'sala') {
        const response = await fetch('/api/sala/schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examType: category === 'MAMARIA' ? 'MAMA' : 'TIREOIDE',
            examLabel: category === 'MAMARIA' ? 'Esquema de mamas e axilas' : 'Esquema de tireoide',
            png: base64Only(files.png),
            pdf: base64Only(files.pdf),
          }),
        })
        const body = await response.json().catch(() => null) as { error?: string } | null
        if (!response.ok) throw new Error(body?.error || 'A Sala não recebeu o esquema.')
        setStatus('sent')
        setMessage('Esquema enviado para a Sala.')
        return
      }
      setStatus('idle')
      setMessage('Arquivo pronto.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível preparar o esquema.')
    }
  }

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]">
    <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Move className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><h2 className="font-barlow text-lg font-bold">Esquema visual</h2><p className="text-[11px] text-gray-500">Arraste os marcadores. O formulário será atualizado junto.</p></div>
      <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Voltar ao laudo"><X className="h-4 w-4" /></button>
    </header>
    <div className="min-h-0 flex-1 overflow-auto bg-gray-50 p-4 dark:bg-gray-950/40">
      {category === 'MAMARIA'
        ? <BreastSchema findings={breast} svgRef={svgRef} onMove={(id, position) => onBreastChange(moveBreastFinding(breastState, id, position))} />
        : <ThyroidSchema findings={thyroid} svgRef={svgRef} onMove={(id, position) => onThyroidChange(moveThyroidFinding(thyroidState, id, position))} />}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {findingsCount ? `${findingsCount} ${findingsCount === 1 ? 'marcador' : 'marcadores'} no esquema.` : 'Adicione um achado no formulário para ele aparecer aqui.'}
        <span className="ml-1 text-gray-400">O desenho não muda classificações clínicas.</span>
      </div>
      {message ? <p className={`mt-2 text-xs ${status === 'error' ? 'text-rose-600' : status === 'sent' ? 'text-emerald-600' : 'text-gray-500'}`}>{message}</p> : null}
    </div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
      <button type="button" disabled={status === 'working'} onClick={() => void run('png')} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"><Download className="h-3.5 w-3.5" /> PNG</button>
      <button type="button" disabled={status === 'working'} onClick={() => void run('pdf')} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"><FileDown className="h-3.5 w-3.5" /> PDF</button>
      <div className="flex-1" />
      <button type="button" disabled={status === 'working'} onClick={() => void run('sala')} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Radio className="h-3.5 w-3.5" /> {status === 'working' ? 'Enviando…' : 'Enviar para a Sala'}</button>
    </footer>
  </section>
}
