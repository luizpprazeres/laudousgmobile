import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "./profiles";

export const productEvents = pgTable(
  "product_events",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id").notNull(),
    surface: text("surface").notNull(),
    eventName: text("event_name").notNull(),
    step: text("step"),
    sessionId: uuid("session_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("product_events_surface_check", sql`${t.surface} IN ('web', 'ios', 'watch')`),
    index("idx_product_events_user_time").on(t.userId, t.createdAt.desc()),
    index("idx_product_events_name_time").on(t.eventName, t.createdAt.desc()),
    pgPolicy("product_events_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("product_events_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();
