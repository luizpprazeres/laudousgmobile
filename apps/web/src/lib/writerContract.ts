import { z } from 'zod'
import { isWriterCategory } from './writerCategories'

export const WriterCategoryRequestSchema = z.object({
  raw_input: z.string().min(2).max(20_000),
  category_hint: z.string().min(2).max(64),
  resume_from_report_id: z.string().uuid().optional(),
  clarify_answers: z.array(z.object({ question_id: z.string().min(1).max(100), answer: z.string().max(2_000) }).strict()).max(30).optional(),
}).strict()

export type WriterCategoryRequest = z.infer<typeof WriterCategoryRequestSchema> & { category_hint: import('./writerCategories').WriterCategory }

export function parseWriterCategoryRequest(value: unknown): WriterCategoryRequest | null {
  const parsed = WriterCategoryRequestSchema.safeParse(value)
  if (!parsed.success || !isWriterCategory(parsed.data.category_hint)) return null
  return parsed.data as WriterCategoryRequest
}
