import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isMisconfigured() {
  return !SUPABASE_URL || !SUPABASE_KEY;
}

/** Cliente Supabase para uso no browser (Client Components). */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente do projeto."
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
