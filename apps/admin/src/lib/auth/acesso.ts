/**
 * Decisão de acesso ao painel — função pura, sem rede, testável.
 *
 * Regras (plano §2, "Autenticação"):
 *  1. Sem configuração completa no servidor → nega (falha fechada).
 *  2. Sem sessão → manda para o login.
 *  3. E-mail fora da allowlist (ADMIN_EMAILS) → nega, mesmo com MFA e papel admin.
 *  4. Sessão sem MFA (aal1) → manda para a etapa de MFA; nunca libera.
 *  5. profiles.role diferente de 'admin' → nega.
 *  6. Só então libera.
 *
 * "Nega" vira 404 nas rotas, para não revelar que o painel existe.
 */

export type Decisao = "permitir" | "login" | "mfa" | "negar";
export type NivelMfa = "aal1" | "aal2" | null;

export interface ContextoAcesso {
  /** Servidor tem URL, chaves e allowlist. */
  configurado: boolean;
  /** E-mail do usuário verificado pelo Supabase Auth (getUser), ou null sem sessão. */
  email: string | null;
  /** Nível de garantia da sessão atual. */
  nivel: NivelMfa;
  /** profiles.role lido com service role; null se não encontrado. */
  papel: string | null;
  allowlist: readonly string[];
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "a@x.com, B@y.com ,," → ["a@x.com", "b@y.com"] */
export function lerAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,;\s]+/)
        .map(normalizarEmail)
        .filter((e) => e.length > 3 && e.includes("@")),
    ),
  );
}

export function emailPermitido(email: string | null | undefined, allowlist: readonly string[]): boolean {
  if (!email || allowlist.length === 0) return false;
  return allowlist.includes(normalizarEmail(email));
}

export function decidirAcesso(c: ContextoAcesso): Decisao {
  if (!c.configurado) return "negar";
  if (!c.email) return "login";
  if (!emailPermitido(c.email, c.allowlist)) return "negar";
  if (c.nivel !== "aal2") return "mfa";
  if (c.papel !== "admin") return "negar";
  return "permitir";
}

/** Caminhos (sem o basePath) que não exigem sessão completa. */
const PUBLICAS = new Set(["/login", "/mfa", "/api/auth/login", "/api/auth/mfa", "/api/auth/logout"]);

export function rotaPublica(caminho: string): boolean {
  const limpo = caminho.replace(/\/+$/, "") || "/";
  return PUBLICAS.has(limpo);
}

/**
 * Compara a origem do POST com o host (proteção extra além de SameSite=Strict). Atrás do rewrite da
 * landing o Host é o do deploy, então a origem pública configurada também vale.
 */
export function origemConfere(origin: string | null, host: string | null, origemPublica: string | null = null): boolean {
  if (!origin) return false;
  try {
    const o = new URL(origin);
    if (origemPublica && o.origin === origemPublica) return true;
    return !!host && o.host === host;
  } catch {
    return false;
  }
}
