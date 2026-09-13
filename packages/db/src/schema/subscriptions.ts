import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profilePlanEnum } from "./enums";
import { authenticatedRole, profiles } from "./profiles";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    tier: profilePlanEnum("tier").notNull(),
    period: text("period").notNull(),
    appleOriginalTxId: text("apple_original_tx_id").notNull(),
    appleLatestTxId: text("apple_latest_tx_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isTrial: boolean("is_trial").notNull().default(false),
    status: text("status").notNull().default("active"),
    /**
     * Posse: o `appAccountToken` que o app fixa na compra = id do usuário
     * Supabase. Igual a `user_id` por construção; guardado à parte para
     * auditoria e para o webhook atribuir uma assinatura que o app não chegou
     * a registrar. Nulo só em linhas legadas (nenhuma em produção).
     */
    appAccountToken: uuid("app_account_token"),
    /** `Production` | `Sandbox` — de onde veio o JWS verificado. */
    environment: text("environment").notNull().default("Production"),
    applePurchaseDate: timestamp("apple_purchase_date", { withTimezone: true }),
    appleSignedDate: timestamp("apple_signed_date", { withTimezone: true }),
    revision: integer("revision").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_apple_original_tx_id_key").on(
      t.appleOriginalTxId,
    ),
    index("idx_subscriptions_user_id").on(t.userId),
    index("idx_subscriptions_active")
      .on(t.userId, t.status)
      .where(sql`${t.status} = 'active'`),
    index("idx_subscriptions_app_account_token").on(t.appAccountToken),
    check("subscriptions_tier_check", sql`${t.tier} IN ('essencial', 'pro')`),
    check("subscriptions_period_check", sql`${t.period} IN ('monthly', 'yearly')`),
    check(
      "subscriptions_status_check",
      sql`${t.status} IN ('active', 'expired', 'grace', 'cancelled', 'refunded')`,
    ),
    pgPolicy("subscriptions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();
