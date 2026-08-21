'use client'

import { useEffect, useRef } from 'react'
import { Check, Copy, RotateCcw, Save, Undo2, WandSparkles, X } from 'lucide-react'
import type { SaveState } from './LaudarWebExperience'
import type { ReportSuggestionDiff } from './reportSuggestion'

type Props = {
  documentKey?: string
  text: string
  saveState?: SaveState
  saveError?: string | null
  onSave?: () => void
  workspaceV2?: boolean
  editable?: boolean
  editableText?: string
  draftDirty?: boolean
  sourceChanged?: boolean
  suggestionDiff?: ReportSuggestionDiff | null
  onTextChange?: (text: string) => void
  onResetDraft?: () => void
  onAcceptSuggestion?: () => void
  onRejectSuggestion?: () => void
  canUndoSuggestion?: boolean
  onUndoSuggestion?: () => void
}

/**
 * Status honesto de persistência (substitui o "salvo há 2s" falso).
 *
 * Ficou INLINE e discreto. Antes era um bloco embaixo de um título "Preview ·
 * laudo", e os dois juntos comiam uma fileira inteira do cabeçalho só para
 * dizer o que o botão ao lado já diz. Agora é um ponto colorido com o texto,
 * na mesma linha das ações — e no estado ocioso mostra só o ponto, porque
 * "Não salvo" é o padrão e não é notícia.
 */
