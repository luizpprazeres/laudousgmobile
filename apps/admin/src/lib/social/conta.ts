/**
 * Conta do Instagram conectada (social_accounts) — só servidor, service role, depois da checagem de
 * admin. A tela lê só as colunas públicas (`colunas("social_accounts")`, sem o token); o envelope
 * cifrado é lido apenas aqui, para a publicação. Uma conta só: conectar de novo substitui.
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
}

export interface ContaComToken {
  igUserId: string;
  tokenCifrado: string;
  expiraEm: string | null;
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
}

/** Colunas lidas para publicar (o token só sai daqui cifrado e é aberto em memória). */
const COLUNAS_TOKEN = "ig_user_id,token_ciphertext,token_expires_at";

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
      const r = (data ?? [])[0] as { ig_user_id: string; token_ciphertext: string; token_expires_at: string | null } | undefined;
      return r ? { igUserId: r.ig_user_id, tokenCifrado: r.token_ciphertext, expiraEm: r.token_expires_at } : null;
    },
    async salvar(c) {
      const linha = { ig_user_id: c.igUserId, username: c.username, token_ciphertext: c.tokenCifrado, token_expires_at: c.expiraEm, connected_at: new Date().toISOString() };
      const up = await sb.from("social_accounts").upsert(linha, { onConflict: "ig_user_id" });
      if (up.error) throw new Error("social_accounts: falha ao gravar");
      const del = await sb.from("social_accounts").delete().neq("ig_user_id", c.igUserId);
      if (del.error) throw new Error("social_accounts: falha ao limpar contas antigas");
    },
    async apagar() {
      const { error } = await sb.from("social_accounts").delete().neq("ig_user_id", "");
      if (error) throw new Error("social_accounts: falha ao apagar");
    },
  };
}
