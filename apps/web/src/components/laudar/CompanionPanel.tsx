'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Image, Loader2, Mic, RefreshCw, Smartphone, X } from 'lucide-react'
import type { CompanionStructuredPayload } from '@/lib/companionStructured'
import {
  createCompanionSession,
  latestCompanionSession,
  listPendingCompanionEvents,
  resolveCompanionEvent,
  revokeCompanionSession,
  type CompanionEvent,
  type CompanionSession,
} from '@/lib/companion'

type Props = {
  open: boolean
  onClose: () => void
  onApplyText: (text: string) => void
  onApplyStructured: (payload: CompanionStructuredPayload) => void
}

export function CompanionPanel({ open, onClose, onApplyText, onApplyStructured }: Props) {
  const [session, setSession] = useState<CompanionSession | null>(null)
  const [events, setEvents] = useState<CompanionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(async () => {
    const current = await latestCompanionSession()
    setSession(current)
    setEvents(current ? await listPendingCompanionEvents(current.id) : [])
  }, [])

  useEffect(() => {
    if (!open) return
    refresh().catch((e) => setError(e instanceof Error ? e.message : String(e)))
    const timer = window.setInterval(() => refresh().catch(() => undefined), 2000)
    return () => window.clearInterval(timer)
  }, [open, refresh])

  const run = async (action: () => Promise<void>) => {
    setLoading(true); setError(null)
    try { await action(); await refresh() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
  }

  if (!open) return null
  const connected = Boolean(session?.connected_at)

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Conectar celular">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-[#1C1C1E]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Smartphone className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h2 className="font-barlow text-lg font-bold">Celular como entrada</h2><p className="text-xs text-gray-500">A mesma conta, conectada a este turno.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
        </div>

        {!session ? (
          <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Gere um código e, no aplicativo, abra <strong>Menu → Conectar à web</strong>. O código vale por 10 minutos; o turno conectado dura até 10 horas.</p>
            <button type="button" disabled={loading} onClick={() => run(async () => setSession(await createCompanionSession()))} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Gerar código
            </button>
          </div>
        ) : !connected ? (
          <div className="mt-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Código de pareamento</p>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(session.pairing_code ?? ''); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }} className="mt-2 inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-mono text-3xl font-bold tracking-[0.2em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              {session.pairing_code?.slice(0, 3)} {session.pairing_code?.slice(3)} <Copy className="h-4 w-4" />
            </button>
            <p className="mt-2 text-xs text-gray-500">{copied ? 'Código copiado.' : 'Aguardando o celular…'}</p>
            <button type="button" disabled={loading} onClick={() => run(async () => setSession(await createCompanionSession()))} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"><RefreshCw className="h-3.5 w-3.5" /> Gerar outro</button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Celular conectado</div>
            <div className="mt-4 space-y-2">
              {events.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400 dark:border-gray-700">Aguardando uma entrada do médico.</p> : events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-gray-200 p-3 dark:border-gray-700">
                  {event.kind === 'transcript' ? <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300"><Mic className="h-3 w-3" /> Ditado do médico</p> : null}
                  {event.kind === 'structured_findings' ? <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300"><Image className="h-3 w-3" /> Medidas extraídas · {event.payload.category?.replaceAll('_', ' ')}</p> : null}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">{event.payload.text || event.payload.summary || 'Entrada sem texto'}</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => run(() => resolveCompanionEvent(event.id, 'dismissed'))} className="inline-flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 text-xs font-semibold text-gray-500 dark:border-gray-700"><X className="h-3 w-3" /> Descartar</button>
                    <button type="button" onClick={() => run(async () => {
                      if (event.kind === 'structured_findings' && event.payload.category && event.payload.data) {
                        onApplyStructured(event.payload as CompanionStructuredPayload)
                      } else {
                        const text = event.payload.text?.trim(); if (text) onApplyText(text)
                      }
                      await resolveCompanionEvent(event.id, 'applied')
                    })} className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white"><Check className="h-3 w-3" /> {event.kind === 'structured_findings' ? 'Preencher campos' : 'Acrescentar ao laudo'}</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => run(() => revokeCompanionSession(session.id))} className="mt-5 text-xs font-semibold text-red-500">Encerrar conexão</button>
          </div>
        )}
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
      </div>
    </div>
  )
}
