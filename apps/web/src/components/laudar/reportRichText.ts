const BLOCK_ATTRIBUTE = 'data-report-block="true"'
const PRESENTATION_KEY = '__presentation'

export const REPORT_HTML_FORMAT = 'report-html-v1' as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
  }
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    const lower = key.toLowerCase()
    if (named[lower] !== undefined) return named[lower]
    if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16))
    if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10))
    return entity
  })
}

function blocks(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function isFmfReference(block: string): boolean {
  return block.startsWith('Baseado no modelo de riscos competitivos da Fetal Medicine Foundation')
    && block.endsWith('Não constitui software certificado pela FMF.')
}

function inlineHtml(block: string): string {
  const escaped = escapeHtml(block).replace(/\n/g, '<br>')
  if (isFmfReference(block)) {
    return `<em>${escaped}</em>`
  }
  const headings = ['COMENTÁRIOS:', 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:', 'CONCLUSÃO:', 'TÉCNICA:', 'ACHADOS:', 'IMPRESSÃO:']
  const heading = headings.find((candidate) => block.startsWith(candidate))
  if (!heading) return escaped
  const encodedHeading = escapeHtml(heading)
  return `<strong>${encodedHeading}</strong>${escaped.slice(encodedHeading.length)}`
}

function blockHtml(block: string, index: number): string {
  const tag = index === 0 ? 'h1' : 'p'
  return `<${tag} ${BLOCK_ATTRIBUTE}>${inlineHtml(block)}</${tag}>`
}

/** Converte o texto canônico em blocos editáveis sem alterar sua redação. */
export function textToReportHtml(text: string): string {
  return blocks(text).map(blockHtml).join('')
}

/**
 * Allowlist pequena e deliberada. Todo atributo é removido; `span`/`font`
 * produzidos pelo comando de destaque do navegador viram `mark`. Conteúdo
 * colado pelo editor entra como texto puro, mas esta barreira também protege o
 * histórico contra HTML adulterado diretamente no banco.
 */
export function sanitizeReportHtml(input: string): string {
  const withoutExecutableBlocks = input
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')

  const inlineTags = new Set(['strong', 'b', 'em', 'i', 'u', 'mark', 'span', 'font'])
  const blockTags = new Set(['p', 'h1', 'div'])

  return withoutExecutableBlocks.replace(/<\/?[^>]+>/g, (rawTag) => {
    const match = rawTag.match(/^<\s*(\/?)\s*([a-z0-9]+)/i)
    if (!match) return ''
    const closing = match[1] === '/'
    const original = match[2]!.toLowerCase()
    if (original === 'br') return closing ? '' : '<br>'
    if (blockTags.has(original)) {
      const tag = original === 'div' ? 'p' : original
      return closing ? `</${tag}>` : `<${tag} ${BLOCK_ATTRIBUTE}>`
    }
    if (inlineTags.has(original)) {
      const tag = original === 'b' ? 'strong' : original === 'i' ? 'em' : (original === 'span' || original === 'font') ? 'mark' : original
      return closing ? `</${tag}>` : `<${tag}>`
    }
    return ''
  })
}

/** Texto puro derivado do HTML seguro, usado para salvar, comparar e copiar. */
export function reportHtmlToText(input: string): string {
  return decodeHtml(
    sanitizeReportHtml(input)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|h1)>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function htmlBlocks(input: string): Array<{ text: string; html: string }> {
  const safe = sanitizeReportHtml(input)
  const result: Array<{ text: string; html: string }> = []
  const pattern = /<(h1|p)\s+data-report-block="true">([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(safe)) !== null) {
    result.push({ text: reportHtmlToText(match[0]), html: match[0] })
  }
  return result
}

/**
 * Reaproveita o HTML dos blocos cujo texto não mudou. Se o fígado muda, por
 * exemplo, um destaque manual feito na conclusão ou na técnica continua lá.
 */
export function mergeReportHtml(currentHtml: string, proposedText: string): string {
  const reusable = new Map<string, string[]>()
  for (const block of htmlBlocks(currentHtml)) {
    reusable.set(block.text, [...(reusable.get(block.text) ?? []), block.html])
  }

  return blocks(proposedText).map((block, index) => {
    const candidates = reusable.get(block)
    // A referência FMF tem apresentação clínica própria. Não reaproveitar um
    // bloco antigo sem itálico quando o restante do texto não mudou.
    const reused = isFmfReference(block) ? undefined : candidates?.shift()
    return reused ?? blockHtml(block, index)
  }).join('')
}

export function appendInitialsToReportHtml(html: string, initials?: string): string {
  const clean = initials?.trim().replace(/^\//, '')
  const safe = sanitizeReportHtml(html)
  if (!clean) return safe
  return `${safe}<p ${BLOCK_ATTRIBUTE}>/${escapeHtml(clean)}</p>`
}

type StoredPresentation = {
  format: typeof REPORT_HTML_FORMAT
  html: string
}

export function attachReportPresentation(examState: unknown, html: string): Record<string, unknown> {
  const base = examState && typeof examState === 'object' && !Array.isArray(examState)
    ? examState as Record<string, unknown>
    : { __form_state: examState ?? null }
  return {
    ...base,
    [PRESENTATION_KEY]: {
      format: REPORT_HTML_FORMAT,
      html: sanitizeReportHtml(html),
    } satisfies StoredPresentation,
  }
}

export function extractReportPresentation(examState: unknown): string | null {
  if (!examState || typeof examState !== 'object' || Array.isArray(examState)) return null
  const presentation = (examState as Record<string, unknown>)[PRESENTATION_KEY]
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) return null
  const value = presentation as Partial<StoredPresentation>
  if (value.format !== REPORT_HTML_FORMAT || typeof value.html !== 'string') return null
  return sanitizeReportHtml(value.html)
}
