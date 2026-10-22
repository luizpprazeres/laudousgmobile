/**
 * Conta do Instagram conectada (social_accounts) — só servidor, service role, depois da checagem de
 * admin (ou do CRON_SECRET). A tela lê só as colunas públicas (`colunas("social_accounts")`, sem o
 * token); o envelope cifrado é lido e gravado apenas aqui, para publicar e renovar. Uma conta só:
 * conectar de novo substitui.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";

export interface ContaPublica {
  ig_user_id: string;
  username: string;
  token_expires_at: string | null;
  connected_at: string;
  /** F3: datas e motivo da renovação automática (sem token). */
  token_issued_at?: string | null;
  token_refreshed_at?: string | null;
  token_refresh_failed_at?: string | null;
  token_refresh_error?: string | null;
}

export interface ContaComToken {
  igUserId: string;
  tokenCifrado: string;
  expiraEm: string | null;
  /** Quando o token atual foi emitido (token_issued_at, ou connected_at se vazio). */
  emitidoEm?: string | null;
}

export interface TokenRenovado {
  igUserId: string;
  /** Envelope lido antes da renovação: só troca se ninguém reconectou no meio (compare-and-swap). */
  anterior: string;
  tokenCifrado: string;
  expiraEm: string | null;
  quando: string;
}

export interface NovaConta {
  igUserId: string;
  username: string;
  tokenCifrado: string;
  expiraEm: string | null;
}

export interface RepositorioConta {
  /** Sem token. null = nenhuma conta (ou tabela indisponível → lança). */
  ler(): Promise<ContaPublica | null>;
  lerComToken(): Promise<ContaComToken | null>;
  /** Grava a conta e apaga qualquer outra. */
  salvar(c: NovaConta): Promise<void>;
  apagar(): Promise<void>;
  /** Grava o token renovado. false = a conta mudou no meio (reconexão) e nada foi trocado. */
  renovado(r: TokenRenovado): Promise<boolean>;
  /** Registra a falha da renovação SEM tocar no token salvo. */
  falhaRenovacao(igUserId: string, erro: string, quando: string): Promise<void>;
}

/** Colunas lidas para publicar (o token só sai daqui cifrado e é aberto em memória). */
const COLUNAS_TOKEN = "ig_user_id,token_ciphertext,token_expires_at,token_issued_at,connected_at";

export function repositorioConta(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioConta {
  return {
    async ler() {
      const { data, error } = await sb.from("social_accounts").select(colunas("social_accounts")).order("connected_at", { ascending: false }).limit(1);
      if (error) throw new Error("social_accounts indisponível");
      return ((data ?? [])[0] as unknown as ContaPublica | undefined) ?? null;
    },
    async lerComToken() {
      const { data, error } = await sb.from("social_accounts").select(COLUNAS_TOKEN).order("connected_at", { ascending: false }).limit(1);
      if (error) throw new Error("social_accounts indisponível");
      const r = (data ?? [])[0] as { ig_user_id: string; token_ciphertext: string; token_expires_at: string | null; token_issued_at: string | null; connected_at: string } | undefined;
      return r ? { igUserId: r.ig_user_id, tokenCifrado: r.token_ciphertext, expiraEm: r.token_expires_at, emitidoEm: r.token_issued_at ?? r.connected_at } : null;
    },
    async salvar(c) {
      const agora = new Date().toISOString();
      const linha = {
        ig_user_id: c.igUserId,
        username: c.username,
        token_ciphertext: c.tokenCifrado,
        token_expires_at: c.expiraEm,
        connected_at: agora,
        token_issued_at: agora,
        token_refresh_failed_at: null,
        token_refresh_error: null,
      };
      const up = await sb.from("social_accounts").upsert(linha, { onConflict: "ig_user_id" });
      if (up.error) throw new Error("social_accounts: falha ao gravar");
      const del = await sb.from("social_accounts").delete().neq("ig_user_id", c.igUserId);
      if (del.error) throw new Error("social_accounts: falha ao limpar contas antigas");
    },
    async apagar() {
      const { error } = await sb.from("social_accounts").delete().neq("ig_user_id", "");
      if (error) throw new Error("social_accounts: falha ao apagar");
    },
    async renovado(r) {
      const { data, error } = await sb
        .from("social_accounts")
        .update({ token_ciphertext: r.tokenCifrado, token_expires_at: r.expiraEm, token_issued_at: r.quando, token_refreshed_at: r.quando, token_refresh_failed_at: null, token_refresh_error: null })
        .eq("ig_user_id", r.igUserId)
        .eq("token_ciphertext", r.anterior)
        .select(colunas("social_accounts"));
      if (error) throw new Error("social_accounts: falha ao gravar o token renovado");
      return (data ?? []).length === 1;
    },
    async falhaRenovacao(igUserId, erro, quando) {
      const { error } = await sb.from("social_accounts").update({ token_refresh_failed_at: quando, token_refresh_error: erro }).eq("ig_user_id", igUserId);
      if (error) throw new Error("social_accounts: falha ao registrar a falha da renovação");
    },
  };
}
