'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Check, Copy, Redo2, RotateCcw, Save, Undo2, X } from 'lucide-react'
import type { SaveState } from './LaudarWebExperience'
import type { ReportSuggestionDiff } from './reportSuggestion'
import { reportHtmlToText, sanitizeReportHtml } from './reportRichText'

type Props = {
  documentKey?: string
  text: string
  saveState?: SaveState
  saveError?: string | null
  onSave?: () => void
  workspaceV2?: boolean
  editable?: boolean
  editableHtml?: string
  formattedHtml?: string
  draftDirty?: boolean
  sourceChanged?: boolean
  suggestionDiff?: ReportSuggestionDiff | null
  onDocumentChange?: (value: { text: string; html: string }) => void
  onResetDraft?: () => void
  onAcceptSuggestion?: () => void
  onRejectSuggestion?: () => void
  canUndoSuggestion?: boolean
  onUndoSuggestion?: () => void
  updating?: boolean
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

type EditorCommand = 'bold' | 'italic' | 'underline' | 'highlight' | 'undo' | 'redo'

type ReportTextEditorHandle = {
  execute: (command: EditorCommand) => void
}

const ReportTextEditor = forwardRef<ReportTextEditorHandle, {
  html: string
  onChange: (value: { text: string; html: string }) => void
}>(function ReportTextEditor({ html, onChange }, forwardedRef) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const next = sanitizeReportHtml(html)
    if (sanitizeReportHtml(element.innerHTML) !== next) element.innerHTML = next
  }, [html])

  const publish = () => {
    const element = ref.current
    if (!element) return
    const safeHtml = sanitizeReportHtml(element.innerHTML)
    onChange({ text: reportHtmlToText(safeHtml), html: safeHtml })
  }

  useImperativeHandle(forwardedRef, () => ({
    execute(command) {
      const element = ref.current
      if (!element || typeof document === 'undefined') return
      element.focus()
      if (command === 'highlight') document.execCommand('hiliteColor', false, '#fde68a')
      else document.execCommand(command, false)
      publish()
    },
  }))

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={publish}
      onBlur={publish}
      onPaste={(event) => {
        event.preventDefault()
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
      }}
      role="textbox"
      aria-multiline="true"
      aria-label="Editar texto do laudo"
      spellCheck
      className="block min-h-[520px] w-full cursor-text border-0 bg-transparent p-0 text-inherit outline-none focus:ring-0 [&_h1]:mb-7 [&_h1]:text-center [&_h1]:text-base [&_h1]:font-bold [&_h1]:uppercase [&_h1]:tracking-wide [&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_mark]:px-0.5 [&_p]:mb-4 dark:[&_mark]:bg-amber-700/70"
    />
  )
})

export function LaudoPreview({
  documentKey,
  text,
  saveState = 'idle',
  saveError,
  onSave,
  workspaceV2 = false,
  editable = false,
  editableHtml = '',
  formattedHtml,
  draftDirty = false,
  sourceChanged = false,
  suggestionDiff,
  onDocumentChange,
  onResetDraft,
  onAcceptSuggestion,
  onRejectSuggestion,
  canUndoSuggestion = false,
  onUndoSuggestion,
  updating = false,
}: Props) {
  const paragraphs = text.split('\n\n')
  const documentScrollRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReportTextEditorHandle>(null)

  useEffect(() => {
    if (documentScrollRef.current) documentScrollRef.current.scrollTop = 0
  }, [documentKey])

  const copyPlainText = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(text)
  }

  const copyFormatted = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    const safeHtml = sanitizeReportHtml(formattedHtml ?? editableHtml)
    try {
      if (safeHtml && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([safeHtml], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        })])
        return
      }
    } catch {
      // Navegadores sem permissão para HTML ainda recebem o laudo em texto.
    }
    await navigator.clipboard.writeText(text)
  }

  const execute = (command: EditorCommand) => editorRef.current?.execute(command)

  return (
    <section className={workspaceV2
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1C1C1E]'
      : 'flex min-h-0 flex-1 flex-col border-l border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900'}>
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
          {editable ? (
            <>
              {([
                ['B', 'Negrito', 'bold'],
                ['I', 'Itálico', 'italic'],
                ['U', 'Sublinhado', 'underline'],
              ] as const).map(([label, title, command]) => (
                <button
                  key={label}
                  type="button"
                  title={title}
                  aria-label={title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => execute(command)}
                  className="h-7 w-7 rounded-md border border-gray-200 bg-white text-[13px] font-bold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                title="Destacar trecho"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execute('highlight')}
                className="h-7 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Destacar
              </button>
              <button
                type="button"
                title="Desfazer edição"
                aria-label="Desfazer edição"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execute('undo')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Refazer edição"
                aria-label="Refazer edição"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execute('redo')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}

          <span className="ml-auto" />
          <SaveStatus state={saveState} error={saveError} />

          <button
            type="button"
            onClick={copyFormatted}
            title="Copiar com formatação"
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </button>
          <button
            type="button"
            onClick={copyPlainText}
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

      <div ref={documentScrollRef} className={`relative min-h-0 flex-1 overflow-y-auto ${workspaceV2 ? 'bg-white p-4 dark:bg-[#1C1C1E]' : 'p-6'}`}>
        {updating ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center" role="status" aria-live="polite">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur-md dark:border-emerald-800/70 dark:bg-gray-950/85 dark:text-emerald-300">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-300" />
              Atualizando o trecho alterado…
            </span>
          </div>
        ) : null}
        <article aria-busy={updating} className={`${updating ? 'opacity-55 blur-[0.35px]' : 'opacity-100 blur-0'} transition-[filter,opacity] duration-200 ${workspaceV2
          ? 'mx-auto min-h-full max-w-[760px] bg-white px-6 py-5 font-sans text-[14px] leading-[1.65] text-gray-950 dark:bg-[#1C1C1E] dark:text-gray-100'
          : "mx-auto min-h-full max-w-[760px] rounded-sm bg-white px-12 py-12 font-['Times_New_Roman'] text-[15px] leading-[1.62] text-gray-950 shadow-xl"}`}>
          {editable && onDocumentChange ? (
            <ReportTextEditor ref={editorRef} html={editableHtml} onChange={onDocumentChange} />
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
