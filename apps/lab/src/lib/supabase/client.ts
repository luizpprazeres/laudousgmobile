import { createClient } from "@supabase/supabase-js";

function publicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} ausente`);
  }

  return value;
}

export function createBrowserSupabaseClient() {
  return createClient(publicEnv("NEXT_PUBLIC_SUPABASE_URL"), publicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}
