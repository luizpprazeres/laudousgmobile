import { GraficoBarras } from "@/components/GraficoBarras";
import { Cabecalho, Cartao, Kpi, Tabela } from "@/components/ui";
import { real } from "@/lib/data/tipos";
import { dataHoraCurta, diaCurto, int, nomeCategoria, pct, PER, seg } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

export default async function Saude({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  const S = d.saude;
  const h = S.geracao.v[p], all = S.geracao.v.all, du = S.duracoes_30d.v;
    const tf = d.testflight.ok ? d.testflight.dados : null;
  const n = d.assinaturas.notificacoes_apple;

  return (
    <>
      <Cabecalho titulo="Saúde">
        Erros e tempos da geração de laudos (real, de <code>generation_runs</code> e <code>generation_audit</code>, sem conteúdo clínico). As outras rotas entram com <code>ai_usage_events</code>.
      </Cabecalho>
      <div className="grid g-6">
        <Kpi rotulo="Taxa de erro" valor={pct(h.erro_pct)} meta={`${int(h.error)} de ${int(h.total)} · ${PER[p]}`} m={S.geracao} />
        <Kpi rotulo="Bloqueios (sanity)" valor={pct(h.bloqueio_pct)} meta={`${int(h.blocked)} bloqueados`} m={S.geracao} />
        <Kpi rotulo="Duração total" valor={seg(du.total_p50)} meta={`p50 · p95 ${seg(du.total_p95)} · 30 dias`} m={S.duracoes_30d} />
        <Kpi rotulo="Writer" valor={seg(du.writer_p50)} meta={`p50 · p95 ${seg(du.writer_p95)} · 30 dias`} m={S.duracoes_30d} />
        <Kpi
          rotulo="Crashes (TestFlight)"
          valor={tf ? int(tf.uso.d30.crashes) : "—"}
          meta={tf ? `30 dias · ${int(tf.uso.d30.sessoes)} sessões` : d.testflight.ok ? "" : d.testflight.motivo}
          m={real("ASC betaTesterUsages", null)}
        />
        <Kpi rotulo="Crashes (loja)" valor={int(S.crashes_app_loja.v[p])} meta="usuários da App Store" m={S.crashes_app_loja} />
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Gerações por dia e resultado" sub={`30 dias · desde sempre: ${int(all.success)} ok · ${int(all.blocked)} bloqueadas · ${int(all.error)} erros`} m={S.geracao_dia}>
          <div className="chart-legend">
            <span><i style={{ background: "var(--chart-1-soft)" }} />Sucesso</span>
            <span><i style={{ background: "var(--warn)" }} />Bloqueada</span>
            <span><i style={{ background: "var(--err)" }} />Erro</span>
          </div>
          <GraficoBarras
            rotulos={d.meta.dias}
            fmt={int}
            series={[
              { nome: "Sucesso", dados: S.geracao_dia.v.ok, cor: "var(--chart-1-soft)" },
              { nome: "Bloqueada", dados: S.geracao_dia.v.blocked, cor: "var(--warn)" },
              { nome: "Erro", dados: S.geracao_dia.v.error, cor: "var(--err)" },
            ]}
          />
        </Cartao>
        <Cartao titulo="Códigos de erro" sub="geração · 30 dias e desde o início" m={S.codigos_erro}>
          <Tabela
            cab={["Código", "Etapa", "30 dias", "Total", "Último"]}
            numericas={[2, 3]}
            linhas={S.codigos_erro.v.map((e) => [<code key="c">{e.code}</code>, e.stage, e.n30 ? <b key="n">{int(e.n30)}</b> : "0", int(e.n), diaCurto(e.last_at)])}
          />
        </Cartao>
      </div>
      <div style={{ marginTop: 14 }}>
        <Cartao titulo="Últimos 20 erros" sub="sem texto do laudo nem mensagem de erro" m={S.ultimos_erros}>
          <Tabela
            cab={["Quando", "Código", "Etapa", "Categoria", "Modelo", "Duração"]}
            numericas={[5]}
            linhas={S.ultimos_erros.v.map((e) => [dataHoraCurta(e.at), <code key="c">{e.code}</code>, e.stage, nomeCategoria(e.cat, d.meta.categorias), <code key="m">{e.model}</code>, seg(e.ms)])}
          />
        </Cartao>
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Erros por rota (30 dias)" sub="transcrição, Deepgram, Consultor, visão, edição" m={S.outras_rotas_30d}>
          <Tabela
            cab={["Rota", "Chamadas", "Erros", "Taxa"]}
            numericas={[1, 2, 3]}
            linhas={S.outras_rotas_30d.v.map((r) => [<code key="r">/{r.rota}</code>, int(r.chamadas), int(r.erros), pct(r.chamadas ? (r.erros / r.chamadas) * 100 : 0)])}
          />
        </Cartao>
        <Cartao titulo="Notificações da Apple" sub="webhook V2 → /api/iap/notifications" m={n}>
          <dl className="dl">
            <dt>Recebidas (30 dias)</dt><dd>{int(n.v.recebidas_30d)}</dd>
            <dt>Aplicadas</dt><dd>{int(n.v.aplicadas)}</dd>
            <dt>Sem dono</dt><dd>{int(n.v.sem_dono)}</dd>
            <dt>Último recebimento</dt><dd>{n.v.ultima}</dd>
          </dl>
        </Cartao>
      </div>
    </>
  );
}
