import { createClient } from "@supabase/supabase-js";

function serverEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} ausente`);
  }

  return value;
}

export function createServerSupabaseClient() {
  return createClient(serverEnv("NEXT_PUBLIC_SUPABASE_URL"), serverEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
