import type { Metadata } from "next";
import { FormConvite } from "@/components/Convites";
import { CabecalhoIg } from "@/components/Instagram";
import { Tabela } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth/servidor";
import { comBase } from "@/lib/base";
import { dataBR, podeEstender, situacao } from "@/lib/convites/regras";
import { repositorioConvites, type ConviteListado } from "@/lib/convites/servidor";

export const metadata: Metadata = { title: "Convites — LaudoUSG Admin" };

type Busca = Promise<Record<string, string | string[] | undefined>>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const OK: Record<string, string> = { estendida: "Prazo estendido em 30 dias.", revogada: "Cortesia revogada: o Pro sai na próxima abertura do app." };
const ERRO: Record<string, string> = {
  pedido: "Pedido inválido.",
  nao_encontrado: "Cortesia não encontrada.",
  revogada: "Essa cortesia já estava revogada.",
  sem_prazo: "Essa cortesia não tem prazo: não há o que estender.",
  dias: "Dias entre 1 e 365.",
  falha: "O banco não respondeu. Tente de novo.",
};

export default async function Convites({ searchParams }: { searchParams: Busca }) {
  const { cfg } = await exigirAdmin();
  const q = await searchParams;
  let lista: ConviteListado[] | null = null;
  try {
    lista = await repositorioConvites(cfg).listar();
  } catch {
    lista = null;
  }
  const agora = Date.now();
  const ok = OK[um(q.ok)];
  const erro = ERRO[um(q.erro)];

  return (
    <>
      <CabecalhoIg titulo="Convites">
        Crie a conta de um médico convidado com o Pro liberado por um prazo. O sistema gera uma senha provisória e o texto do convite; você mesmo envia. No fim do prazo a conta volta ao gratuito e o app oferece a assinatura normal. Nada é cobrado.
      </CabecalhoIg>
      {ok ? <div className="callout" role="status">{ok}</div> : null}
      {erro ? <div className="callout warn" role="alert"><b>{erro}</b></div> : null}
      <FormConvite />
      <section className="card">
        <div className="card-body">
          <div className="card-head"><h3>Convites e cortesias</h3></div>
          {!lista ? (
            <div className="callout warn"><b>Tabela de cortesias indisponível.</b> A migração <code>cortesias</code> ainda não foi aplicada ou o Supabase não respondeu.</div>
          ) : lista.length === 0 ? (
            <p>Nenhum convite ainda.</p>
          ) : (
            <Tabela
              cab={["Nome", "E-mail", "Início", "Fim", "Situação", ""]}
              linhas={lista.map((c) => {
                const s = situacao(c, agora, c.assinou);
                return [
                  c.nome ?? "—",
                  c.email ?? "—",
                  dataBR(c.inicio),
                  c.fim ? dataBR(c.fim) : "sem prazo",
                  <span key="s" className={`tag ${s.classe}`}>{s.rotulo}</span>,
                  <div key="a" className="convite-linha-acoes">
                    {podeEstender(c) ? (
                      <form method="post" action={comBase("/api/convites/estender")}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="dias" value="30" />
                        <button type="submit" className="botao sec">+30 dias</button>
                      </form>
                    ) : null}
                    {!c.revogada_em ? (
                      <form method="post" action={comBase("/api/convites/revogar")}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="botao sec">Revogar</button>
                      </form>
                    ) : null}
                  </div>,
                ];
              })}
            />
          )}
        </div>
      </section>
    </>
  );
}
