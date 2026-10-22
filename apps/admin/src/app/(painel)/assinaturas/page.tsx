import { GraficoBarras } from "@/components/GraficoBarras";
import { Barras, Cabecalho, Cartao, Kpi, Secao } from "@/components/ui";
import { brl, int, pct, PER, rot } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

export default async function Assinaturas({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  const AS = d.assinaturas;
  const pr = AS.produto.v, at = AS.estado_atual.v, k = AS.kpis.v, ev = AS.eventos_dia.v;
  const planos = Object.entries(AS.plano_gravado.v).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Cabecalho titulo="Assinaturas">
        Estado atual vem de <code>public.subscriptions</code> (real). O histórico (teste → pago → cancelou) só passa a existir com a tabela <code>iap_notifications</code>; até lá, a parte de baixo é o desenho, com números fictícios.
      </Cabecalho>
      <div className="grid g-3">
        <Cartao titulo="Produto à venda" m={AS.produto}>
          <dl className="dl">
            <dt>Nome</dt><dd>{pr.nome}</dd>
            <dt>Preço</dt><dd>{brl(pr.preco_brl)} / mês</dd>
            <dt>Teste grátis</dt><dd>{pr.teste_gratis_dias} dias</dd>
            <dt>ID</dt><dd className="mono">{pr.id}</dd>
          </dl>
        </Cartao>
        <Cartao titulo="Estado atual em produção" sub={`linhas de produção na tabela: ${int(at.producao.linhas)}`} m={AS.estado_atual}>
          <dl className="dl">
            <dt>Ativos pagos</dt><dd>{int(at.producao.ativos)}</dd>
            <dt>Em teste grátis</dt><dd>{int(at.producao.em_teste)}</dd>
            <dt>Período de carência</dt><dd>{int(at.producao.grace)}</dd>
            <dt>Expirados</dt><dd>{int(at.producao.expirados)}</dd>
            <dt>Reembolsados</dt><dd>{int(at.producao.reembolsados)}</dd>
          </dl>
          {at.sandbox.length ? (
            <div className="note">
              Sandbox: {at.sandbox.map((s) => `${int(s.n)} × ${s.product_id.split(".").slice(-2).join(".")} · ${rot(s.status)}${s.is_trial ? " · teste" : ""}`).join("; ")} (ambiente de teste da Apple, fora das contas).
            </div>
          ) : null}
        </Cartao>
        <Cartao titulo="Plano gravado no perfil" m={AS.plano_gravado}>
          <Barras itens={planos} />
        </Cartao>
      </div>
      <Cartao titulo="Conferência Apple × webhook" m={AS.conciliacao_apple ?? AS.kpis}>
        {AS.conciliacao_apple ? <>
          <p>Relatório Apple de {AS.conciliacao_apple.v.day}: {int(AS.conciliacao_apple.v.paid)} pagos, {int(AS.conciliacao_apple.v.trials)} em teste, {int(AS.conciliacao_apple.v.grace)} em carência e {int(AS.conciliacao_apple.v.billing_retry)} em nova tentativa de cobrança.</p>
          <p>Webhook agora: {int(at.producao.ativos)} pagos, {int(at.producao.em_teste)} em teste e {int(at.producao.grace)} em carência. Eventos no relatório do dia: {int(AS.conciliacao_apple.v.eventos)}.</p>
        </> : <p>Aguardando primeiro relatório de assinaturas da Apple. Os exemplos do histórico continuam identificados abaixo.</p>}
      </Cartao>
      <Secao>Histórico e funil de assinatura</Secao>
      <div className="grid g-6">
        <Kpi rotulo="Ativos pagos" valor={int(k.ativos_pagos)} meta={`MRR ${brl(k.ativos_pagos * pr.preco_brl)}`} m={AS.kpis} />
        <Kpi rotulo="Em teste grátis" valor={int(k.em_teste)} meta="termina em até 3 dias" m={AS.kpis} />
        <Kpi rotulo="Cancelando" valor={int(k.cancelando)} meta="renovação desligada, ainda ativos" m={AS.kpis} />
        <Kpi rotulo="Expirados" valor={int(k.expirados)} meta={PER[p]} m={AS.kpis} />
        <Kpi rotulo="Reembolsos" valor={int(k.reembolsos)} meta={PER[p]} m={AS.kpis} />
        <Kpi rotulo="Teste → pago" valor={pct(k.conversao_teste_pago_pct, 0)} meta="conversão" m={AS.kpis} />
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Eventos por dia" sub="30 dias" m={AS.eventos_dia}>
          <div className="chart-legend">
            <span><i style={{ background: "var(--chart-1-soft)" }} />Teste iniciado</span>
            <span><i style={{ background: "var(--chart-1)" }} />Virou pago</span>
            <span><i style={{ background: "var(--err)" }} />Cancelou renovação</span>
          </div>
          <GraficoBarras
            rotulos={d.meta.dias}
            periodo={p}
            fmt={int}
            series={[
              { nome: "Teste iniciado", dados: ev.testes, cor: "var(--chart-1-soft)" },
              { nome: "Virou pago", dados: ev.pagos, cor: "var(--chart-1)" },
              { nome: "Cancelou renovação", dados: ev.cancelamentos, cor: "var(--err)" },
            ]}
            exemplo={AS.eventos_dia.origem === "exemplo"}
          />
        </Cartao>
        <Cartao titulo="Linha do tempo por assinante" sub="pseudônimos; só o administrador vê" m={AS.linha_do_tempo}>
          <div className="timeline">
            {AS.linha_do_tempo.v.map((r) => (
              <div className="tl-row" key={r.quem}>
                <span className="who">{r.quem}</span>
                <div className="tl-steps">
                  {r.eventos.map(([dia, txt], i) => (
                    <span key={dia + txt} style={{ display: "contents" }}>
                      {i > 0 ? <span className="arrow">→</span> : null}
                      <span className="st"><b>{dia}</b>{txt}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="note">Contas da lista <code>BETA_TESTER_EMAILS</code> ganham “pro” sem assinatura: aparecem em separado, fora destas contas.</div>
        </Cartao>
      </div>
    </>
  );
}
