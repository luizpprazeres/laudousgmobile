/** Peças da seção Instagram (sem JavaScript no navegador). */
import Link from "next/link";
import type { ReactNode } from "react";
import { comBase } from "@/lib/base";
import { dataHora } from "@/lib/formato";
import type { ContaPublica } from "@/lib/social/conta";
import { noFuso } from "@/lib/social/datas";
import { MENSAGEM_BLOQUEIO, MENSAGEM_IMAGEM } from "@/lib/social/regras";
import { ROTULO_FORMATO, ROTULO_STATUS, type LinhaItem, type LinhaPost, type StatusPost } from "@/lib/social/tipos";

const CLASSE_STATUS: Record<StatusPost, string> = { draft: "neutral", approved: "real", publishing: "warn", published: "ok", failed: "err" };

export const SeloStatus = ({ status }: { status: StatusPost }) => <span className={`tag ${CLASSE_STATUS[status]}`}>{ROTULO_STATUS[status]}</span>;
export const SeloManual = () => <span className="tag exm" title="Sticker interativo: você publica pelo app do Instagram na hora marcada">Manual</span>;

/** Mensagens dos redirects das rotas (?ok= / ?erro=). */
export const MENSAGEM_OK: Record<string, string> = {
  salvo: "Alterações salvas.",
  ordem: "Ordem dos slides atualizada.",
  imagem: "Imagem enviada.",
  aprovado: "Post aprovado. Ele só vai ao ar quando você usar “Publicar agora” (o envio automático chega na F3).",
  rascunho: "Post voltou para rascunho.",
  conectado: "Conta do Instagram conectada.",
  desconectado: "Conta do Instagram desconectada.",
  publicado: "Publicado no Instagram.",
};
export const MENSAGEM_ERRO: Record<string, string> = {
  ...MENSAGEM_BLOQUEIO,
  ...MENSAGEM_IMAGEM,
  data: "Data e hora inválidas.",
  legenda: "Legenda + hashtags passam de 2.200 caracteres.",
  hashtags: "O Instagram aceita até 30 hashtags.",
  alt: "Texto alternativo longo demais (até 1.000 caracteres).",
  nao_encontrado: "Post não encontrado.",
  status: "Só rascunhos podem ser editados (ou aprovados). Volte o post para rascunho primeiro.",
  slide: "Slide não encontrado.",
  limite: "Esse slide já está na ponta.",
  falha: "O banco ou o Storage não respondeu. Tente de novo.",
  arquivo: "Escolha o arquivo calendario-instagram.json.",
  arquivo_grande: "O arquivo do calendário passa de 1 MB.",
  json: "O arquivo não é um JSON válido.",
  calendario: "O calendário tem erros; nada foi importado.",
  banco: "A importação falhou no banco; nada foi gravado.",
  ig_negado: "A conexão foi cancelada no Instagram.",
  ig_erro: "O Instagram devolveu um erro na autorização. Tente conectar de novo.",
  state: "Pedido de conexão inválido (assinatura ou outro admin). Comece de novo pelo botão Conectar.",
  state_vencido: "O pedido de conexão venceu (10 minutos). Comece de novo pelo botão Conectar.",
  conexao: "O Instagram recusou a troca do código pelo token. Tente conectar de novo.",
  conta_banco: "O banco não gravou a alteração da conta. Tente de novo.",
  confirmacao: "Para publicar, digite exatamente o id do post no campo de confirmação.",
  pub_status: "Só um post aprovado, no formato foto, pode ser publicado (ou ele já está sendo publicado).",
  pub_sem_conta: "Nenhuma conta do Instagram conectada.",
  pub_token_vencido: "O token do Instagram venceu. Reconecte a conta.",
  pub_token_invalido: "Não foi possível abrir o token salvo (a chave mudou?). Reconecte a conta.",
  pub_falhou: "A publicação falhou; o motivo está no post. Volte para rascunho, corrija e aprove de novo.",
  pub_incerto: "Resultado incerto: o Instagram pode ter publicado. Confira no perfil antes de tentar de novo.",
  pub_registro: "Publicado no Instagram, mas o banco não registrou. O post ficou em “Publicando”; não tente de novo.",
};

