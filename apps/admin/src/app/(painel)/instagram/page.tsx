import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, CabecalhoIg, CartaoConta, ChipPost, FaixaManual, rotuloEtapa } from "@/components/Instagram";
import { exigirAdmin } from "@/lib/auth/servidor";
import { comBase } from "@/lib/base";
import { configInstagram } from "@/lib/social/config";
import { repositorioConta, type ContaPublica } from "@/lib/social/conta";
import { dataValida, diaDaSemana, hojeNoFuso, intervaloCalendario, navegar, noFuso, type Visao } from "@/lib/social/datas";
import { JANELA_MANUAL_MS } from "@/lib/social/politica";
import { listarManuaisAgora, listarPosts, proximoPost } from "@/lib/social/servidor";
import type { LinhaItem, LinhaPost } from "@/lib/social/tipos";

export const metadata: Metadata = { title: "Instagram — LaudoUSG Admin" };

type Busca = Promise<Record<string, string | string[] | undefined>>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export default async function Instagram({ searchParams }: { searchParams: Busca }) {
  const { cfg } = await exigirAdmin();
  const q = await searchParams;
  const visao: Visao = um(q.v) === "mes" ? "mes" : "semana";
  const hoje = hojeNoFuso();
  const em = um(q.em);
  const ref = dataValida(um(q.d)) ? um(q.d) : !Number.isNaN(Date.parse(em)) && em ? noFuso(em).data : hoje;
  const { dias, inicio, fim } = intervaloCalendario(visao, ref);
  const href = (v: Visao, d: string) => `/instagram?v=${v}&d=${d}`;

  let dados: { posts: LinhaPost[]; itens: LinhaItem[] } | null = null;
  try {
    dados = await listarPosts(cfg, inicio, fim);
  } catch {
    dados = null;
  }
  // Conta conectada (sem o token). undefined = tabela indisponível.
  const disponivel = !!configInstagram(cfg.origemPublica);
  let conta: ContaPublica | null | undefined = null;
  if (disponivel) conta = await repositorioConta(cfg).ler().catch(() => undefined);
  const proximo = dados && dados.posts.length === 0 ? await proximoPost(cfg, fim).catch(() => null) : null;
  const agora = Date.now();
  const manuais = await listarManuaisAgora(cfg, new Date(agora - JANELA_MANUAL_MS).toISOString(), new Date(agora).toISOString()).catch(() => null);

  const porDia = new Map<string, { feed: LinhaPost[]; stories: LinhaPost[] }>();
  for (const d of dias) porDia.set(d, { feed: [], stories: [] });
  for (const p of dados?.posts ?? []) {
    const g = porDia.get(noFuso(p.scheduled_at).data);
    if (g) (p.format === "story" ? g.stories : g.feed).push(p);
  }
  const itensDe = (id: string) => (dados?.itens ?? []).filter((i) => i.post_id === id);
  const importado = um(q.importado).split("-").map(Number);
  const mesRef = MESES[Number(ref.slice(5, 7)) - 1];
  const rotulo = visao === "semana" ? `${ddmm(dias[0]!)} a ${ddmm(dias[6]!)}/${dias[6]!.slice(0, 4)}` : `${mesRef} de ${ref.slice(0, 4)}`;

  return (
    <>
      <CabecalhoIg
        titulo="Instagram"
        acoes={
          <form className="ig-importar" method="post" action={comBase("/api/social/importar")} encType="multipart/form-data">
            <label className="campo">Calendário (JSON)<input type="file" name="arquivo" accept=".json,application/json" required /></label>
            <button type="submit" className="botao sec">Importar</button>
          </form>
        }
      >
        Calendário editorial da @laudousg: organize, suba as artes e aprove. O envio automático publica foto, carrossel e story aprovados no horário (verifica a cada 5 min; até 3 tentativas). Mais de 6 h de atraso fica “Atrasado” para você decidir. Stories com sticker são manuais: aparecem abaixo na hora. Importar de novo reescreve só os rascunhos; aprovados e publicados ficam como estão.
      </CabecalhoIg>

      {importado.length === 3 && importado.every(Number.isFinite) ? (
        <div className="callout" role="status">
          Importação concluída: <b>{importado[0]}</b> criados, <b>{importado[1]}</b> rascunhos atualizados, <b>{importado[2]}</b> preservados (aprovados ou publicados).
        </div>
      ) : null}
      <Aviso ok={um(q.ok) || undefined} erro={um(q.erro) || undefined} msg={um(q.msg) || rotuloEtapa(um(q.etapa)) || undefined} />
      <CartaoConta disponivel={disponivel} conta={conta} agora={agora} />
      {manuais ? <FaixaManual posts={manuais.posts} itens={manuais.itens} /> : null}
      {!dados ? (
        <div className="callout warn"><b>Tabelas do Instagram indisponíveis.</b> A migração <code>admin_social</code> ainda não foi aplicada ou o Supabase não respondeu.</div>
      ) : null}

      <div className="ig-barra">
        <div className="seg" role="group" aria-label="Visão">
          <Link href={href("semana", ref)} aria-current={visao === "semana" ? "true" : undefined}>Semana</Link>
          <Link href={href("mes", ref)} aria-current={visao === "mes" ? "true" : undefined}>Mês</Link>
          <Link href={`/instagram/quadro?d=${ref}`}>Quadro</Link>
        </div>
        <div className="ig-nav">
          <Link className="botao sec" href={href(visao, navegar(visao, ref, -1))} aria-label="Anterior">←</Link>
          <Link className="botao sec" href={href(visao, hoje)}>Hoje</Link>
          <Link className="botao sec" href={href(visao, navegar(visao, ref, 1))} aria-label="Próximo">→</Link>
          <b>{rotulo}</b>
        </div>
        {proximo ? <Link href={href(visao, noFuso(proximo).data)}>Próximo post: {ddmm(noFuso(proximo).data)} →</Link> : null}
      </div>

      {visao === "semana" ? (
        <div className="ig-semana">
          <div className="ig-canto" />
          {dias.map((d) => (
            <div key={d} className={`ig-dia-cab${d === hoje ? " hoje" : ""}`}>{DIAS[diaDaSemana(d)]} <b>{ddmm(d)}</b></div>
          ))}
          <div className="ig-faixa">Feed</div>
          {dias.map((d) => (
            <div key={`f${d}`} className="ig-cel">{porDia.get(d)!.feed.map((p) => <ChipPost key={p.id} post={p} itens={itensDe(p.id)} agora={agora} />)}</div>
          ))}
          <div className="ig-faixa">Stories</div>
          {dias.map((d) => (
            <div key={`s${d}`} className="ig-cel">{porDia.get(d)!.stories.map((p) => <ChipPost key={p.id} post={p} itens={itensDe(p.id)} agora={agora} />)}</div>
          ))}
        </div>
      ) : (
        <div className="ig-mes">
          {DIAS.map((d) => <div key={d} className="ig-dia-cab">{d}</div>)}
          {dias.map((d) => {
            const g = porDia.get(d)!;
            return (
              <div key={d} className={`ig-cel-mes${d.slice(0, 7) !== ref.slice(0, 7) ? " fora" : ""}${d === hoje ? " hoje" : ""}`}>
                <div className="ig-num">{Number(d.slice(8, 10))}</div>
                {g.feed.length ? <div className="ig-grupo"><span className="ig-rot">Feed</span>{g.feed.map((p) => <ChipPost key={p.id} post={p} itens={itensDe(p.id)} agora={agora} />)}</div> : null}
                {g.stories.length ? <div className="ig-grupo"><span className="ig-rot">Stories</span>{g.stories.map((p) => <ChipPost key={p.id} post={p} itens={itensDe(p.id)} agora={agora} />)}</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
