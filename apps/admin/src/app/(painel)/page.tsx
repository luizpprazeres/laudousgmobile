import { valorSerie } from "@/lib/data/fonte-diaria";
import { DiasApple } from "@/components/DiasApple";
import { GraficoBarras } from "@/components/GraficoBarras";
import { Barras, Cabecalho, Cartao, Kpi, Secao } from "@/components/ui";
import { noPeriodo } from "@/lib/data/agregar";
import { dataHora, int, pct, PER, PER_CURTO, usd } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

export default async function VisaoGeral({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  const A = d.aquisicao, U = d.uso, C = d.custos, S = d.saude, AS = d.assinaturas;
  const g = C.geracao_periodo.v[p];
  const h = S.geracao.v[p];
  const tf = d.testflight.ok ? d.testflight.dados : null;
  const crash = p === "today" || !tf ? null : p === "d7" ? tf.uso.d7 : tf.uso.d30;
  const cats = U.laudos_por_categoria.v[p].map((c) => [c.label, c.n] as [string, number]);
  const top = cats.slice(0, 8);
  if (cats.length > 8) top.push([`Outras (${cats.length - 8})`, cats.slice(8).reduce((s, c) => s + c[1], 0)]);

  return (
    <>
      <Cabecalho titulo="Visão geral">
        Período: <b>{PER[p]}</b> (fuso de Brasília). Dados lidos em {dataHora(d.meta.gerado_em)}.
      </Cabecalho>
      <Secao>Aquisição</Secao>
      <div className="grid g-6">
        <Kpi rotulo="Visitas na landing" valor={int(A.visitas_landing.v[p])} meta="app.laudousg.com.br" m={A.visitas_landing} />
        <Kpi rotulo="Cliques para a loja" valor={int(A.cliques_loja.v[p])} meta="botões + QR" m={A.cliques_loja} />
        <Kpi rotulo="Primeiras instalações" valor={int(valorSerie(A.instalacoes.v,p))} meta="Primeiras · Apple, até ontem" m={A.instalacoes} />
        <Kpi rotulo="Contas novas" valor={int(A.contas_novas.v[p])} meta={`${int(A.contas_novas.v.total)} contas no total · sem separar iOS/web`} m={A.contas_novas} />
        <Kpi rotulo="Testes grátis" valor={int(noPeriodo(AS.eventos_dia.v.testes, p))} meta="3 dias grátis" m={AS.eventos_dia} />
        <Kpi rotulo="Assinantes ativos" valor={int(AS.estado_atual.v.producao.ativos)} meta="produção, estado atual" m={AS.estado_atual} />
      </div>
      <Secao>Uso e operação</Secao>
      <div className="grid g-6">
        <Kpi rotulo="Laudos gerados" valor={int(U.laudos.v[p])} meta={`${int(U.laudos.v.total)} desde o início`} m={U.laudos} />
        <Kpi rotulo="Usuários ativos" valor={int(U.usuarios_ativos.v[p])} meta="geraram ao menos 1 laudo" m={U.usuarios_ativos} />
        <Kpi rotulo="Custo de IA (geração)" valor={usd(g.cost_usd, 2)} meta="estimado · só structurer + writer" m={C.geracao_periodo} />
        <Kpi rotulo="Custo por laudo" valor={usd(g.custo_por_laudo, 4)} meta={g.cost_null_rows ? `${g.cost_null_rows} laudos sem preço fora da média` : "média do período"} m={C.geracao_periodo} />
        <Kpi rotulo="Erros de geração" valor={pct(h.erro_pct)} meta={`${int(h.error)} de ${int(h.total)} · ${int(h.blocked)} bloqueados`} m={S.geracao} />
        {tf ? (
          <Kpi
            rotulo="Crashes (TestFlight)"
            valor={crash ? int(crash.crashes) : "—"}
            meta={crash ? `${PER_CURTO[p]} · ${int(crash.sessoes)} sessões` : "a Apple agrega em 7/30 dias"}
            m={{ origem: "real", fonte: "ASC betaTesterUsages", v: null }}
          />
        ) : (
          <Kpi rotulo="Crashes (TestFlight)" valor="—" meta={d.testflight.ok ? "" : d.testflight.motivo} m={{ origem: "real", fonte: "ASC betaTesterUsages (indisponível)", v: null }} />
        )}
      </div>
      <Secao>Tendência (30 dias; o período escolhido fica em destaque)</Secao>
      <div className="grid g-2">
        <Cartao titulo="Laudos por dia" sub={`${int(U.laudos.v.d30)} em 30 dias`} m={U.laudos}>
          <GraficoBarras rotulos={d.meta.dias} series={[{ nome: "Laudos", dados: U.laudos.v.serie }]} periodo={p} fmt={int} />
        </Cartao>
        <Cartao titulo="Laudos por categoria" sub={`${PER[p]} · ${int(U.laudos.v[p])} laudos`} m={U.laudos_por_categoria}>
          {top.length ? <Barras itens={top} /> : <p className="chart-fallback">Nenhum laudo no período.</p>}
        </Cartao>
        <Cartao titulo="Contas novas por dia" sub={`${int(A.contas_novas.v.d30)} em 30 dias`} m={A.contas_novas} extra={`separar iOS de web depende do ${A.contas_novas.origem === "real" ? A.contas_novas.go_nota : ""}`}>
          <GraficoBarras rotulos={d.meta.dias} series={[{ nome: "Contas novas", dados: A.contas_novas.v.serie }]} periodo={p} fmt={int} />
        </Cartao>
        <Cartao titulo="Visitas na landing por dia" sub={`${int(A.visitas_landing.v.d30)} em 30 dias`} m={A.visitas_landing}>
          <GraficoBarras rotulos={d.meta.dias} series={[{ nome: "Visitas", dados: A.visitas_landing.v.serie }]} periodo={p} fmt={int} exemplo={A.visitas_landing.origem === "exemplo"} />
        </Cartao>
      </div>
      {d.avisos.length ? <div className="note" style={{ marginTop: 14 }}>{d.avisos.join(" ")}</div> : null}
      {A.apple_dias ? <DiasApple m={A.apple_dias} /> : null}
    </>
  );
}
