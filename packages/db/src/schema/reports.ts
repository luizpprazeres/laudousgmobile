import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgPolicy,
  index,
} from "drizzle-orm/pg-core";
import { reportStatusEnum } from "./enums";
import { authenticatedRole, profiles } from "./profiles";
import { writingStyles } from "./writingStyles";
import { categories } from "./categories";

/**
 * reports — uma row por sessão de geração (vivo do início ao fim do pipeline).
 * Persistido desde o `open` para permitir auditoria completa, mesmo que o
 * pipeline aborte/seja bloqueado.
 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code, { onDelete: "restrict" }),
    writingStyleId: uuid("writing_style_id")
      .notNull()
      .references(() => writingStyles.id, { onDelete: "restrict" }),
    status: reportStatusEnum("status").notNull().default("draft"),
    rawInput: text("raw_input").notNull(),
    consolidatedTranscript: text("consolidated_transcript"),
    structuredFindings: jsonb("structured_findings"),
    generatedOutput: text("generated_output"),
    finalOutput: text("final_output"),
    ragBlocksUsed: uuid("rag_blocks_used")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    sanityResult: jsonb("sanity_result"),
    generationMetadata: jsonb("generation_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reports_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("reports_user_category_idx").on(t.userId, t.categoryCode),
    index("reports_status_idx").on(t.status),
    // Usuário só vê seus próprios laudos
    pgPolicy("reports_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("reports_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("reports_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("reports_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();
