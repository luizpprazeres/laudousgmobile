/** Preparação comum das telas: checa acesso de novo, lê o período e carrega os dados. */
import { exigirAdmin } from "./auth/servidor";
import { carregarPainel } from "./data/painel";
import { lerPeriodo } from "./formato";

export type BuscaPagina = Promise<Record<string, string | string[] | undefined>>;

export async function prepararPagina(searchParams: BuscaPagina) {
  const { cfg } = await exigirAdmin();
  const p = lerPeriodo((await searchParams).p);
  const d = await carregarPainel(cfg);
  return { p, d };
}
