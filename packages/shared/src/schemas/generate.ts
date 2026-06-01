import { z } from "zod";
import { CategoryCodeSchema } from "./categories";
import { StructuredFindingsSchema } from "./findings";
import { ClarifyQuestionSchema } from "./validator";
import { SanityResultSchema } from "./sanity";

/**
 * POST /api/generate — corpo da requisição
 */
export const GenerateRequestSchema = z.object({
  raw_input: z.string().min(2).max(20_000),
  // Hint de categoria (opcional). O structurer pode discordar.
  category_hint: CategoryCodeSchema.optional(),
  writing_style_id: z.string().uuid(),
  // Quando o app já consolidou texto a partir de transcrição live
  consolidated_transcript: z.string().optional(),
  // Quando retomamos um pipeline pausado por clarify, o app reenvia
  // o report em rascunho + as respostas dadas
  resume_from_report_id: z.string().uuid().optional(),
  clarify_answers: z
    .array(
      z.object({
        question_id: z.string(),
        answer: z.string(),
      }),
    )
    .optional(),
  // Origem do request — analytics + roteamento futuro. Default 'iphone'.
  source: z.enum(["iphone", "watch", "web"]).optional(),
  // Quando true e o laudo for finalizado com sucesso, faz touch no updated_at
  // do report para que ele apareça imediatamente no feed da Sala do Auxiliar
  // (via /api/sala/latest). Usado por clientes que querem o "publica direto na
  // sala" sem etapa de revisão (caso de uso: Apple Watch dictation).
  auto_push_to_sala: z.boolean().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

/**
 * Eventos SSE emitidos pelo /api/generate.
 *
 * Ordem típica do happy path:
 *   open → structured → validator(ok) → rag → token*N → sanity → done
 *
 * Caminhos alternativos:
 *   - structured → validator(blocker) → clarify → (cliente reenvia) → ...
 *   - sanity(critical) → blocked
 *   - error a qualquer momento
 *
 * heartbeat é emitido a cada ~15s para manter a conexão viva
 * (proxies/loadbalancers podem cortar conexões ociosas).
 */
const Base = { ts: z.string().datetime() };

export const GenerateSSEEventSchema = z.discriminatedUnion("type", [
  z.object({ ...Base, type: z.literal("open"), report_id: z.string().uuid() }),
  z.object({ ...Base, type: z.literal("heartbeat") }),
  z.object({
    ...Base,
    type: z.literal("structured"),
    payload: StructuredFindingsSchema,
  }),
  z.object({
    ...Base,
    type: z.literal("validator"),
    ok: z.boolean(),
    issues_count: z.number().int(),
  }),
  z.object({
    ...Base,
    type: z.literal("clarify"),
    questions: z.array(ClarifyQuestionSchema),
  }),
  z.object({
    ...Base,
    type: z.literal("rag"),
    blocks_used: z.array(z.string().uuid()),
    blocks_summary: z.array(
      z.object({
        id: z.string().uuid(),
        kind: z.string(),
        title: z.string(),
        priority: z.number().int(),
      }),
    ),
  }),
  z.object({
    ...Base,
    type: z.literal("warning"),
    code: z.string(),
    message: z.string(),
  }),
  z.object({
    ...Base,
    type: z.literal("token"),
    delta: z.string(),
  }),
  z.object({
    ...Base,
    type: z.literal("sanity"),
    result: SanityResultSchema,
  }),
  z.object({
    ...Base,
    type: z.literal("sanity_warning"),
    issues: z.array(SanityResultSchema.shape.issues.element),
    severity: z.enum(["warning", "blocker"]),
  }),
  z.object({
    ...Base,
    type: z.literal("done"),
    report_id: z.string().uuid(),
    final_text: z.string(),
  }),
  z.object({
    ...Base,
    type: z.literal("blocked"),
    report_id: z.string().uuid(),
    reason: z.string(),
    sanity: SanityResultSchema,
  }),
  z.object({
    ...Base,
    type: z.literal("error"),
    code: z.string(),
    message: z.string(),
  }),
]);

export type GenerateSSEEvent = z.infer<typeof GenerateSSEEventSchema>;
