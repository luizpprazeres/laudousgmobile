import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgPolicy,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { authenticatedRole, profiles } from "./profiles";
import { categories } from "./categories";
import { reportTemplateVariants } from "./reportTemplateVariants";

/**
 * account_report_preferences (DET-3) — a máscara escolhida pelo médico por
 * categoria. Uma row por (user_id, category_code). RLS: cada médico lê/escreve
 * só as próprias preferências.
 *
 * Resolvido no route (via lookups.resolveAccountReportPreference): quando o
 * ditado NÃO decide a variante por contexto, usa a `default_variant_id` daqui.
 * `default_variant_id` null ou ausente → fallback para `padrao`.
 */
export const accountReportPreferences = pgTable(
  "account_report_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryCode: text("category_code")
      .notNull()
      .references(() => categories.code, { onDelete: "restrict" }),
    defaultVariantId: uuid("default_variant_id").references(
      () => reportTemplateVariants.id,
      { onDelete: "set null" },
    ),
    // DET-5 ONDA 2 — toggles do renderer (ex: TIREOIDE
    // { show_domingos_score, show_conduct_recommendation }). null → defaults.
    rendererPreferences: jsonb("renderer_preferences"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.categoryCode] }),
    pgPolicy("arp_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("arp_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("arp_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("arp_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();
