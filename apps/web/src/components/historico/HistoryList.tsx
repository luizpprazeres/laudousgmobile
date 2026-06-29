'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Copy, Trash2 } from 'lucide-react'
import { deleteWebReport } from '@/lib/webReports'

export type HistoryItem = {
  id: string
  origin: 'web' | 'ia'
  category: string
  title: string | null
  text: string
  date: string
}

/** Código de categoria → rótulo legível (ex.: ABDOMEN_TOTAL → Abdome total). */
function categoriaLabel(code: string): string {
  const map: Record<string, string> = {
    ABDOMEN_TOTAL: 'Abdome total',
    ABDOME_SUPERIOR: 'Abdome superior',
    PROSTATA_SUPRAPUBICA: 'Próstata',
    VIAS_URINARIAS: 'Vias urinárias',
    MAMARIA: 'Mamária',
    PELVE_FEMININA: 'Pelve feminina',
    CERVICAL: 'Cervical',
    PARTES_MOLES: 'Partes moles',
    TIREOIDE: 'Tireoide',
    MUSCULOESQUELETICO: 'Musculoesquelético',
    OBSTETRICA: 'Obstétrica',
    MORFOLOGICO: 'Morfológica',
    DOPPLER_OBSTETRICO: 'Doppler obstétrico',
  }
  return map[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ')
}

function dataFmt(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso
}

function Row({ item, onDeleted }: { item: HistoryItem; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const copy = () => navigator.clipboard?.writeText(item.text)
  const remove = async () => {
    if (!confirm('Excluir este laudo do histórico?')) return
    setDeleting(true)
    try {
      await deleteWebReport(item.id)
      onDeleted(item.id)
    } catch {
      setDeleting(false)
    }
  }
  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-800">{item.title ?? categoriaLabel(item.category)}</div>
            <div className="text-xs text-gray-400">{dataFmt(item.date)}</div>
          </div>
        </button>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            item.origin === 'web' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'
          }`}
          title={item.origin === 'web' ? 'Gerado na web (sem IA)' : 'Gerado com IA (app)'}
        >
          {item.origin === 'web' ? 'Web' : 'IA'}
        </span>
        <button type="button" onClick={copy} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700" title="Copiar">
          <Copy className="h-4 w-4" />
        </button>
        {item.origin === 'web' ? (
          <button type="button" onClick={remove} disabled={deleting} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap border-t border-gray-100 bg-gray-50 px-5 py-4 font-['Times_New_Roman'] text-[13px] leading-relaxed text-gray-800">
          {item.text}
        </pre>
      ) : null}
    </li>
  )
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [list, setList] = useState(items)
  const onDeleted = (id: string) => setList((l) => l.filter((x) => x.id !== id))

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link href="/app" className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Link>
            <h1 className="font-barlow text-2xl font-bold text-gray-900">Histórico de laudos</h1>
            <p className="text-sm text-gray-500">{list.length} laudo(s) — web e IA juntos.</p>
          </div>
          <Link href="/app/gerar" className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
            Novo laudo
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-gray-700">Nenhum laudo salvo ainda</p>
            <p className="mt-1 text-sm text-gray-500">Gere um laudo e clique em “Salvar laudo” — ele aparece aqui.</p>
            <Link href="/app/gerar" className="mt-5 inline-block rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              Gerar meu primeiro laudo
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((item) => (
              <Row key={`${item.origin}-${item.id}`} item={item} onDeleted={onDeleted} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
