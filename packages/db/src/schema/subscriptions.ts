import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
