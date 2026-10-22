/** Peças da seção Instagram (sem JavaScript no navegador). */
import Link from "next/link";
import type { ReactNode } from "react";
import { comBase } from "@/lib/base";
import { dataHora } from "@/lib/formato";
import type { ContaPublica } from "@/lib/social/conta";
import { noFuso } from "@/lib/social/datas";
import { seloPost } from "@/lib/social/politica";
import { MENSAGEM_BLOQUEIO, MENSAGEM_IMAGEM } from "@/lib/social/regras";
import { avisoToken } from "@/lib/social/token";
import { ROTULO_FORMATO, ROTULO_STATUS, type LinhaItem, type LinhaPost, type StatusPost } from "@/lib/social/tipos";

const CLASSE_STATUS: Record<StatusPost, string> = { draft: "neutral", approved: "real", publishing: "warn", published: "ok", failed: "err" };

export const SeloStatus = ({ status }: { status: StatusPost }) => <span className={`tag ${CLASSE_STATUS[status]}`}>{ROTULO_STATUS[status]}</span>;
/** Selo do calendário (F3): Agendado, Atrasado, Manual, Publicando, Publicado, Falhou. */
export function SeloPost({ post, agora }: { post: Parameters<typeof seloPost>[0]; agora: number }) {
  const s = seloPost(post, agora);
  return <span className={`tag ${s.classe}`} title={s.dica}>{s.rotulo}</span>;
}
export const SeloManual = () => <span className="tag exm" title="Sticker interativo: você publica pelo app do Instagram na hora marcada">Manual</span>;

