import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

/**
 * Pro liberado por convite/cortesia, fora da App Store (migração 20261023013652_cortesias).
 * Não escreve `profiles.plan`: o plano efetivo é resolvido em LEITURA, como a assinatura Apple.
 * Vigente = não revogada, `inicio` já passou e `fim` nulo (sem prazo) ou no futuro.
 * RLS ligado e sem policies: só o servidor (service role / dono) lê e escreve.
 */
export const cortesias = pgTable(
  "cortesias",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tier: text("tier").notNull().default("pro"),
    origem: text("origem").notNull().default("convite"),
    inicio: timestamp("inicio", { withTimezone: true }).notNull().defaultNow(),
    fim: timestamp("fim", { withTimezone: true }),
    revogadaEm: timestamp("revogada_em", { withTimezone: true }),
    criadoPor: uuid("criado_por").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cortesias_user_id").on(t.userId),
    check("cortesias_tier_check", sql`${t.tier} IN ('essencial', 'pro')`),
    check("cortesias_origem_check", sql`${t.origem} IN ('convite', 'cortesia')`),
  ],
).enableRLS();
