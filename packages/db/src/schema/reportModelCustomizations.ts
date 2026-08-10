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
import { authenticatedRole, profiles } from "./profiles";
import { categories } from "./categories";
import { writingStyleCodeEnum } from "./enums";

/**
 * Personalização de modelos de laudo — projeto docs/projeto-modelos/.
 *
 * DDL em packages/db/src/sql/0022_model_customizations.sql.
 *
 * O catálogo-base NÃO vive aqui: ele é versionado no Git
 * (apps/api/src/server/renderer/catalog/), para que código e modelo façam
 * deploy atômico juntos. O banco guarda apenas o OVERLAY do usuário e a
 * versão do base a que ele se ancora — ver 04-revisao-codex.md C9.
 */

/**
 * report_scopes — a quem pertence uma personalização.
 *
 * v1 aceita só `scope_type = 'user'`. A entidade existe (em vez de um par solto
 * `scope_type`/`scope_id`) para preservar a integridade referencial com
 * `profiles`, mantendo o caminho aberto para conta/clínica sem migração de
 * dados. Ver 04-revisao-codex.md C10.
 */
export const reportScopes = pgTable(
  "report_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: text("scope_type").notNull().default("user"),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("report_scopes_type_user_uidx").on(t.scopeType, t.userId),
    pgPolicy("rs_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("rs_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();

/**
 * report_model_customizations — o overlay do usuário sobre o catálogo-base.
 *
 * Uma linha por VERSÃO. No máximo um `draft` e um `published` por
 * (escopo, categoria, estilo) — garantido por índices únicos parciais. As
 * versões anteriores viram `archived` e permanecem legíveis: é o histórico que
 * sustenta diff entre versões e rollback.
 *
 * `operations` é sempre validado por validateOperations() no backend ANTES de
 * gravar. O CHECK da coluna é só o piso estrutural (array, ≤ 200 itens).
 */
export const reportModelCustomizations = pgTable(
  "report_model_customizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => reportScopes.id, { onDelete: "cascade" }),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code, { onDelete: "restrict" }),
    styleCode: writingStyleCodeEnum("style_code").notNull(),

    /** Vínculo explícito com o modelo-base e a sua versão. */
    baseCatalogId: text("base_catalog_id").notNull(),
    baseVersao: integer("base_versao").notNull(),

    versao: integer("versao").notNull(),
    status: text("status").notNull().default("draft"),
    operations: jsonb("operations").notNull().default(sql`'[]'::jsonb`),

    note: text("note"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("rmc_versao_uidx").on(t.scopeId, t.categoryCode, t.styleCode, t.versao),
    uniqueIndex("rmc_one_draft_uidx")
      .on(t.scopeId, t.categoryCode, t.styleCode)
      .where(sql`status = 'draft'`),
    uniqueIndex("rmc_one_published_uidx")
      .on(t.scopeId, t.categoryCode, t.styleCode)
      .where(sql`status = 'published'`),
    index("rmc_lookup_idx").on(t.scopeId, t.categoryCode, t.styleCode, t.status),
    index("rmc_historico_idx").on(t.scopeId, t.categoryCode, t.styleCode, t.versao.desc()),
    index("rmc_base_versao_idx").on(t.baseCatalogId, t.baseVersao),
    pgPolicy("rmc_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.report_scopes s where s.id = ${t.scopeId} and s.user_id = auth.uid())`,
    }),
    pgPolicy("rmc_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from public.report_scopes s where s.id = ${t.scopeId} and s.user_id = auth.uid())`,
    }),
    pgPolicy("rmc_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.report_scopes s where s.id = ${t.scopeId} and s.user_id = auth.uid())`,
    }),
    pgPolicy("rmc_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from public.report_scopes s where s.id = ${t.scopeId} and s.user_id = auth.uid())`,
    }),
  ],
).enableRLS();

export type ReportScope = typeof reportScopes.$inferSelect;
export type ReportModelCustomization = typeof reportModelCustomizations.$inferSelect;

/** Estados de uma personalização. Só um draft e um published por chave. */
export const CUSTOMIZATION_STATUS = ["draft", "published", "archived"] as const;
export type CustomizationStatus = (typeof CUSTOMIZATION_STATUS)[number];
