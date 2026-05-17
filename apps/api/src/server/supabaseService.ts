import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Cliente Supabase com service_role — usado em rotas server-side que
 * precisam bypassar RLS (ex: gerenciar room_tokens, invocar RPCs SECURITY DEFINER).
 *
 * NUNCA expor SUPABASE_SERVICE_ROLE_KEY no cliente.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const e = env();
  cached = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
