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
import {
  learningSuggestionKindEnum,
  learningSuggestionStatusEnum,
} from "./enums";
import { authenticatedRole, profiles } from "./profiles";
import { reports } from "./reports";

/**
 * learning_suggestions — quando o usuário edita um laudo gerado, o backend
 * pode gerar sugestões de aprendizado (nova frase, regra, exceção, ajuste
 * de modelo). Sugestões NÃO entram automaticamente no RAG — admin valida.
 */
export const learningSuggestions = pgTable(
  "learning_suggestions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    sourceReportId: uuid("source_report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    kind: learningSuggestionKindEnum("kind").notNull(),
    diff: jsonb("diff").notNull(), // {before, after, fields_changed}
    proposedContent: text("proposed_content").notNull(),
    rationale: text("rationale"),
    status: learningSuggestionStatusEnum("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id),
    reviewNotes: text("review_notes"),
    // Quando aprovada e mergeada num knowledge_block
    mergedKnowledgeBlockId: uuid("merged_knowledge_block_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ls_status_idx").on(t.status, t.createdAt.desc()),
    // Usuário pode ver/criar suas próprias sugestões
    pgPolicy("ls_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.submittedBy}`,
    }),
    pgPolicy("ls_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = ${t.submittedBy}`,
    }),
  ],
).enableRLS();
