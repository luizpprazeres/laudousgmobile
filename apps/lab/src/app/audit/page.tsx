import { AuditClient } from "@/components/audit/AuditClient";
import {
  getAuditCounts,
  getAuditDetail,
  getOpcoesFiltro,
  listarAuditoria,
} from "@/lib/supabase/audit-queries";
import type { AuditStatus } from "@/lib/audit/types";

export const dynamic = "force-dynamic";

/**
 * /audit — as gerações de TODAS as contas, com filtros e paginação.
 *
 * Os filtros vivem na URL: dá para guardar o link de uma investigação
 * ("erros de OBSTETRICA em agosto") e voltar a ela depois.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const um = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v !== "" ? v : undefined;
  };

  const filtros = {
    categoria: um("categoria"),
    medicoId: um("medico"),
    status: um("status") as AuditStatus | undefined,
    de: um("de"),
    ate: um("ate"),
    busca: um("busca"),
    tipoIssue: um("alerta"),
    soCriticos: um("criticos") === "1",
    pagina: Number(um("pagina") ?? 1) || 1,
    porPagina: Number(um("porPagina") ?? 50) || 50,
  };

  const [pagina, counts, opcoes] = await Promise.all([
    listarAuditoria(filtros),
    getAuditCounts(),
    getOpcoesFiltro(),
  ]);

  const primeira = pagina.linhas[0];
  const detalheInicial = primeira ? await getAuditDetail(primeira.id) : null;

  return (
    <AuditClient
      pagina={pagina}
      filtros={filtros}
      opcoes={opcoes}
      counts={counts}
      initialDetail={detalheInicial}
    />
  );
}
