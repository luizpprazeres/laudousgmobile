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
import { goldenStatusEnum } from "./enums";
import { writingStyles } from "./writingStyles";
import { categories } from "./categories";

/**
 * golden_cases — casos validados manualmente pelo criador. Servem para
 * regression test do pipeline (a cada mudança de prompt/RAG/modelo).
 * NÃO são RAG — não vão pro retriever. Só pro runner de avaliação.
 */
export const goldenCases = pgTable(
  "golden_cases",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code),
    writingStyleId: uuid("writing_style_id")
      .notNull()
      .references(() => writingStyles.id),
    inputText: text("input_text").notNull(),
    expectedOutput: text("expected_output").notNull(),
    // Achados estruturados esperados (opcional — golden de structurer)
    expectedFindings: jsonb("expected_findings"),
    status: goldenStatusEnum("status").notNull().default("active"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("golden_filter_idx").on(t.categoryCode, t.writingStyleId, t.status),
    // Apenas service_role lê/escreve golden_cases (admin).
    // Sem policy de SELECT para authenticated.
  ],
).enableRLS();