export function Aviso({ ok, erro, msg }: { ok?: string; erro?: string; msg?: string }) {
  if (ok) return <div className="callout" role="status">{MENSAGEM_OK[ok] ?? "Feito."}</div>;
  if (erro) return <div className="callout warn" role="alert"><b>{MENSAGEM_ERRO[erro] ?? "Algo falhou."}</b>{msg ? <> {msg}</> : null}</div>;
  return null;
}

export const tituloPost = (p: Pick<LinhaPost, "title">, itens: Pick<LinhaItem, "slide_text">[]) => p.title || itens[0]?.slide_text.split("\n")[0] || "(sem título)";

export function ChipPost({ post, itens }: { post: LinhaPost; itens: LinhaItem[] }) {
  const com = itens.filter((i) => i.storage_path).length;
  return (
    <Link href={`/instagram/${post.id}`} className={`ig-chip st-${post.status}`} title={`${ROTULO_FORMATO[post.format]} · ${tituloPost(post, itens)}`}>
      <span className="ig-chip-top">
        <b>{noFuso(post.scheduled_at).hora}</b>
        <span className="ig-chip-fmt">{ROTULO_FORMATO[post.format]}</span>
        {post.manual ? <SeloManual /> : null}
      </span>
      <span className="ig-chip-tit">{tituloPost(post, itens)}</span>
      <span className="ig-chip-pe">
        <SeloStatus status={post.status} />
        <span className={com === itens.length && itens.length ? "ig-ok" : "ig-falta"}>{com}/{itens.length} img</span>
      </span>
    </Link>
  );
}

export function CabecalhoIg({ titulo, children, acoes }: { titulo: string; children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{titulo}</h1>
        <p>{children}</p>
      </div>
      {acoes}
    </div>
  );
}

const ETAPA: Record<string, string> = { token: "troca do código", token_longo: "token de longa duração", perfil: "leitura do perfil" };
export const rotuloEtapa = (e: string | undefined) => (e && ETAPA[e] ? ` (etapa: ${ETAPA[e]})` : "");

/** Estado da conexão. `conta`: undefined = tabela indisponível; null = nenhuma conta. */
export function CartaoConta({ disponivel, conta, agora = Date.now() }: { disponivel: boolean; conta: ContaPublica | null | undefined; agora?: number }) {
  const vencido = !!conta?.token_expires_at && Date.parse(conta.token_expires_at) <= agora;
  return (
    <section className="card ig-conta-card">
      <div className="card-body">
        <div className="card-head">
          <div>
            <h3>Conta do Instagram</h3>
            <div className="sub">Instagram API com login do Instagram. O token fica cifrado no banco e não renova sozinho nesta fase.</div>
          </div>
        </div>
        {!disponivel ? (
          <p className="ig-conta-linha"><b>Conexão indisponível.</b> Falta configurar o app do Instagram ou a chave de cifra no servidor.</p>
        ) : conta === undefined ? (
          <p className="ig-conta-linha"><b>Conta indisponível.</b> O Supabase não respondeu.</p>
        ) : conta ? (
          <div className="ig-conta-linha">
            <span>
              Conectada: <b>@{conta.username || conta.ig_user_id}</b> · {conta.token_expires_at ? <>token {vencido ? "venceu em" : "válido até"} <b>{dataHora(conta.token_expires_at)}</b></> : "validade do token desconhecida"}
              {vencido ? <> · <span className="tag err">Vencido</span></> : null}
            </span>
            <a className="botao sec" href={comBase("/api/social/conectar")}>Reconectar</a>
            <form method="post" action={comBase("/api/social/desconectar")}>
              <button type="submit" className="botao sec">Desconectar</button>
            </form>
          </div>
        ) : (
          <div className="ig-conta-linha">
            <span>Nenhuma conta conectada.</span>
            <a className="botao" href={comBase("/api/social/conectar")}>Conectar Instagram</a>
          </div>
        )}
      </div>
    </section>
  );
}