/** Mensagens dos redirects das rotas (?ok= / ?erro=). */
export const MENSAGEM_OK: Record<string, string> = {
  salvo: "Alterações salvas.",
  ordem: "Ordem dos slides atualizada.",
  imagem: "Imagem enviada.",
  aprovado: "Post aprovado. O envio automático publica no horário marcado (stories manuais você publica pelo app).",
  rascunho: "Post voltou para rascunho.",
  conectado: "Conta do Instagram conectada.",
  desconectado: "Conta do Instagram desconectada.",
  publicado: "Publicado no Instagram.",
  destravado: "O post voltou para aprovado. O envio automático tenta de novo se o horário ainda estiver na janela de 6 h.",
  marcado: "Marcado como publicado.",
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
  pub_status: "Só um post aprovado e não manual pode ser publicado (ou ele já está sendo publicado).",
  pub_limite: "O Instagram atingiu o limite de publicações em 24 h. O post continua aprovado; tente mais tarde.",
  link: "O link precisa ser https://www.instagram.com/… (ou deixe em branco).",
  destravar: "Não deu para voltar para aprovado: o post não está parado há 10 min, ou o media_publish já foi pedido (confira no Instagram e use “Marcar como publicado” ou volte para rascunho pelo banco).",
  destravar_publicado: "Não deu para marcar como publicado: o post não está mais parado em “Publicando”.",
  manual_status: "Só um post manual aprovado pode ser marcado como publicado.",
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

export function ChipPost({ post, itens, agora = Date.now() }: { post: LinhaPost; itens: LinhaItem[]; agora?: number }) {
  const com = itens.filter((i) => i.storage_path).length;
  const selo = seloPost(post, agora);
  return (
    <div className={`ig-chip st-${post.status}${selo.rotulo === "Atrasado" ? " st-atrasado" : ""}`}>
      <Link href={`/instagram/${post.id}`} className="ig-chip-link" title={`${ROTULO_FORMATO[post.format]} · ${tituloPost(post, itens)}${selo.dica ? ` · ${selo.dica}` : ""}`}>
        <span className="ig-chip-top">
          <b>{noFuso(post.scheduled_at).hora}</b>
          <span className="ig-chip-fmt">{ROTULO_FORMATO[post.format]}</span>
          {post.manual && post.status !== "approved" ? <SeloManual /> : null}
        </span>
        <span className="ig-chip-tit">{tituloPost(post, itens)}</span>
        <span className="ig-chip-pe">
          <span className={`tag ${selo.classe}`}>{selo.rotulo}</span>
          {post.status === "draft" ? <span className={com === itens.length && itens.length ? "ig-ok" : "ig-falta"}>{com}/{itens.length} img</span> : null}
        </span>
        {post.status === "failed" && post.last_error ? <span className="ig-chip-erro">{post.last_error}</span> : null}
        {post.status === "approved" && !post.manual && post.attempts > 0 ? <span className="ig-chip-erro">Tentativa {post.attempts}/3 falhou</span> : null}
      </Link>
      {post.status === "published" && post.permalink ? (
        <a className="ig-chip-ver" href={post.permalink} target="_blank" rel="noreferrer noopener">Ver no Instagram ↗</a>
      ) : null}
    </div>
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
  const av = avisoToken(conta, agora);
  const vencido = av.vencido;
  return (
    <section className="card ig-conta-card">
      <div className="card-body">
        <div className="card-head">
          <div>
            <h3>Conta do Instagram</h3>
            <div className="sub">Instagram API com login do Instagram. O token fica cifrado no banco e é renovado todo dia às 6h (São Paulo) quando faltam menos de 15 dias para vencer.</div>
          </div>
        </div>
        {!disponivel ? (
          <p className="ig-conta-linha"><b>Conexão indisponível.</b> Falta configurar o app do Instagram ou a chave de cifra no servidor.</p>
        ) : conta === undefined ? (
          <p className="ig-conta-linha"><b>Conta indisponível.</b> O Supabase não respondeu.</p>
        ) : conta ? (
          <>
          {av.venceLogo || av.falhou ? (
            <div className="callout warn ig-token-aviso" role="alert">
              {av.venceLogo ? <p><b>O token vence em {av.diasRestantes} {av.diasRestantes === 1 ? "dia" : "dias"}</b> ({dataHora(conta.token_expires_at!)}). Sem token válido nada é publicado. Se a renovação automática não resolver até lá, reconecte a conta.</p> : null}
              {av.falhou ? <p><b>A última renovação automática falhou</b>{conta.token_refresh_failed_at ? <> em {dataHora(conta.token_refresh_failed_at)}</> : null}{conta.token_refresh_error ? <>: {conta.token_refresh_error}</> : "."} O token anterior continua salvo. Ela é tentada de novo amanhã; reconectar resolve na hora.</p> : null}
            </div>
          ) : null}
          <div className="ig-conta-linha">
            <span>
              Conectada: <b>@{conta.username || conta.ig_user_id}</b> · {conta.token_expires_at ? <>token {vencido ? "venceu em" : "válido até"} <b>{dataHora(conta.token_expires_at)}</b></> : "validade do token desconhecida"}
              {vencido ? <> · <span className="tag err">Vencido</span></> : null}
              {conta.token_refreshed_at ? <> · renovado em {dataHora(conta.token_refreshed_at)}</> : null}
            </span>
            <a className="botao sec" href={comBase("/api/social/conectar")}>Reconectar</a>
            <form method="post" action={comBase("/api/social/desconectar")}>
              <button type="submit" className="botao sec">Desconectar</button>
            </form>
          </div>
          </>
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

/** Faixa do topo: stories manuais aprovados cujo horário chegou (janela de 2 h). */
export function FaixaManual({ posts, itens }: { posts: LinhaPost[]; itens: LinhaItem[] }) {
  if (!posts.length) return null;
  return (
    <section className="card ig-faixa-manual" aria-labelledby="ig-manual-titulo">
      <div className="card-body">
        <div className="card-head">
          <div>
            <h3 id="ig-manual-titulo">Para publicar à mão agora</h3>
            <div className="sub">Stories com sticker interativo não passam pela API. Baixe a arte, publique pelo app do Instagram com o sticker sugerido e marque aqui.</div>
          </div>
        </div>
        <ul className="ig-manual-lista">
          {posts.map((p) => {
            const img = itens.find((i) => i.post_id === p.id && i.public_url);
            return (
              <li key={p.id} className="ig-manual-item">
                {img?.public_url ? (
                  <a className="ig-manual-img" href={img.public_url} target="_blank" rel="noreferrer noopener" download>
                    <img src={img.public_url} alt={img.alt_text || p.alt_text || "Arte do story"} />
                  </a>
                ) : <div className="ig-manual-img ig-sem-img"><span>Sem imagem</span></div>}
                <div className="ig-manual-txt">
                  <Link href={`/instagram/${p.id}`}><b>{tituloPost(p, itens.filter((i) => i.post_id === p.id))}</b></Link>
                  <span className="ig-conta">{dataHora(p.scheduled_at)} · <code>{p.id}</code></span>
                  {p.interaction ? (
                    <span>Sticker: <b>{p.interaction.tipo}</b>{p.interaction.opcoes.length ? <> ({p.interaction.opcoes.join(" · ")})</> : null}</span>
                  ) : <span>Sem sticker sugerido no calendário.</span>}
                  {img?.public_url ? <a href={img.public_url} target="_blank" rel="noreferrer noopener" download>Baixar a imagem</a> : null}
                </div>
                <form method="post" action={comBase("/api/social/manual")}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="voltar" value="calendario" />
                  <button type="submit" className="botao">Marcar como publicado</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
