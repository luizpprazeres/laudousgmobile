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
import { generationOutcomeEnum } from "./enums";
import { authenticatedRole } from "./profiles";
import { reports } from "./reports";

/**
 * generation_runs — auditoria completa por chamada do pipeline.
 * Conforme recomendação do codex: persistir TUDO desde o dia 1 para
 * debug e análise (prompt_version, schema_version, modelos, RAG ids,
 * input estruturado, sanity output, latências por etapa, custo).
 */
export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    promptVersion: text("prompt_version").notNull(),
    contractVersion: text("contract_version").notNull(),
    findingsSchemaVersion: text("findings_schema_version").notNull(),
    modelStructurer: text("model_structurer").notNull(),
    modelWriter: text("model_writer").notNull(),
    modelSanity: text("model_sanity").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    ragQueryText: text("rag_query_text").notNull(),
    ragBlocksUsed: uuid("rag_blocks_used")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    structuredInput: jsonb("structured_input"),
    sanityOutput: jsonb("sanity_output"),
    latencyMsTotal: integer("latency_ms_total").notNull(),
    latencyMsStructurer: integer("latency_ms_structurer"),
    latencyMsWriter: integer("latency_ms_writer"),
    latencyMsSanity: integer("latency_ms_sanity"),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    outcome: generationOutcomeEnum("outcome").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("runs_report_idx").on(t.reportId, t.createdAt.desc()),
    index("runs_outcome_idx").on(t.outcome, t.createdAt.desc()),
    // Usuário lê os runs dos seus laudos (join via report)
    pgPolicy("runs_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM reports r WHERE r.id = ${t.reportId} AND r.user_id = auth.uid())`,
    }),
  ],
).enableRLS();
