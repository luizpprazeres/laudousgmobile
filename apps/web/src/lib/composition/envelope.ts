/**
 * O ENVELOPE de uma composição salva em `web_reports.exam_state`.
 *
 * É ownership da Web: carrega estado de UI por componente, o rascunho do médico
 * e a resposta canônica aceita. Não é contrato de transporte — o transporte é
 * `clinical-composition/v1` (ver `./contract`).
 *
 * ## Por que existe versão própria
 *
 * `kind` + `envelopeVersion` distinguem este envelope dos `exam_state`
 * avulsos (que continuam sem versão e sem reabertura). Envelope com versão
 * desconhecida NÃO é reinterpretado: a reabertura para edição é recusada e o
 * histórico continua mostrando o texto salvo. Adivinhar o formato de um estado
 * clínico é o jeito de reabrir um exame com achado trocado.
 *
 * Não há migração de banco: `web_reports` já tem `exam_state jsonb` e só a Web
 * a lê. Os laudos antigos ficam como estão.
 */
import { z } from 'zod'
import { appendInitials, type ExamState } from '../deterministic'
import { appendInitialsToReportHtml, sanitizeReportHtml } from '../../components/laudar/reportRichText'
import type { CompositionSession } from './associations'
import { CLINICAL_COMPOSITION_ASSOCIATION_CODES, CLINICAL_COMPOSITION_CONTRACT_VERSION, type CompositionBlock } from './contract'

export const COMPOSITION_ENVELOPE_KIND = 'clinical-composition' as const
export const COMPOSITION_ENVELOPE_VERSION = 1 as const

const uuid = z.string().uuid()
const categoria = z.enum(['ABDOMEN_TOTAL', 'PROSTATA_SUPRAPUBICA', 'MAMARIA', 'PELVE_FEMININA'])
const estado = z.record(z.string(), z.unknown())

const Draft = z.object({
  text: z.string(),
  html: z.string(),
  sourceText: z.string(),
  sourceHtml: z.string(),
  dirty: z.boolean(),
}).strict()

const Bloco = z.object({
  blockId: z.string(),
  section: z.enum(['title', 'technique', 'findings', 'conclusion']),
  componentIds: z.array(uuid),
  categoryCodes: z.array(categoria),
  structureCode: z.literal('URINARY_BLADDER').optional(),
  text: z.string(),
}).strict()

export const CompositionEnvelopeV1Schema = z.object({
  kind: z.literal(COMPOSITION_ENVELOPE_KIND),
  envelopeVersion: z.literal(COMPOSITION_ENVELOPE_VERSION),
  contractVersion: z.literal(CLINICAL_COMPOSITION_CONTRACT_VERSION),
  compositionId: uuid,
  revision: z.number().int().min(0),
  associationCode: z.enum(CLINICAL_COMPOSITION_ASSOCIATION_CODES),
  primaryComponentId: uuid,
  sharedBladderId: uuid.nullable(),
  components: z.array(z.object({
    componentId: uuid,
    categoryCode: categoria,
    acquisitionContextId: uuid,
    uiState: estado,
  }).strict()).length(2),
  rendered: z.object({
    requestId: uuid,
    revision: z.number().int().min(0),
    fullText: z.string(),
    blocks: z.array(Bloco),
  }).strict(),
  /** Blocos que o médico incluiu explicitamente (calculadora, observação do celular). */
  extras: z.object({
    calculatorBlocks: z.record(z.string(), z.string()),
    companionNotes: z.array(z.string()),
  }).strict(),
  draft: Draft,
  /**
   * Iniciais da digitadora aplicadas no texto salvo. Com o rascunho, é o que
   * DERIVA `laudo_text` — o texto do histórico nunca é um campo solto.
   */
  // Só a forma NORMALIZADA (a de `normalizarIniciais`): o texto normaliza as
  // iniciais e o HTML não. Com valor cru ("A1B") os dois divergiriam.
  initials: z.string().regex(/^[a-z]{0,4}$/).default(''),
  /** Camada de apresentação (HTML) — a chave que `attachReportPresentation` grava. */
  __presentation: z.unknown().optional(),
}).strict()

export type CompositionEnvelopeV1 = z.infer<typeof CompositionEnvelopeV1Schema>

export type EnvelopeDraft = z.infer<typeof Draft>

export function buildEnvelope(input: {
  session: CompositionSession
  rendered: { requestId: string; revision: number; fullText: string; blocks: CompositionBlock[] }
  extras: { calculatorBlocks: Record<string, string>; companionNotes: string[] }
  draft: EnvelopeDraft
  initials: string
}): CompositionEnvelopeV1 {
  const { session } = input
  const envelope: CompositionEnvelopeV1 = {
    kind: COMPOSITION_ENVELOPE_KIND,
    envelopeVersion: COMPOSITION_ENVELOPE_VERSION,
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    compositionId: session.compositionId,
    revision: input.rendered.revision,
    associationCode: session.associationCode,
    primaryComponentId: session.primaryComponentId,
    sharedBladderId: session.sharedBladderId,
    components: session.components.map((c) => ({
      componentId: c.componentId,
      categoryCode: c.categoryCode,
      acquisitionContextId: c.acquisitionContextId,
      uiState: JSON.parse(JSON.stringify(session.states[c.componentId] ?? {})) as Record<string, unknown>,
    })),
    rendered: { ...input.rendered, blocks: input.rendered.blocks.map((b) => ({ ...b })) },
    extras: input.extras,
    draft: input.draft,
    initials: input.initials,
  }
  // Salvar o que não reabre é pior que não salvar: confere na saída.
  return CompositionEnvelopeV1Schema.parse(envelope)
}

