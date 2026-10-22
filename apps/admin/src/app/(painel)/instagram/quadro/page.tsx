import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, CabecalhoIg } from "@/components/Instagram";
import { EnvioLote } from "@/components/EnvioLote";
import { QuadroInstagram } from "@/components/QuadroInstagram";
import { exigirAdmin } from "@/lib/auth/servidor";
import { dataValida, hojeNoFuso, instanteNoFuso, noFuso, somarDias } from "@/lib/social/datas";
import { catalogoDe, montarQuadro, segundaDe, semanasQuadro, SEMANAS_QUADRO } from "@/lib/social/quadro";
import { listarPosts, proximoPost } from "@/lib/social/servidor";

export const metadata: Metadata = { title: "Quadro — Instagram — LaudoUSG Admin" };

type Busca = Promise<Record<string, string | string[] | undefined>>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function Quadro({ searchParams }: { searchParams: Busca }) {
  const { cfg } = await exigirAdmin();
  const q = await searchParams;
  const hoje = hojeNoFuso();
  const agora = Date.now();
  // Sem ?d=: começa na semana do primeiro post a partir desta semana (o calendário de 26/10 abre em S1).
  let ref = dataValida(um(q.d)) ? um(q.d) : null;
  if (!ref) {
    const primeiro = await proximoPost(cfg, instanteNoFuso(segundaDe(hoje), "00:00")).catch(() => null);
    ref = primeiro ? noFuso(primeiro).data : hoje;
  }
  const { semanas: diasSemanas, inicio, fim } = semanasQuadro(ref);
  const segunda = diasSemanas[0]![0]!;
  const ultimo = diasSemanas[SEMANAS_QUADRO - 1]![6]!;
  const href = (d: string) => `/instagram/quadro?d=${d}`;

  let semanas = null;
  try {
    const { posts, itens } = await listarPosts(cfg, inicio, fim);
    semanas = montarQuadro(diasSemanas, posts, itens, agora);
  } catch {
    semanas = null;
  }
  const total = semanas ? semanas.reduce((n, s) => n + s.dias.reduce((m, d) => m + d.feed.length + d.stories.length, 0), 0) : 0;

  return (
    <>
      <CabecalhoIg titulo="Instagram · Quadro">
        As quatro semanas numa tela, com a prévia de todas as artes. Arraste um rascunho para outro dia (a hora fica a mesma) ou troque a hora no próprio cartão; arraste as miniaturas para reordenar o carrossel. Selecione vários e aprove de uma vez: cada post passa pelas mesmas regras do editor. Aprovado não se move: volte para rascunho antes.
      </CabecalhoIg>
      <Aviso ok={um(q.ok) || undefined} erro={um(q.erro) || undefined} />

      <div className="ig-barra">
        <div className="seg" role="group" aria-label="Visão">
          <Link href={`/instagram?v=semana&d=${segunda}`}>Semana</Link>
          <Link href={`/instagram?v=mes&d=${segunda}`}>Mês</Link>
          <Link href={href(segunda)} aria-current="true">Quadro</Link>
        </div>
        <div className="ig-nav">
          <Link className="botao sec" href={href(somarDias(segunda, -7))} aria-label="Semana anterior">←</Link>
          <Link className="botao sec" href="/instagram/quadro">Início</Link>
          <Link className="botao sec" href={href(somarDias(segunda, 7))} aria-label="Próxima semana">→</Link>
          <b>{ddmm(segunda)} a {ddmm(ultimo)}/{ultimo.slice(0, 4)}</b>
          {semanas ? <span className="ig-conta qd-total">{total} {total === 1 ? "post" : "posts"}</span> : null}
        </div>
      </div>

      {!semanas ? (
        <div className="callout warn"><b>Tabelas do Instagram indisponíveis.</b> A migração <code>admin_social</code> ainda não foi aplicada ou o Supabase não respondeu.</div>
      ) : (
        <>
          <EnvioLote catalogo={catalogoDe(semanas)} />
          <QuadroInstagram semanas={semanas} />
        </>
      )}
    </>
  );
}
