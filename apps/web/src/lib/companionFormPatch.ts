import {
  COMPANION_FORM_PATCH_CONTRACT_VERSION,
  CompanionFormPatchErrorSchema,
  CompanionFormPatchRequestSchema,
  CompanionFormPatchResponseSchema,
  type CompanionFormPatchRequest,
  type CompanionFormPatchResponse,
  type CompanionFormPatchWarning,
} from '@laudousg/shared/schemas'
import { companionReviewItems, type CompanionReviewItem } from './companionReview'
import { applyCompanionCarotids, type CompanionStructuredPayload } from './companionStructured'
import type { ExamState } from './deterministic/compose'

export const COMPANION_FORM_PATCH_VERSION = COMPANION_FORM_PATCH_CONTRACT_VERSION
export const COMPANION_FORM_PATCH_CATEGORY = 'DOPPLER_CAROTIDAS' as const

export type CompanionFormPatchInput = Omit<CompanionFormPatchRequest, 'contractVersion' | 'category'>
export type { CompanionFormPatchRequest, CompanionFormPatchResponse, CompanionFormPatchWarning }

const errorMessages: Record<string, string> = {
  unauthorized: 'Sua sessão expirou. Entre novamente para interpretar o texto.',
  feature_unavailable: 'A interpretação para campos ainda não está liberada neste ambiente.',
  unsupported_media_type: 'O texto não pôde ser enviado no formato esperado.',
  payload_too_large: 'O texto é longo demais para interpretar de uma vez.',
  invalid_json: 'O texto não pôde ser enviado para interpretação.',
  invalid_companion_form_patch: 'A entrada recebida não está em um formato válido para interpretação.',
  rate_limit_exceeded: 'O limite temporário de interpretações foi atingido. Tente novamente em um minuto.',
  no_applicable_findings: 'Não reconheci campos seguros para preencher automaticamente.',
  companion_form_patch_unavailable: 'A interpretação está indisponível agora. Você ainda pode inserir o texto como achado.',
}

export class CompanionFormPatchClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly warnings: CompanionFormPatchWarning[] = [],
  ) {
    super(message)
    this.name = 'CompanionFormPatchClientError'
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function parseCompanionFormPatchRequest(value: unknown): CompanionFormPatchRequest | null {
  const parsed = CompanionFormPatchRequestSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function parseCompanionFormPatchResponse(value: unknown): CompanionFormPatchResponse | null {
  const parsed = CompanionFormPatchResponseSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function companionFormPatchReviewItems(response: CompanionFormPatchResponse): CompanionReviewItem[] {
  const payload: CompanionStructuredPayload = {
    contractVersion: response.contractVersion,
    category: response.category,
    data: response.data,
  }
  return companionReviewItems(payload)
}

export function applyCompanionCarotidFormPatch(
  current: ExamState,
  response: CompanionFormPatchResponse,
): ExamState {
  const payload: CompanionStructuredPayload = {
    contractVersion: response.contractVersion,
    category: response.category,
    data: response.data,
  }
  return applyCompanionCarotids(current, payload)
}

export async function extractCompanionFormPatch(
  input: CompanionFormPatchInput,
  signal?: AbortSignal,
): Promise<CompanionFormPatchResponse> {
  const body = parseCompanionFormPatchRequest({
    contractVersion: COMPANION_FORM_PATCH_VERSION,
    category: COMPANION_FORM_PATCH_CATEGORY,
    ...input,
  })
  if (!body) throw new Error('Informe um texto válido para analisar.')

  let response: Response
  try {
    response = await fetch('/api/companion/form-patch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new Error('Não foi possível analisar o texto agora.')
  }

  const raw: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsedError = CompanionFormPatchErrorSchema.safeParse(raw)
    if (parsedError.success) {
      const warningText = parsedError.data.warnings?.map((warning) => warning.message).join(' ') ?? ''
      const message = [errorMessages[parsedError.data.error] ?? 'A análise do texto foi recusada.', warningText].filter(Boolean).join(' ')
      throw new CompanionFormPatchClientError(parsedError.data.error, message, parsedError.data.warnings ?? [])
    }
    const error = record(raw)
    throw new Error(nonEmptyString(error?.error) ?? 'A análise do texto foi recusada.')
  }
  const parsed = parseCompanionFormPatchResponse(raw)
  if (!parsed) throw new Error('A análise retornou dados inválidos.')
  return parsed
}

/** Alias temporário para consumidores que adotaram o nome da camada de rede. */
export const requestCompanionFormPatch = extractCompanionFormPatch
