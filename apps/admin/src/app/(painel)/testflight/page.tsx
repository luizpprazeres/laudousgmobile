import { GraficoBarras } from "@/components/GraficoBarras";
import { Cabecalho, Cartao, Kpi, Tabela } from "@/components/ui";
import { real } from "@/lib/data/tipos";
import { dataHora, dataHoraCurta, diaCurto, int, PER_CURTO, rot } from "@/lib/formato";
import { prepararPagina, type BuscaPagina } from "@/lib/pagina";

export default async function Testflight({ searchParams }: { searchParams: BuscaPagina }) {
  const { p, d } = await prepararPagina(searchParams);
  if (!d.testflight.ok) {
    return (
      <>
        <Cabecalho titulo="TestFlight">Testadores, grupos e builds lidos ao vivo no App Store Connect.</Cabecalho>
        <div className="callout warn"><b>App Store Connect indisponível:</b> {d.testflight.motivo}</div>
      </>
    );
  }
  const T = d.testflight.dados;
  const pp = p === "today" ? "d7" : p;
  const uso = T.uso[pp];
  const v = T.versoes_loja[0];
  const m = (fonte: string) => real(fonte, null);
  const instalados = T.testadores.filter((t) => t.estado === "INSTALLED").length;
  const statusChamadas = Array.from(new Set(T.chamadas.map((c) => c.status))).join("/");
  const bs = [...T.builds].reverse();

  return (
    <>
      <Cabecalho titulo="TestFlight">
        Testadores, grupos e builds lidos ao vivo no App Store Connect (chave App Manager, só leitura; cache de 10 min, lido em {dataHora(T.coletado_em)}). Nomes aparecem como iniciais; e-mail não chega à tela.
        {p === "today" ? <b> A Apple não dá “hoje”: mostrando 7 dias.</b> : null}
      </Cabecalho>
      <div className="grid g-6">
        <Kpi rotulo="Versão na loja" valor={v?.versao ?? "—"} meta={rot(v?.estado)} m={m("ASC /v1/apps/{id}/appStoreVersions")} />
        <Kpi rotulo="Testadores" valor={int(T.testadores.length)} meta={`${int(instalados)} com o app instalado`} m={m("ASC /v1/betaTesters")} />
        <Kpi rotulo="Sessões" valor={int(uso.sessoes)} meta={PER_CURTO[pp]} m={m("ASC betaTesterUsages")} />
        <Kpi rotulo="Crashes" valor={int(uso.crashes)} meta={PER_CURTO[pp]} m={m("ASC betaTesterUsages")} />
        <Kpi rotulo="Build mais recente" valor={T.builds[0]?.build ?? "—"} meta={T.builds[0] ? `enviado ${dataHoraCurta(T.builds[0].enviado)}` : ""} m={m("ASC /v1/builds")} />
        <Kpi rotulo="Feedbacks" valor={int((T.feedback.crash ?? 0) + (T.feedback.screenshot ?? 0))} meta="crash + captura de tela" m={m("ASC betaFeedback*Submissions")} />
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Grupos" m={m("ASC /v1/apps/{id}/betaGroups")}>
          <Tabela
            cab={["Grupo", "Tipo", "Link público", "Testadores", "Criado em"]}
            numericas={[3]}
            linhas={T.grupos.map((g) => [g.nome, g.interno ? "Interno" : "Externo", g.link_publico ? "Ligado" : "Desligado", int(g.testadores), g.criado ? `${diaCurto(g.criado)}/${g.criado.slice(0, 4)}` : "—"])}
          />
        </Cartao>
        <Cartao titulo="Testadores" sub="uso nos últimos 30 dias" m={m("ASC /v1/betaTesters + betaTesterUsages (P30D) — nomes em iniciais")}>
          <Tabela
            cab={["Testador", "Grupo", "Convite", "Estado", "Sessões", "Crashes", "Feedbacks"]}
            numericas={[4, 5, 6]}
            linhas={T.testadores.map((t) => [<b key="i">{t.iniciais}</b>, t.grupos.join(", "), rot(t.convite), <span key="e" className="tag ok">{rot(t.estado)}</span>, int(t.sessoes_30d), int(t.crashes_30d), int(t.feedbacks_30d)])}
          />
        </Cartao>
      </div>
      <div className="grid g-2" style={{ marginTop: 14 }}>
        <Cartao titulo="Sessões por build" sub="builds mais recentes (desde o envio)" m={m("ASC /v1/builds + betaBuildUsages")}>
          <GraficoBarras rotulos={bs.map((b) => `build ${b.build}`)} series={[{ nome: "Sessões", dados: bs.map((b) => b.sessoes) }]} fmt={int} />
        </Cartao>
        <Cartao titulo="Builds recentes" m={m("ASC /v1/builds + betaBuildUsages")} extra={`${T.chamadas.length} chamadas GET ao ASC, status ${statusChamadas}`}>
          <Tabela
            cab={["Build", "Versão", "Enviado", "Estado", "Instal.", "Sessões", "Crashes"]}
            numericas={[4, 5, 6]}
            linhas={T.builds.map((b) => [<b key="b">{b.build}</b>, b.versao ?? "—", dataHoraCurta(b.enviado), rot(b.estado) + (b.expirado ? " · expirado" : ""), int(b.instalacoes), int(b.sessoes), int(b.crashes)])}
          />
        </Cartao>
      </div>
    </>
  );
}
