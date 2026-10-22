/** Configuração do servidor. Nada aqui vai para o navegador (sem NEXT_PUBLIC_). */
import { lerAllowlist } from "./auth/acesso";

export interface ConfigServidor {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  allowlist: string[];
  permitirCadastroMfa: boolean;
  /** MFA obrigatório, salvo ADMIN_REQUIRE_MFA=false. */
  exigirMfa: boolean;
  ascAppId: string;
  /** Origem pública quando o painel é servido por rewrite (ex.: https://app.laudousg.com.br). */
  origemPublica: string | null;
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
    exigirMfa: env.ADMIN_REQUIRE_MFA?.trim() !== "false",
    ascAppId: env.ASC_APP_ID?.trim() || "6770609540",
    origemPublica: lerOrigemPublica(env.ADMIN_PUBLIC_ORIGIN),
  };
}

/** Só aceita uma origem https sem caminho; qualquer outra coisa é ignorada (fica null). */
export function lerOrigemPublica(valor: string | undefined): string | null {
  const v = valor?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || (u.pathname !== "/" && u.pathname !== "")) return null;
    return u.origin;
  } catch {
    return null;
  }
}
