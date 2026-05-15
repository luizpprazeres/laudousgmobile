import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cliente Drizzle para uso no backend (apps/api).
 * Usa SUPABASE_SERVICE_ROLE_KEY via DATABASE_URL — bypassa RLS.
 * Para queries que devem respeitar RLS do usuário, prefira supabase-js
 * passando o JWT do usuário.
 */
let _client: postgres.Sql | null = null;

export function getDbClient() {
  if (_client) return drizzle(_client, { schema });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente");
  _client = postgres(url, {
    prepare: false, // Supabase pgbouncer (transaction mode) não suporta
    max: 10,
  });
  return drizzle(_client, { schema });
}

export type DbClient = ReturnType<typeof getDbClient>;
export { schema };
