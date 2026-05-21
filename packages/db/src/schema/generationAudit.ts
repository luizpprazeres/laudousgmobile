import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  pgPolicy,
  index,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { reports } from "./reports";
import { writingStyles } from "./writingStyles";

export const generationAudit = pgTable(
  "generation_audit",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    category: text("category").notNull(),
    writingStyleId: uuid("writing_style_id").references(
      () => writingStyles.id,
    ),
    rawInput: text("raw_input"),
    categoryHint: text("category_hint"),
    structuredOutput: jsonb("structured_output"),
    validatorResult: jsonb("validator_result"),
    ragBlocksRetrieved: jsonb("rag_blocks_retrieved"),
    ragBlocksSkipped: jsonb("rag_blocks_skipped"),
    systemMessageFull: text("system_message_full"),
    outputText: text("output_text"),
    sanityResult: jsonb("sanity_result"),
    totalDurationMs: integer("total_duration_ms"),
    structurerDurationMs: integer("structurer_duration_ms"),
    validatorDurationMs: integer("validator_duration_ms"),
    ragDurationMs: integer("rag_duration_ms"),
    writerDurationMs: integer("writer_duration_ms"),
    sanityDurationMs: integer("sanity_duration_ms"),
    openaiInputTokens: integer("openai_input_tokens"),
    openaiOutputTokens: integer("openai_output_tokens"),
    openaiCostUsd: numeric("openai_cost_usd", { precision: 10, scale: 6 }),
    modelWriter: text("model_writer"),
    modelStructurer: text("model_structurer"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    errorStage: text("error_stage"),
    promptVersion: text("prompt_version").notNull(),
    pipelineVersion: text("pipeline_version").notNull().default("v1"),
    contractHash: text("contract_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_gen_audit_report").on(t.reportId),
    index("idx_gen_audit_user_created").on(t.userId, t.createdAt.desc()),
    index("idx_gen_audit_category_style_created").on(
      t.category,
      t.writingStyleId,
      t.createdAt.desc(),
    ),
    index("idx_gen_audit_contract_hash").on(t.contractHash),
    index("idx_gen_audit_error")
      .on(t.errorCode)
      .where(sql`${t.errorCode} IS NOT NULL`),
    pgPolicy("audit_service_role_all", {
      for: "all",
      using: sql`((SELECT auth.jwt() ->> 'role') = 'service_role')`,
      withCheck: sql`((SELECT auth.jwt() ->> 'role') = 'service_role')`,
    }),
    pgPolicy("audit_admin_select", {
      for: "select",
      using: sql`((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')`,
    }),
  ],
).enableRLS();
