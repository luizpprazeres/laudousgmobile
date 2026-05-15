import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgPolicy,
} from "drizzle-orm/pg-core";
import { writingStyleCodeEnum } from "./enums";
import { authenticatedRole } from "./profiles";

export const writingStyles = pgTable(
  "writing_styles",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    code: writingStyleCodeEnum("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    // Qualquer authenticated lê estilos ativos
    pgPolicy("writing_styles_select_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Mutações apenas via service_role (admin no backend)
  ],
).enableRLS();
