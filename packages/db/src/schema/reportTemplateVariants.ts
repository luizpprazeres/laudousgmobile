import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  pgPolicy,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ragBlockStatusEnum } from "./enums";
import { authenticatedRole, profiles } from "./profiles";
import { categories } from "./categories";
import { writingStyles } from "./writingStyles";

/**
 * report_template_variants (DET-3) — máscaras de laudo como entidade de 1ª
 * classe. Cada variante tem identidade própria (id) que a preferência da conta
 * (account_report_preferences) referencia por chave fixa, nunca por similaridade.
 *
 * No DET-3 a tabela é CATÁLOGO + chave: o conteúdo do modelo continua em
 * knowledge_blocks (tags `variant:<chave>`) e o bundle monta de lá; `variant_key`
 * casa com essas tags. `template_body`/`renderer_schema` passam a ser fonte
 * primária só no DET-5 (renderer).
 */
export const reportTemplateVariants = pgTable(
  "report_template_variants",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code, { onDelete: "restrict" }),
    writingStyleId: uuid("writing_style_id")
      .notNull()
      .references(() => writingStyles.id, { onDelete: "restrict" }),
    // Casa com a tag `variant:<chave>` dos knowledge_blocks. Ex: "padrao",
    // "doppler", "1t", "ta-tv", "enxuta".
    variantKey: text("variant_key").notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull().default(1),
    status: ragBlockStatusEnum("status").notNull().default("draft"),
    // Fonte primária do conteúdo a partir do DET-5 (renderer). Nullable no DET-3.
    templateBody: text("template_body"),
    rendererSchema: jsonb("renderer_schema"),
    rules: jsonb("rules"),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Uma variante por (categoria, estilo, chave).
    uniqueIndex("rtv_category_style_variant_key").on(
      t.categoryCode,
      t.writingStyleId,
      t.variantKey,
    ),
    // Lookup de variantes disponíveis por (categoria, estilo, status).
    index("rtv_category_style_status_idx").on(
      t.categoryCode,
      t.writingStyleId,
      t.status,
    ),
    // Authenticated lê só variantes validadas (p/ montar o picker no app).
    pgPolicy("rtv_select_validated", {
      for: "select",
      to: authenticatedRole,
      using: sql`status = 'validated'`,
    }),
    // Admin gerencia tudo (CRUD via /api/admin/report-template-variants).
    pgPolicy("rtv_admin_all", {
      for: "all",
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Service role bypassa RLS por padrão; não precisa de policy explícita.
  ],
).enableRLS();
