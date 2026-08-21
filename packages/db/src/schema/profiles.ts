import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgPolicy,
  pgRole,
} from "drizzle-orm/pg-core";
import { profilePlanEnum, profileRoleEnum } from "./enums";

/**
 * Roles do Postgres usados pelo Supabase. Declarados aqui para que o Drizzle
 * gere policies referenciando-os corretamente.
 */
export const authenticatedRole = pgRole("authenticated").existing();
export const serviceRole = pgRole("service_role").existing();

/**
 * profiles — espelho de auth.users com campos de aplicação.
 * Um trigger em auth.users insere uma row aqui ao registrar (ver sql/0001_triggers.sql).
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    email: text("email").notNull(),
    name: text("name"),
    role: profileRoleEnum("role").notNull().default("user"),
    plan: profilePlanEnum("plan").notNull().default("free"),
    defaultWritingStyleId: uuid("default_writing_style_id"),
    /**
     * Registro profissional. Existem no banco desde a migração do onboarding,
     * mas ficaram fora deste schema — e por isso fora do `ProfileSchema`, da
     * rota `/api/me/profile` e de qualquer tela. O médico não tinha onde
     * informar o próprio CRM.
     */
    crm: text("crm"),
    uf: text("uf"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // RLS: usuário só lê/atualiza seu próprio profile.
    pgPolicy("profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.id}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = ${t.id}`,
      withCheck: sql`auth.uid() = ${t.id} AND role = (SELECT role FROM profiles WHERE id = auth.uid())`,
    }),
    // Service role bypassa RLS por padrão; não precisa de policy explícita.
  ],
).enableRLS();
