import { CorrecoesClient } from "@/components/correcoes/CorrecoesClient";
import {
  getCorrecao,
  listarCorrecoes,
  opcoesCorrecoes,
  resumoPorCategoria,
} from "@/lib/supabase/correcoes-queries";

export const dynamic = "force-dynamic";

export default async function CorrecoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const um = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v !== "" ? v : undefined;
  };

  const filtros = { categoria: um("categoria"), medicoId: um("medico") };
  const [pagina, resumo, opcoes] = await Promise.all([
    listarCorrecoes({ ...filtros, pagina: Number(um("pagina") ?? 1) || 1 }),
    resumoPorCategoria(),
    opcoesCorrecoes(),
  ]);

  const primeira = pagina.linhas[0];
  const detalheInicial = primeira ? await getCorrecao(primeira.id) : null;

  return (
    <CorrecoesClient
      pagina={pagina}
      resumo={resumo}
      opcoes={opcoes}
      filtros={filtros}
      detalheInicial={detalheInicial}
    />
  );
}
