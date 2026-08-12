'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Bot, Check, Image, Mic, Send, Smartphone, Undo2, X } from 'lucide-react'

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
}: Props) {
  const [mode, setMode] = useState<'agent' | 'mobile'>('agent')

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
        <span className={`ml-1 text-[10px] font-medium ${hasPendingSuggestion ? 'text-amber-600 dark:text-amber-300' : canUndoSuggestion ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400'}`}>
          {hasPendingSuggestion ? '1 sugestão aguardando revisão' : canUndoSuggestion ? 'alteração aplicada' : 'estrutura reservada · conexão desligada'}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Seção anterior"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Próxima seção"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-800 disabled:opacity-30 dark:bg-gray-100 dark:text-gray-900"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {mode === 'agent' && hasPendingSuggestion ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/75 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/25">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-gray-900 dark:text-amber-300">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-amber-950 dark:text-amber-100">Os campos propuseram uma alteração</div>
            <div className="text-[10.5px] text-amber-800/70 dark:text-amber-300/70">A comparação está aberta ao lado do laudo.</div>
          </div>
          <button type="button" onClick={onRejectSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 text-[10.5px] font-semibold text-gray-600 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-gray-900 dark:text-gray-300">
            <X className="h-3 w-3" />
            Rejeitar
          </button>
          <button type="button" onClick={onAcceptSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full bg-emerald-600 px-2.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700">
            <Check className="h-3 w-3" />
            Aceitar
          </button>
        </div>
      ) : mode === 'agent' && canUndoSuggestion ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/25">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 text-xs font-semibold text-emerald-900 dark:text-emerald-100">Alteração aplicada ao laudo</div>
          <button type="button" onClick={onUndoSuggestion} className="inline-flex h-7 items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 text-[10.5px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-gray-900 dark:text-emerald-300">
            <Undo2 className="h-3 w-3" />
            Desfazer
          </button>
        </div>
      ) : mode === 'agent' ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 p-1.5 dark:border-gray-700 dark:bg-gray-900/60">
          <button type="button" disabled title="Áudio será conectado na etapa do agente" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 disabled:cursor-not-allowed">
            <Mic className="h-4 w-4" />
          </button>
          <button type="button" disabled title="Imagem será conectada após o benchmark de OCR" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 disabled:cursor-not-allowed">
            <Image className="h-4 w-4" />
          </button>
          <input
            disabled
            placeholder="Converse com o agente para ajustar este laudo…"
            className="h-8 min-w-0 flex-1 bg-transparent px-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-gray-200"
          />
          <button type="button" disabled aria-label="Enviar ao agente" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-400 disabled:cursor-not-allowed dark:bg-gray-800">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm dark:bg-gray-800">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Nenhum dispositivo pareado</div>
            <div className="text-[10.5px] text-gray-400">A sessão de turno terá duração de até 10 horas.</div>
          </div>
          <button type="button" disabled className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-400 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800">
            Parear
          </button>
        </div>
      )}
    </div>
  )
}
