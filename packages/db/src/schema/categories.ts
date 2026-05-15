import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgPolicy,
  index,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "./profiles";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    code: text("code").notNull().unique(),
    label: text("label").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("categories_active_idx").on(t.active),
    pgPolicy("categories_select_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();
