import { ClarifyQuestionSchema, type ClarifyQuestion } from '@laudousg/shared'
import { z } from 'zod'

export const PendingClarifyMetadataSchema = z.object({
  pending_clarify: z.object({
    contractVersion: z.literal(1),
    questions: z.array(ClarifyQuestionSchema).min(1).max(30),
  }).strict(),
}).passthrough()

export function questionsFromPendingClarify(metadata: unknown) {
  const parsed = PendingClarifyMetadataSchema.safeParse(metadata)
  return parsed.success ? parsed.data.pending_clarify.questions : null
}

export type PendingWriterReport = {
  id: string
  rawInput: string
  updatedAt: string
  questions: ClarifyQuestion[]
}
