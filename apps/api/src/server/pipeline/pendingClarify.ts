import { ClarifyQuestionSchema } from '@laudousg/shared'

export const PENDING_CLARIFY_CONTRACT_VERSION = 1 as const

/** `generation_metadata` already exists on reports; retain only questions needed to resume. */
export function pendingClarifyMetadata(questions: unknown) {
  const parsed = ClarifyQuestionSchema.array().min(1).max(30).parse(questions)
  return {
    pending_clarify: {
      contractVersion: PENDING_CLARIFY_CONTRACT_VERSION,
      questions: parsed,
    },
  }
}
