/** Configuração do servidor. Nada aqui vai para o navegador (sem NEXT_PUBLIC_). */
import { lerAllowlist } from "./auth/acesso";

export interface ConfigServidor {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  allowlist: string[];
  permitirCadastroMfa: boolean;
  ascAppId: string;
}

/** Devolve null se faltar algo essencial — e aí o painel nega tudo (falha fechada). */
export function configServidor(env: Record<string, string | undefined> = process.env): ConfigServidor | null {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const allowlist = lerAllowlist(env.ADMIN_EMAILS);
  if (!supabaseUrl || !anonKey || !serviceRoleKey || allowlist.length === 0) return null;
  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    allowlist,
    permitirCadastroMfa: env.ADMIN_ALLOW_MFA_ENROLL === "true",
    ascAppId: env.ASC_APP_ID?.trim() || "6770609540",
  };
}
