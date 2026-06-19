import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service role — bypassa RLS. USAR SÓ NO SERVIDOR
 * (route handlers de webhook). Nunca expor a service key ao cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
