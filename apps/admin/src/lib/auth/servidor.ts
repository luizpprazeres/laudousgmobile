/** Guardas para Server Components e Route Handlers (rodam DEPOIS do middleware, de novo). */
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { configServidor, type ConfigServidor } from "../env";
import { clienteSessao } from "../supabase/clientes";
import { verificarSessao, type ResultadoVerificacao } from "./verificar";

export async function sessaoDoServidor() {
  const cfg = configServidor();
  if (!cfg) return { cfg: null, sessao: null };
  const pote = await cookies();
  const sessao = clienteSessao(cfg, {
    getAll: () => pote.getAll(),
    setAll: (lista) => {
      try {
        lista.forEach(({ name, value, options }) => pote.set(name, value, options));
      } catch {
        // Server Component não grava cookie; o middleware já renovou a sessão.
      }
    },
  });
  return { cfg, sessao };
}

/** Para páginas do painel: só passa admin com MFA; o resto vai para o login, MFA ou 404. */
export async function exigirAdmin(): Promise<ResultadoVerificacao & { cfg: ConfigServidor }> {
  const { cfg, sessao } = await sessaoDoServidor();
  const r = await verificarSessao(sessao, cfg);
  if (r.decisao === "login") redirect("/login");
  if (r.decisao === "mfa") redirect("/mfa");
  if (r.decisao !== "permitir" || !r.cfg) notFound();
  return r as ResultadoVerificacao & { cfg: ConfigServidor };
}
