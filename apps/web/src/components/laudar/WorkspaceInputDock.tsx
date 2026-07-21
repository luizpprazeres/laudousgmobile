'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Bot, Check, Image, Loader2, Mic, Send, Smartphone, Undo2, X } from 'lucide-react'
import {
  createWorkspaceSession,
  endWorkspaceSession,
  getWorkspaceSession,
  listWorkspaceInputs,
  resolveWorkspaceInput,
  type WorkspaceInput,
  type WorkspaceSession,
} from '@/lib/workspaceCompanion'

type Props = {
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
  hasPendingSuggestion?: boolean
  canUndoSuggestion?: boolean
  onAcceptSuggestion?: () => void
  onRejectSuggestion?: () => void
  onUndoSuggestion?: () => void
  mobileEnabled?: boolean
  currentCategory?: string
  onApplyMobileInput?: (input: WorkspaceInput) => void
}

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
}

function expiryLabel(expiresAt: string) {
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return 'sessão de até 10 horas'
  return `válido até ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function WorkspaceInputDock({
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  hasPendingSuggestion = false,
  canUndoSuggestion = false,
  onAcceptSuggestion,
  onRejectSuggestion,
  onUndoSuggestion,
  mobileEnabled = false,
  currentCategory,
  onApplyMobileInput,
}: Props) {
  const [mode, setMode] = useState<'agent' | 'mobile'>(mobileEnabled ? 'mobile' : 'agent')
  const [session, setSession] = useState<WorkspaceSession | null>(null)
  const [inputs, setInputs] = useState<WorkspaceInput[]>([])
  const [mobileBusy, setMobileBusy] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [mobileError, setMobileError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!mobileEnabled) return
    let cancelled = false
    let running = false

    const refresh = async () => {
      if (running) return
      running = true
      try {
        const { session: current } = await getWorkspaceSession()
        if (cancelled) return
        setSession(current)
        if (current) {
          const { inputs: pending } = await listWorkspaceInputs(current.id)
          if (!cancelled) setInputs(pending)
        } else {
          setInputs([])
        }
        setMobileError(null)
      } catch (error) {
        if (!cancelled) setMobileError(error instanceof Error ? error.message : 'Falha ao conectar o celular.')
      } finally {
        running = false
      }
    }

    void refresh()
    const interval = window.setInterval(() => void refresh(), 2_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [mobileEnabled, refreshKey])

  const createSession = async () => {
    setMobileBusy(true)
    setMobileError(null)
    try {
      const result = await createWorkspaceSession()
      setSession(result.session)
      setMode('mobile')
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setMobileError(error instanceof Error ? error.message : 'Não foi possível criar a sessão.')
    } finally {
      setMobileBusy(false)
    }
  }

  const endSession = async () => {
    setMobileBusy(true)
    try {
      await endWorkspaceSession()
      setSession(null)
      setInputs([])
      setMobileError(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setMobileError(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão.')
    } finally {
      setMobileBusy(false)
    }
  }

  const resolveInput = async (input: WorkspaceInput, status: 'applied' | 'dismissed') => {
    setResolvingId(input.id)
    setMobileError(null)
    try {
      await resolveWorkspaceInput(input.id, status)
      if (status === 'applied') onApplyMobileInput?.(input)
      setInputs((current) => current.filter((item) => item.id !== input.id))
    } catch (error) {
      setMobileError(error instanceof Error ? error.message : 'Não foi possível resolver o dado recebido.')
    } finally {
      setResolvingId(null)
    }
  }

  const agentStatus = hasPendingSuggestion
    ? '1 sugestão aguardando revisão'
    : canUndoSuggestion
      ? 'alteração aplicada'
      : 'estrutura reservada'
  const mobileStatus = inputs.length > 0
    ? `${inputs.length} ${inputs.length === 1 ? 'dado recebido' : 'dados recebidos'}`
    : session?.pairedAt
      ? `${session.deviceLabel ?? 'Celular'} conectado`
      : session
        ? 'aguardando celular'
        : 'conexão desligada'

  return (
    <div className="border-t border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-[#1C1C1E]">
      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMode('agent')}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            mode === 'agent'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900'
          }`}
        >
          <Bot className="h-3 w-3" />
          Agente
        </button>
        <button
          type="button"
          onClick={() => setMode('mobile')}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            mode === 'mobile'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900'
          }`}
        >
          <Smartphone className="h-3 w-3" />
          Celular
        </button>
        <span className={`ml-1 text-[10px] font-medium ${
          mode === 'mobile' && (session?.pairedAt || inputs.length)
            ? 'text-emerald-600 dark:text-emerald-300'
            : mode === 'agent' && hasPendingSuggestion
              ? 'text-amber-600 dark:text-amber-300'
              : 'text-gray-400'
        }`}>
          {mode === 'mobile' ? mobileStatus : agentStatus}
        </span>
        <div className="flex-1" />
        <button type="button" onClick={onPrevious} disabled={!canGoPrevious} aria-label="Seção anterior" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onNext} disabled={!canGoNext} aria-label="Próxima seção" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-800 disabled:opacity-30 dark:bg-gray-100 dark:text-gray-900">
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {mode === 'agent' && hasPendingSuggestion ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/75 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/25">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-gray-900 dark:text-amber-300"><Bot className="h-3.5 w-3.5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-amber-950 dark:text-amber-100">Os campos propuseram uma alteração</div>
            <div className="text-[10.5px] text-amber-800/70 dark:text-amber-300/70">A comparação está aberta ao lado do laudo.</div>
          </div>
          <button type="button" onClick={onRejectSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 text-[10.5px] font-semibold text-gray-600 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-gray-900 dark:text-gray-300"><X className="h-3 w-3" />Rejeitar</button>
          <button type="button" onClick={onAcceptSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-600 px-2.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700"><Check className="h-3 w-3" />Aceitar</button>
        </div>
      ) : mode === 'agent' && canUndoSuggestion ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/25">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /></span>
          <div className="min-w-0 flex-1 text-xs font-semibold text-emerald-900 dark:text-emerald-100">Alteração aplicada ao laudo</div>
          <button type="button" onClick={onUndoSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 text-[10.5px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-gray-900 dark:text-emerald-300"><Undo2 className="h-3 w-3" />Desfazer</button>
        </div>
      ) : mode === 'agent' ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-1.5 dark:border-gray-700 dark:bg-gray-900/60">
          <button type="button" disabled title="Áudio será conectado na etapa do agente" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 disabled:cursor-not-allowed"><Mic className="h-4 w-4" /></button>
          <button type="button" disabled title="Imagem será conectada após o benchmark de OCR" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 disabled:cursor-not-allowed"><Image className="h-4 w-4" /></button>
          <input disabled placeholder="Agente web reservado para uma etapa futura…" className="h-8 min-w-0 flex-1 bg-transparent px-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-gray-200" />
          <button type="button" disabled aria-label="Enviar ao agente" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-400 disabled:cursor-not-allowed dark:bg-gray-800"><Send className="h-3.5 w-3.5" /></button>
        </div>
      ) : !mobileEnabled ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
          <Smartphone className="h-4 w-4 text-gray-400" />
          <div className="min-w-0 flex-1 text-xs text-gray-500">Conexão com o celular desativada nesta versão.</div>
        </div>
      ) : inputs.length > 0 ? (
        <div className="space-y-1.5">
          {inputs.slice(0, 3).map((input) => (
            <div key={input.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/55 px-2.5 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">{input.kind === 'measurements' ? 'Medidas' : 'Texto'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-gray-800 dark:text-gray-100">{input.text}</div>
                {input.categoryCode && input.categoryCode !== currentCategory ? <div className="text-[9.5px] text-amber-600">Enviado em {input.categoryCode}</div> : null}
              </div>
              <button type="button" disabled={resolvingId === input.id} onClick={() => void resolveInput(input, 'dismissed')} className="rounded-full px-2 py-1 text-[10.5px] font-semibold text-gray-500 hover:bg-white disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-900">Descartar</button>
              <button type="button" disabled={resolvingId === input.id} onClick={() => void resolveInput(input, 'applied')} className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-600 px-2.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">{resolvingId === input.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Aplicar</button>
            </div>
          ))}
        </div>
      ) : session ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm dark:bg-gray-900"><Smartphone className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2"><span className="font-mono text-sm font-black tracking-[0.16em] text-gray-900 dark:text-white">{formatCode(session.code)}</span><span className="text-[10px] text-gray-400">{expiryLabel(session.expiresAt)}</span></div>
            <div className="text-[10.5px] text-gray-500 dark:text-gray-400">{session.pairedAt ? `${session.deviceLabel ?? 'Celular'} conectado · aguardando dados` : 'Digite este código em Conectar ao computador no aplicativo.'}</div>
          </div>
          <button type="button" disabled={mobileBusy} onClick={() => void endSession()} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">Encerrar</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm dark:bg-gray-800"><Smartphone className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Conectar o celular a este laudo</div>
            <div className="text-[10.5px] text-gray-400">O código ficará válido durante o turno, por até 10 horas.</div>
          </div>
          <button type="button" disabled={mobileBusy} onClick={() => void createSession()} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{mobileBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Parear</button>
        </div>
      )}

      {mode === 'mobile' && mobileError ? <div className="mt-1.5 truncate px-1 text-[10px] font-medium text-red-600 dark:text-red-300">{mobileError}</div> : null}
    </div>
  )
}
