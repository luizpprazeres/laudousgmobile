/** Service-role-only metadata. SQL migration owns ACLs, views and detailed CHECKs. */
import {
  bigint,
  boolean,
  integer,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  date,
  uuid,
} from "drizzle-orm/pg-core";
const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});
export const aiModelPrices = pgTable(
  "ai_model_prices",
  {
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    version: text("version").notNull(),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    minInputTokens: integer("min_input_tokens").notNull().default(0),
    inputPerMillion: numeric("input_per_million", { precision: 16, scale: 8 }),
    outputPerMillion: numeric("output_per_million", {
      precision: 16,
      scale: 8,
    }),
    cachedPerMillion: numeric("cached_per_million", {
      precision: 16,
      scale: 8,
    }),
    cacheWritePerMillion: numeric("cache_write_per_million", {
      precision: 16,
      scale: 8,
    }),
    audioPerMinute: numeric("audio_per_minute", { precision: 16, scale: 8 }),
    sourceUrl: text("source_url").notNull(),
    checkedOn: date("checked_on").notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.model, t.version] })],
).enableRLS();
export const aiUsageEvents = pgTable("ai_usage_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  userId: uuid("user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  route: text("route").notNull(),
  stage: text("stage").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cachedInputTokens: integer("cached_input_tokens"),
  cacheWriteInputTokens: integer("cache_write_input_tokens"),
  audioSeconds: numeric("audio_seconds"),
  costUsd: numeric("cost_usd", { precision: 16, scale: 10 }),
  priceVersion: text("price_version"),
  measurement: text("measurement").notNull(),
  surface: text("surface").notNull(),
  requestId: uuid("request_id").notNull(),
  durationMs: integer("duration_ms"),
  ok: boolean("ok").notNull(),
  errorCode: text("error_code"),
}).enableRLS();
export const iapNotifications = pgTable("iap_notifications", {
  notificationUuid: text("notification_uuid").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  signedDate: timestamp("signed_date", { withTimezone: true }),
  notificationType: text("notification_type").notNull(),
  subtype: text("subtype"),
  environment: text("environment").notNull(),
  userId: uuid("user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  originalTxId: text("original_tx_id"),
  productId: text("product_id"),
  offerType: smallint("offer_type"),
  offerDiscountType: text("offer_discount_type"),
  priceMilli: bigint("price_milli", { mode: "number" }),
  currency: text("currency"),
  autoRenewStatus: smallint("auto_renew_status"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}).enableRLS();
export const iapNotificationAttempts = pgTable("iap_notification_attempts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  notificationUuid: text("notification_uuid")
    .notNull()
    .references(() => iapNotifications.notificationUuid),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  result: text("result").notNull(),
}).enableRLS();
