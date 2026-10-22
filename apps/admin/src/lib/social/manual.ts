/**
 * Ações manuais do editor (F3), todas por UPDATE condicional (atômico, sem ler-e-escrever):
 *  - destravar → "Voltar para aprovado": publishing parado há mais de 10 min E sem pedido de
 *    media_publish (publish_requested_at null). Com o pedido registrado, só "Marcar como publicado".
 *  - destravar → "Marcar como publicado": publishing parado há mais de 10 min; link opcional.
 *  - story manual → "Marcar como publicado": approved + manual = true; sem ig_media_id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";

export interface RepositorioManual {
  /** false = não estava preso, já tinha pedido de publish, ou mudou de estado. */
  voltarParaAprovado(id: string, antesDe: string): Promise<boolean>;
  publicadoDestravado(id: string, permalink: string | null, quando: string, antesDe: string): Promise<boolean>;
  manualPublicado(id: string, quando: string): Promise<boolean>;
}

export const NOTA_DESTRAVADO = "Destravado à mão: voltou para aprovado depois de parar em Publicando (o media_publish não tinha sido pedido).";

export function repositorioManual(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioManual {
  const linhas = (r: { data: unknown[] | null; error: unknown }, msg: string) => {
    if (r.error) throw new Error(msg);
    return (r.data ?? []).length === 1;
  };
  return {
    async voltarParaAprovado(id, antesDe) {
      const r = await sb
        .from("social_posts")
        .update({ status: "approved", last_error: NOTA_DESTRAVADO })
        .eq("id", id)
        .eq("status", "publishing")
        .is("publish_requested_at", null)
        .lte("updated_at", antesDe)
        .select(colunas("social_posts"));
      return linhas(r, "social_posts: destravar falhou");
    },
    async publicadoDestravado(id, permalink, quando, antesDe) {
      const r = await sb
        .from("social_posts")
        .update({ status: "published", published_at: quando, permalink, last_error: null })
        .eq("id", id)
        .eq("status", "publishing")
        .lte("updated_at", antesDe)
        .select(colunas("social_posts"));
      return linhas(r, "social_posts: marcar publicado falhou");
    },
    async manualPublicado(id, quando) {
      const r = await sb
        .from("social_posts")
        .update({ status: "published", published_at: quando, last_error: null })
        .eq("id", id)
        .eq("status", "approved")
        .eq("manual", true)
        .select(colunas("social_posts"));
      return linhas(r, "social_posts: marcar publicado falhou");
    },
  };
}
