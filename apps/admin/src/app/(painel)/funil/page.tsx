import { Barras, Cabecalho, Cartao } from "@/components/ui";
import { noPeriodo } from "@/lib/data/agregar";
import { goCurto } from "@/lib/data/exemplo";
import type { Metrica } from "@/lib/data/tipos";
import { int, pct, PER } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

export default async function Funil({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  const A = d.aquisicao, AS = d.assinaturas;
  const passos: { n: string; d: string; v: number; m: Metrica<unknown> }[] = [
    { n: "Visitas na landing", d: "contador próprio (sem cookie)", v: A.visitas_landing.v[p], m: A.visitas_landing },
    { n: "Clique em “Baixar” ou QR", d: "contador próprio", v: A.cliques_loja.v[p], m: A.cliques_loja },
    { n: "Visitas na página da loja", d: "Apple Analytics · limiar de 5", v: A.visitas_pagina_loja.v[p], m: A.visitas_pagina_loja },
    { n: "Instalações", d: "Apple salesReports · até ontem", v: A.instalacoes.v[p], m: A.instalacoes },
    { n: "Conta criada", d: "profiles (iOS + web juntos)", v: A.contas_novas.v[p], m: A.contas_novas },
    { n: "1º laudo gerado", d: "contas novas que já geraram", v: A.primeiro_laudo_novos.v[p], m: A.primeiro_laudo_novos },
    { n: "Teste grátis iniciado", d: "iap_notifications / SUBSCRIPTION_EVENT", v: noPeriodo(AS.eventos_dia.v.testes, p), m: AS.eventos_dia },
    { n: "Assinante pago", d: "iap_notifications", v: noPeriodo(AS.eventos_dia.v.pagos, p), m: AS.eventos_dia },
    { n: "Cancelou a renovação", d: "iap_notifications", v: noPeriodo(AS.eventos_dia.v.cancelamentos, p), m: AS.eventos_dia },
  ];
  const max = Math.max(1, ...passos.map((s) => s.v));
  const cta = A.cliques_por_cta.v;
  const orig = A.origem_instalacoes.v.origens.map(([n, f]) => [n, Math.round(f * A.instalacoes.v.d30)] as [string, number]);

  return (
    <>
      <Cabecalho titulo="Funil">
        Da visita na landing até a assinatura, <b>{PER[p]}</b>. Os passos com selo “Real” têm fonte hoje; o resto mostra o desenho com números de exemplo.
      </Cabecalho>
      <div className="callout warn">
        <b>Leitura honesta:</b> os passos reais (conta criada, 1º laudo) ainda não separam iOS de web. As taxas entre um passo fictício e um real aparecem só para mostrar o lugar; não valem como conversão.
      </div>
      <Cartao titulo="Funil do período" sub={PER[p]}>
        <div className="funnel">
          {passos.map((s, i) => {
            const ex = s.m.origem === "exemplo";
            const ant = passos[i - 1];
            const conv = ant && i < 8 ? (
              <div className="f-conv">
                ↓ {ant.v ? pct((s.v / ant.v) * 100, 0) : "—"} do passo anterior
                {ant.m.origem !== s.m.origem ? <> · <span className="mix">mistura real com fictício: não interpretar</span></> : ex ? " · fictício" : ""}
              </div>
            ) : null;
            return (
              <div key={s.n}>
                {conv}
                <div className={`f-step${ex ? " ex" : ""}`} title={s.m.origem === "exemplo" ? `Dado fictício — aguardando GO: ${s.m.go}` : `Fonte: ${s.m.fonte}`}>
                  <span className="idx">{i + 1}</span>
                  <span className="nm">{s.n}<small>{s.d}</small></span>
                  <span className="track"><span className="fill" style={{ width: `${Math.max(0.6, (s.v / max) * 100)}%`, display: "block" }} /></span>
                  <span className="val">{int(s.v)}</span>
                  <span className="src">{s.m.origem === "exemplo" ? <span className="tag exm">Fictício · {goCurto(s.m.go)}</span> : <span className="tag real">Real</span>}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Cartao>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Cliques por botão (CTA)" sub={PER[p]} m={A.cliques_por_cta}>
          <Barras itens={cta.ctas.map((n, i) => [n, cta[p][i] ?? 0] as [string, number])} />
        </Cartao>
        <Cartao titulo="Origem das instalações" sub="30 dias · linhas com menos de 5 aparecem como “—” na Apple" m={A.origem_instalacoes}>
          <Barras itens={orig} />
        </Cartao>
      </div>
    </>
  );
}
