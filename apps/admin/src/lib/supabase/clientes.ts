/**
 * Clientes Supabase do painel — todos só no servidor.
 *  - sessão: anon key + cookies httpOnly, Secure, SameSite=Strict, Path=/admin.
 *  - serviço: service role, sem sessão; usado só depois da checagem de acesso.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConfigServidor } from "../env";

export const OPCOES_COOKIE: CookieOptions = {
  path: "/admin",
  sameSite: "strict",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

export interface PoteCookies {
  getAll(): { name: string; value: string }[];
  setAll(lista: { name: string; value: string; options: CookieOptions }[]): void;
}

export function clienteSessao(cfg: ConfigServidor, pote: PoteCookies): SupabaseClient {
  return createServerClient(cfg.supabaseUrl, cfg.anonKey, {
    cookieOptions: { ...OPCOES_COOKIE, name: "admin-sb" },
    cookies: {
      getAll: () => pote.getAll(),
      setAll: (lista: { name: string; value: string; options: CookieOptions }[]) =>
        pote.setAll(lista.map((c) => ({ ...c, options: { ...c.options, ...OPCOES_COOKIE } }))),
    },
  }) as unknown as SupabaseClient;
}

let servico: SupabaseClient | null = null;
export function clienteServico(cfg: ConfigServidor): SupabaseClient {
  if (!servico) {
    servico = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-client-info": "laudousg-admin" } },
    });
  }
  return servico;
}
