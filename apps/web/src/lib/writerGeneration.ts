'use client'

import { GenerateRequestSchema, GenerateSSEEventSchema, type GenerateSSEEvent } from '@laudousg/shared'
import { isWriterCategory, type WriterCategory } from './writerCategories'
import { parseWriterCategoryRequest } from './writerContract'

export type WriterRequest = {
  raw_input: string
  category_hint: WriterCategory
  resume_from_report_id?: string
  clarify_answers?: Array<{ question_id: string; answer: string }>
}

export function validateWriterRequest(value: unknown): WriterRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pedido de geração inválido.')
  const input = value as Record<string, unknown>
  if (typeof input.category_hint !== 'string' || !isWriterCategory(input.category_hint)) throw new Error('Categoria não disponível no caminho por texto.')
  const strictRequest = parseWriterCategoryRequest(value)
  if (!strictRequest) throw new Error('Pedido de geração inválido.')
  const parsed = GenerateRequestSchema.safeParse({ ...strictRequest, writing_style_id: '11111111-1111-4111-8111-111111111111' })
  if (!parsed.success) throw new Error('Pedido de geração inválido.')
  // `mode` recebe default no schema compartilhado, mas não deve atravessar a
  // fronteira do navegador: a rota autenticada é quem escolhe os controles do
  // pipeline e recusa campos extras do cliente.
  const { writing_style_id: _style, category_hint: _parsedCategory, mode: _mode, ...request } = parsed.data
  return { ...request, category_hint: input.category_hint as WriterCategory }
}

/** Lê SSE sem descartar eventos que cruzam blocos de rede ou o EOF final. */
export async function* readGenerateEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<GenerateSSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const parseBlock = (block: string): GenerateSSEEvent | null => {
    const data = block.split(/\r?\n/).find((line) => line.startsWith('data:'))
    if (!data) return null
    try {
      const parsed = GenerateSSEEventSchema.safeParse(JSON.parse(data.slice(5).trimStart()))
      return parsed.success ? parsed.data : null
    } catch { return null }
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let separator: RegExpMatchArray | null
      while ((separator = /\r?\n\r?\n/.exec(buffer))) {
        const index = separator.index ?? 0
        const block = buffer.slice(0, index)
        buffer = buffer.slice(index + separator[0].length)
        const event = parseBlock(block)
        if (event) yield event
      }
      if (done) break
    }
    if (buffer.trim()) {
      const event = parseBlock(buffer)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* generateWriterReport(request: WriterRequest, signal?: AbortSignal) {
  const safeRequest = validateWriterRequest(request)
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(safeRequest),
    signal,
  })
  if (!response.ok || !response.body) {
    const detail = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(detail?.error ?? `Não foi possível gerar o laudo (${response.status}).`)
  }
  yield* readGenerateEvents(response.body)
}