/**
 * O TEXTO SALVO é derivado do envelope: o rascunho que o médico viu, mais as
 * iniciais. Assim o histórico (que lê `laudo_text`) e a reabertura (que lê o
 * envelope) não podem divergir — um PATCH com texto de outro laudo é recusado.
 */
export function savedTextOf(envelope: CompositionEnvelopeV1): string {
  return appendInitials(envelope.draft.text, envelope.initials || undefined)
}

export function savedPresentationOf(envelope: CompositionEnvelopeV1): string {
  return appendInitialsToReportHtml(envelope.draft.html, envelope.initials || undefined)
}

/** `laudo_text` e a apresentação guardada conferem com o envelope? */
export function laudoConfereComEnvelope(laudoText: string, envelope: CompositionEnvelopeV1): boolean {
  if (laudoText !== savedTextOf(envelope)) return false
  const presentation = (envelope as { __presentation?: unknown }).__presentation
  if (presentation === undefined) return true
  const html = (presentation as { html?: unknown } | null)?.html
  return typeof html === 'string' && sanitizeReportHtml(html) === savedPresentationOf(envelope)
}

export type ParsedEnvelope =
  | { kind: 'composition'; envelope: CompositionEnvelopeV1; session: CompositionSession }
  /** Um envelope de composição que esta tela não sabe ler (versão/forma). */
  | { kind: 'composition-unsupported'; motivo: string }
  /** `exam_state` avulso (legado): só texto no histórico. */
  | { kind: 'legacy' }

export function parseEnvelope(value: unknown): ParsedEnvelope {
  if (!value || typeof value !== 'object' || (value as { kind?: unknown }).kind !== COMPOSITION_ENVELOPE_KIND) {
    return { kind: 'legacy' }
  }
  const v = value as { envelopeVersion?: unknown; contractVersion?: unknown }
  if (v.envelopeVersion !== COMPOSITION_ENVELOPE_VERSION || v.contractVersion !== CLINICAL_COMPOSITION_CONTRACT_VERSION) {
    return { kind: 'composition-unsupported', motivo: 'versão de composição não suportada por esta tela' }
  }
  const parsed = CompositionEnvelopeV1Schema.safeParse(value)
  if (!parsed.success) return { kind: 'composition-unsupported', motivo: 'estado da composição salvo está incompleto' }
  const e = parsed.data
  const ids = new Set(e.components.map((c) => c.componentId))
  const categorias = new Set(e.components.map((c) => c.categoryCode))
  const [a, b] = e.components
  const esperado = e.associationCode.split('__')
  const categoriaDe = new Map(e.components.map((c) => [c.componentId, c.categoryCode]))
  const idsDaSessao = [e.compositionId, e.sharedBladderId, ...e.components.map((c) => c.componentId)].filter(Boolean)
  const coerente =
    ids.size === 2 &&
    categorias.size === 2 &&
    ids.has(e.primaryComponentId) &&
    esperado.every((c) => categorias.has(c as never)) &&
    // Um id não pode servir a dois papéis (composição, bexiga, componente).
    new Set(idsDaSessao).size === idsDaSessao.length &&
    (e.associationCode === 'ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA'
      ? e.sharedBladderId !== null && a.acquisitionContextId === b.acquisitionContextId
      : e.sharedBladderId === null && a.acquisitionContextId !== b.acquisitionContextId) &&
    // O texto aceito é o desta revisão, e sua origem aponta para ESTES componentes.
    e.rendered.revision === e.revision &&
    e.rendered.blocks.every((bl) =>
      bl.componentIds.every((id) => ids.has(id)) &&
      bl.categoryCodes.every((code) => bl.componentIds.some((id) => categoriaDe.get(id) === code))) &&
    // Rascunho não editado precisa ser o próprio texto renderizado — senão a
    // reabertura exibiria como "modelo" um texto que o renderer não deu.
    (e.draft.dirty || e.draft.text === e.draft.sourceText)
  if (!coerente) return { kind: 'composition-unsupported', motivo: 'componentes da composição salva não conferem com a associação' }

  const session: CompositionSession = {
    compositionId: e.compositionId,
    associationCode: e.associationCode,
    primaryComponentId: e.primaryComponentId,
    sharedBladderId: e.sharedBladderId,
    components: [
      { componentId: a.componentId, categoryCode: a.categoryCode, acquisitionContextId: a.acquisitionContextId },
      { componentId: b.componentId, categoryCode: b.categoryCode, acquisitionContextId: b.acquisitionContextId },
    ],
    states: Object.fromEntries(e.components.map((c) => [c.componentId, c.uiState as ExamState])),
  }
  return { kind: 'composition', envelope: e, session }
}
