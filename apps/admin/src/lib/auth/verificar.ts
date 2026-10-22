/**
 * Monta o contexto de acesso a partir da sessão (cookies) e decide. Usado no middleware e de novo
 * no layout do painel e nas rotas de API (defesa em profundidade: o middleware sozinho não basta).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { configServidor, type ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import { decidirAcesso, emailPermitido, type Decisao, type NivelMfa } from "./acesso";

export interface ResultadoVerificacao {
  decisao: Decisao;
  cfg: ConfigServidor | null;
  email: string | null;
  userId: string | null;
}

export async function verificarSessao(sessao: SupabaseClient | null, cfg = configServidor()): Promise<ResultadoVerificacao> {
  if (!cfg || !sessao) return { decisao: "negar", cfg, email: null, userId: null };

  // getUser() valida o JWT no servidor do Supabase Auth (não confia só no cookie).
  const { data: u, error } = await sessao.auth.getUser();
  const user = error ? null : u.user;
  if (!user) return { decisao: decidirAcesso({ configurado: true, email: null, nivel: null, papel: null, allowlist: cfg.allowlist }), cfg, email: null, userId: null };

  const email = user.email ?? null;
  let nivel: NivelMfa = null;
  const aal = await sessao.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal.error) nivel = (aal.data.currentLevel as NivelMfa) ?? null;

  // O papel só é consultado se o e-mail passou na allowlist e a sessão já tem MFA.
  let papel: string | null = null;
  if (emailPermitido(email, cfg.allowlist) && nivel === "aal2") {
    const { data } = await clienteServico(cfg).from("profiles").select("role").eq("id", user.id).maybeSingle();
    papel = (data as { role?: string } | null)?.role ?? null;
  }
  return {
    decisao: decidirAcesso({ configurado: true, email, nivel, papel, allowlist: cfg.allowlist }),
    cfg,
    email,
    userId: user.id,
  };
}
