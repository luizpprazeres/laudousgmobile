import { GraficoBarras } from "@/components/GraficoBarras";
import { Barras, Cabecalho, Cartao, Kpi, Tabela, type Celula } from "@/components/ui";
import type { Metrica } from "@/lib/data/tipos";
import { int, nomeCategoria, PER, usd } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

function celula(v: number | undefined, m: Metrica<unknown>): Celula {
  return m.origem === "exemplo" ? { v: usd(v ?? 0, 2), ex: true, go: `aguardando GO: ${m.go}` } : usd(v ?? 0, 4);
}

export default async function Custos({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  const C = d.custos;
  const g = C.geracao_periodo.v[p];
  const outras = C.outras_rotas_por_usuario_30d, dg = C.deepgram_por_usuario_30d, fat = C.fatura_mes;
  const semPreco = C.por_modelo_30d.v.filter((m) => m.cost == null).map((m) => m.model);
  const nulos30 = C.geracao_periodo.v.d30.cost_null_rows;
  const tudoReal = outras.origem === "real" && dg.origem === "real";

  const linhas: Celula[][] = C.por_usuario_30d.v.map((u) => {
    const o = outras.v.find((x) => x.rotulo === u.rotulo);
    const q = dg.v.find((x) => x.rotulo === u.rotulo);
    const tot = u.cost + (o?.transcricao ?? 0) + (o?.consultor ?? 0) + (o?.visao ?? 0) + (o?.edicao ?? 0) + (q?.custo ?? 0);
    return [
      <b key="u">{u.rotulo}</b>,
      int(u.n),
      int(u.cats),
      usd(u.cost, 4),
      celula(o?.transcricao, outras),
      celula(q?.custo, dg),
      celula(o?.consultor, outras),
      celula(o?.visao, outras),
      celula(o?.edicao, outras),
      tudoReal ? usd(tot, 2) : { v: `${usd(tot, 2)}*`, ex: true, go: "inclui colunas fictícias" },
      usd(u.n ? u.cost / u.n : null, 4),
    ];
  });

  return (
    <>
      <Cabecalho titulo="Custos por usuário">
        Hoje só a <b>geração</b> (structurer + writer) tem custo gravado, em <code>generation_audit</code>, e é <b>estimado</b> com preço fixo no código. Transcrição, Deepgram, Consultor, visão e edição entram com a tabela <code>ai_usage_events</code>.
      </Cabecalho>
      <div className="grid g-4">
        <Kpi rotulo="Custo de geração" valor={usd(g.cost_usd, 2)} meta={`${PER[p]} · ${int(g.rows)} laudos`} m={C.geracao_periodo} />
        <Kpi rotulo="Custo por laudo" valor={usd(g.custo_por_laudo, 4)} meta="média dos laudos com preço" m={C.geracao_periodo} />
        <Kpi
          rotulo="Tokens (entrada / saída)"
          valor={`${(g.tin / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M / ${(g.tout / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`}
          meta={PER[p]}
          m={C.geracao_periodo}
        />
        <Kpi
          rotulo="Fatura real do mês"
          valor={usd(fat.v.openai + fat.v.anthropic + fat.v.deepgram, 2)}
          meta={`OpenAI ${usd(fat.v.openai, 2)} · Anthropic ${usd(fat.v.anthropic, 2)} · Deepgram ${usd(fat.v.deepgram, 2)}`}
          m={fat}
        />
      </div>
      {nulos30 ? (
        <div className="callout warn" style={{ marginTop: 14 }}>
          <b>Subestimado:</b> {nulos30} laudos em 30 dias ficaram sem custo (modelos sem preço na tabela atual: {semPreco.join(", ") || "vários"}). A tabela de preços versionada (<code>ai_model_prices</code>, feat/admin-dados) corrige isso depois do G3.
        </div>
      ) : null}
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Custo de geração por dia" sub={`30 dias · ${usd(C.geracao_periodo.v.d30.cost_usd, 2)} no total`} m={C.geracao_dia}>
          <GraficoBarras rotulos={d.meta.dias} series={[{ nome: "Custo", dados: C.geracao_dia.v.serie }]} periodo={p} fmt={(v) => usd(v, 4)} fmtEixo={(v) => usd(v, 2)} alto />
        </Cartao>
        <Cartao titulo="Custo por categoria" sub="30 dias" m={C.por_categoria_30d}>
          <Barras itens={C.por_categoria_30d.v.slice(0, 9).map(([c, , v]) => [nomeCategoria(c, d.meta.categorias), v] as [string, number])} fmt={(v) => usd(v, 3)} />
        </Cartao>
      </div>
      <div style={{ marginTop: 14 }}>
        <Cartao titulo="Por usuário (30 dias)" sub="pseudônimos ordenados por laudos; colunas listradas são fictícias" m={C.por_usuario_30d}>
          <Tabela
            cab={["Usuário", "Laudos", "Categorias", "Geração", "Transcrição", "Deepgram", "Consultor", "Visão", "Edição", "Total", "Geração/laudo"]}
            numericas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            linhas={linhas}
          />
          <div className="note">
            <b>Geração</b> é real (estimada).{" "}
            {outras.origem === "exemplo" ? <>Transcrição, Consultor, visão e edição aguardam o <b>{outras.go}</b>. </> : null}
            {dg.origem === "exemplo" ? <>Deepgram aguarda o <b>{dg.go}</b>. </> : null}
            {tudoReal ? null : "* O total soma real com fictício."}
          </div>
        </Cartao>
      </div>
      <div style={{ marginTop: 14 }}>
        <Cartao titulo="Por modelo do writer (30 dias)" m={C.por_modelo_30d}>
          <Tabela
            cab={["Modelo", "Laudos", "Tokens entrada (média)", "Tokens saída (média)", "Custo total", "Custo médio", "Sem preço"]}
            numericas={[1, 2, 3, 4, 5, 6]}
            linhas={C.por_modelo_30d.v.map((m) => [
              <code key="m">{m.model}</code>,
              int(m.n),
              int(m.avg_in),
              int(m.avg_out),
              m.cost == null ? <span key="c" className="tag warn">nulo</span> : usd(m.cost, 4),
              m.avg_cost == null ? "—" : usd(m.avg_cost, 4),
              m.null_cost ? <span key="n" className="tag warn">{m.null_cost}</span> : "0",
            ])}
          />
        </Cartao>
      </div>
    </>
  );
}