function SaveStatus({ state, error }: { state: SaveState; error?: string | null }) {
  const map = {
    idle: { dot: 'bg-gray-300 dark:bg-gray-600', text: '', title: 'Ainda não salvo no histórico' },
    saving: { dot: 'bg-amber-500 animate-pulse', text: 'Salvando…', title: 'Salvando' },
    saved: { dot: 'bg-emerald-600', text: 'Salvo', title: 'Salvo no histórico' },
    error: { dot: 'bg-red-500', text: error || 'Erro ao salvar', title: error || 'Erro ao salvar' },
  }[state]
  return (
    <span
      title={map.title}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400"
    >
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${map.dot}`} />
      {map.text}
    </span>
  )
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

function ReportTextEditor({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.max(element.scrollHeight, 520)}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Editar texto do laudo"
      spellCheck
      className="block min-h-[520px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-sans text-[14px] leading-[1.75] text-gray-950 outline-none focus:ring-0 dark:text-gray-100"
    />
  )
}

export function LaudoPreview({
  documentKey,
  text,
  saveState = 'idle',
  saveError,
  onSave,
  workspaceV2 = false,
  editable = false,
  editableText = '',
  draftDirty = false,
  sourceChanged = false,
  suggestionDiff,
  onTextChange,
  onResetDraft,
  onAcceptSuggestion,
  onRejectSuggestion,
  canUndoSuggestion = false,
  onUndoSuggestion,
}: Props) {
  const paragraphs = text.split('\n\n')
  const documentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (documentScrollRef.current) documentScrollRef.current.scrollTop = 0
  }, [documentKey])

  const copy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  return (
    <section className={workspaceV2
      ? 'flex min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]'
      : 'flex min-h-0 flex-col border-l border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'}>
      {/*
        UMA FILEIRA. Antes eram duas: uma com o título "Preview · laudo" e o
        status embaixo, outra com as ferramentas — e o título não dizia nada que
        o conteúdo já não dissesse, num painel que só mostra o laudo.

        A ordem segue o uso: formatar (à esquerda, junto do texto), depois o
        status, depois as saídas (copiar) e por último a ação que encerra
        (salvar). As iniciais saíram daqui — quem escolhe a digitadora é o
        seletor da barra do topo, onde a decisão acontece antes de digitar.
      */}
      <div className={`sticky top-0 z-10 border-b backdrop-blur-xl ${workspaceV2
        ? 'border-gray-100 bg-white/95 px-4 py-3 dark:border-gray-800 dark:bg-[#1C1C1E]/95'
        : 'border-gray-200 bg-white/95 px-4 py-2 dark:border-gray-800 dark:bg-gray-950/95'}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {!workspaceV2 ? (
            <>
              {['B', 'I', 'U'].map((label) => (
                <button
                  key={label}
                  type="button"
                  title={{ B: 'Negrito', I: 'Itálico', U: 'Sublinhado' }[label]}
                  className="h-7 w-7 rounded-md border border-gray-200 bg-white text-[13px] font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                title="Destacar trecho"
                className="h-7 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Destacar
              </button>
              <button
                type="button"
                disabled
                title="Refazer o texto com IA (em breve)"
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-[11px] font-semibold text-gray-400 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-600"
              >
                <WandSparkles className="h-3.5 w-3.5" />
                Refazer com IA
              </button>
            </>
          ) : null}

          <span className="ml-auto" />
          <SaveStatus state={saveState} error={saveError} />

          <button
            type="button"
            onClick={copy}
            title="Copiar com formatação"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </button>
          <button
            type="button"
            onClick={copy}
            title="Copiar sem formatação (texto puro)"
            aria-label="Copiar sem formatação"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Texto puro
          </button>

          {onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-gray-900 px-3 text-[11px] font-bold text-white transition hover:bg-gray-800 disabled:opacity-45 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            >
              {saveState === 'saved' ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saveState === 'saved' ? 'Salvo' : saveState === 'saving' ? 'Salvando…' : 'Salvar laudo'}
            </button>
          ) : null}
        </div>
      </div>

      {sourceChanged && suggestionDiff ? (
        <div className="border-b border-amber-200 bg-amber-50/85 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/25">
          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-amber-950 dark:text-amber-100">Sugestão dos campos atuais</div>
              <div className="text-[10.5px] text-amber-800/75 dark:text-amber-300/75">Seu texto foi preservado. Compare antes de aplicar.</div>
            </div>
            {onRejectSuggestion ? (
              <button type="button" onClick={onRejectSuggestion} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-gray-900 dark:text-gray-300">
                <X className="h-3 w-3" />
                Rejeitar
              </button>
            ) : null}
            {onAcceptSuggestion ? (
              <button type="button" onClick={onAcceptSuggestion} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
                <Check className="h-3 w-3" />
                Aceitar
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <div className="max-h-20 overflow-y-auto rounded-lg border border-red-100 bg-white/80 px-2.5 py-2 text-red-800 dark:border-red-950/60 dark:bg-gray-950/40 dark:text-red-300">
              <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-red-400">Texto atual</div>
              <del className="whitespace-pre-line decoration-red-400/70">
                {suggestionDiff.removed.length ? suggestionDiff.removed.join('\n\n') : 'Nenhum trecho removido.'}
              </del>
            </div>
            <div className="max-h-20 overflow-y-auto rounded-lg border border-emerald-100 bg-white/80 px-2.5 py-2 text-emerald-900 dark:border-emerald-950/60 dark:bg-gray-950/40 dark:text-emerald-300">
              <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-500">Como ficará</div>
              <ins className="whitespace-pre-line no-underline">
                {suggestionDiff.added.length ? suggestionDiff.added.join('\n\n') : 'Nenhum trecho acrescentado.'}
              </ins>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={documentScrollRef} className={`min-h-0 flex-1 overflow-y-auto ${workspaceV2 ? 'bg-white p-4 dark:bg-[#1C1C1E]' : 'p-6'}`}>
        <article className={workspaceV2
          ? 'mx-auto min-h-full max-w-[760px] bg-white px-6 py-5 font-sans text-[14px] leading-[1.65] text-gray-950 dark:bg-[#1C1C1E] dark:text-gray-100'
          : "mx-auto min-h-full max-w-[760px] rounded-sm bg-white px-12 py-12 font-['Times_New_Roman'] text-[15px] leading-[1.62] text-gray-950 shadow-xl"}>
          {editable && onTextChange ? (
            <ReportTextEditor value={editableText} onChange={onTextChange} />
          ) : paragraphs.map((paragraph, index) => {
            const trimmed = paragraph.trim()
            if (!trimmed) return null
            if (index === 0) {
              return <h1 key={index} className="mb-7 text-center text-base font-bold uppercase tracking-wide">{trimmed}</h1>
            }
            if (/^\/[a-z]+$/i.test(trimmed)) {
              if (workspaceV2) return null
              return <p key={index} className="mt-8 text-right font-mono text-[11px] text-gray-500">{trimmed}</p>
            }
            return (
              <p key={index} className="mb-4">
                <HeaderPrefix paragraph={trimmed} />
              </p>
            )
          })}
          {workspaceV2 ? (
            <footer className="mt-10 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              {canUndoSuggestion && onUndoSuggestion ? (
                <button
                  type="button"
                  onClick={onUndoSuggestion}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  <Undo2 className="h-3 w-3" />
                  Desfazer aplicação
                </button>
              ) : null}
              {draftDirty && !sourceChanged && onResetDraft ? (
                <button
                  type="button"
                  onClick={onResetDraft}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar modelo
                </button>
              ) : null}
              {/*
                O botão "/ha · iniciais" saiu daqui. Quem decide quem digitou é
                o seletor de DIGITADORA na barra do topo — a escolha acontece
                antes de escrever, não no rodapé do texto pronto. As iniciais
                continuam saindo no fim do laudo; o que sumiu foi o controle
                fora de lugar.
              */}
            </footer>
          ) : null}
        </article>
      </div>
    </section>
  )
}
