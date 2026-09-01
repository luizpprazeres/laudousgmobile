'use client'

import { useState } from 'react'
import { Check, Copy, Trash2, X } from 'lucide-react'
import { deleteWebReport } from '@/lib/webReports'
import { categoriaLabel, dataFmt, type HistoryItem } from './HistoryItem'
import { sanitizeReportHtml } from '@/components/laudar/reportRichText'

/**
 * O laudo aberto — o MESMO conteúdo no painel do desktop e na folha do celular.
 *
 * Um só componente porque duplicá-lo garantiria divergência: os dois lados
 * mostrariam laudos ligeiramente diferentes conforme quem mexesse por último.
 * (Desenho portado do histórico do `~/laudousg`, que está morto mas acertou
 * nisto.)
 *
 * `onClose` só existe na folha do celular. No painel não há o que fechar — a
 * lista continua ao lado, e fechar devolveria a tela vazia.
 */
export function ReportDetail({
  item,
  onClose,
  onDeleted,
}: {
  item: HistoryItem
  onClose?: () => void
  onDeleted: (id: string) => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const copiar = async () => {
    try {
      const safeHtml = item.html ? sanitizeReportHtml(item.html) : null
      if (safeHtml && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([safeHtml], { type: 'text/html' }),
            'text/plain': new Blob([item.text], { type: 'text/plain' }),
          })])
        } catch {
          await navigator.clipboard.writeText(item.text)
        }
      } else {
        await navigator.clipboard.writeText(item.text)
      }
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Selecione o texto e use Ctrl+C.')
    }
  }

  const excluir = async () => {
    if (!confirm('Excluir este laudo do histórico?')) return
    setExcluindo(true)
    setErro(null)
    try {
      await deleteWebReport(item.id)
      onDeleted(item.id)
    } catch {
      /** Falhou: o laudo continua lá, e o médico precisa saber disso. */
      setErro('Não foi possível excluir. Tente de novo.')
      setExcluindo(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-3.5 dark:border-gray-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OriginBadge origin={item.origin} />
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {item.title ?? categoriaLabel(item.category)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{dataFmt(item.date)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={copiar}
            title="Copiar laudo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>

          {/*
            Só laudo da web se exclui. Os da IA vêm da tabela `reports`, que o
            app e o histórico do médico compartilham — apagar aqui removeria o
            laudo de outro lugar.
          */}
          {item.origin === 'web' ? (
            <button
              type="button"
              onClick={excluir}
              disabled={excluindo}
              title="Excluir do histórico"
              aria-label="Excluir do histórico"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      {erro ? (
        <p className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {erro}
        </p>
      ) : null}

      {/*
        O laudo com a cara de laudo: serifada, entrelinha folgada. É o texto que
        o médico vai colar num documento, e vê-lo aqui como ele sairá lá evita a
        surpresa na hora de assinar.
      */}
      {item.html ? (
        <article
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-800 [&_h1]:mb-7 [&_h1]:text-center [&_h1]:font-bold [&_h1]:uppercase [&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_p]:mb-4 dark:text-gray-200 dark:[&_mark]:bg-amber-700/70"
          dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(item.html) }}
        />
      ) : (
        <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-5 font-['Times_New_Roman',Georgia,serif] text-[13.5px] leading-relaxed text-gray-800 dark:text-gray-200">
          {item.text}
        </pre>
      )}
    </div>
  )
}

export function OriginBadge({ origin }: { origin: HistoryItem['origin'] }) {
  const web = origin === 'web'
  return (
    <span
      title={web ? 'Montado na web, sem IA' : 'Gerado com IA, pelo aplicativo'}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        web
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
          : 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400'
      }`}
    >
      {web ? 'Web' : 'IA'}
    </span>
  )
}
