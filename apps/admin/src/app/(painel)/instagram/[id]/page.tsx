import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, CabecalhoIg, SeloManual, SeloStatus, tituloPost } from "@/components/Instagram";
import { exigirAdmin } from "@/lib/auth/servidor";
import { comBase } from "@/lib/base";
import { dataHora } from "@/lib/formato";
import { noFuso } from "@/lib/social/datas";
import { contarHashtags, legendaFinal, MENSAGEM_BLOQUEIO, motivoBloqueioAprovacao, tamanhoLegenda } from "@/lib/social/regras";
import { lerPost } from "@/lib/social/servidor";
import { DIMENSOES, ID_POST, LIMITES, ROTULO_FORMATO, type LinhaItem, type LinhaPost } from "@/lib/social/tipos";

export const metadata: Metadata = { title: "Post — Instagram — LaudoUSG Admin" };

type Params = Promise<{ id: string }>;
type Busca = Promise<Record<string, string | string[] | undefined>>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const FORM = "form-post";

function Previa({ post, itens }: { post: LinhaPost; itens: LinhaItem[] }) {
  const story = post.format === "story";
  return (
    <div className={`ig-previa${story ? " story" : ""}`}>
      <div className="ig-previa-topo"><span className="brand-mark" aria-hidden="true">L</span><b>laudousg</b></div>
      <div className="ig-previa-midia">
        {itens.map((i) => (
          <figure key={i.position} className="ig-previa-slide">
            {i.public_url ? <img src={i.public_url} alt={i.alt_text || post.alt_text} /> : <div className="ig-sem-img"><span>{i.slide_text || "Sem imagem"}</span></div>}
            {itens.length > 1 ? <figcaption>{i.position}/{itens.length}</figcaption> : null}
          </figure>
        ))}
      </div>
      {story ? (
        post.interaction ? <div className="ig-previa-legenda"><b>Sticker ({post.interaction.tipo}):</b> {post.interaction.opcoes.join(" · ") || "sem opções"}</div> : null
      ) : (
        <div className="ig-previa-legenda"><b>laudousg</b> {legendaFinal(post.caption, post.hashtags)}</div>
      )}
    </div>
  );
}

export default async function EditorPost({ params, searchParams }: { params: Params; searchParams: Busca }) {
  const { cfg } = await exigirAdmin();
  const { id } = await params;
  if (!ID_POST.test(id)) notFound();
  const r = await lerPost(cfg, id).catch(() => null);
  if (!r) notFound();
  const { post, itens } = r;
  const q = await searchParams;
  const rascunho = post.status === "draft";
  const { data, hora } = noFuso(post.scheduled_at);
  const bloqueio = motivoBloqueioAprovacao(post, itens);
  const dim = DIMENSOES[post.format];
  const feed = post.format !== "story";

  return (
    <>
      <p className="ig-voltar"><Link href={`/instagram?v=semana&d=${data}`}>← Calendário</Link></p>
      <CabecalhoIg titulo={tituloPost(post, itens)}>
        <span className="ig-meta">
          <code>{post.id}</code> · {ROTULO_FORMATO[post.format]} · {dataHora(post.scheduled_at)} <SeloStatus status={post.status} /> {post.manual ? <SeloManual /> : null}
          {post.pillar ? <> · {post.pillar}</> : null}
          {post.angle ? <> · ângulo {post.angle}</> : null}
        </span>
      </CabecalhoIg>

      <Aviso ok={um(q.ok) || undefined} erro={um(q.erro) || undefined} />
      {post.manual ? (
        <div className="callout warn">
          <b>Publicação manual.</b> Stickers interativos não passam pela API: na hora marcada, publique pelo app do Instagram
          {post.interaction ? <> com o sticker <b>{post.interaction.tipo}</b>{post.interaction.opcoes.length ? <> ({post.interaction.opcoes.join(" · ")})</> : null}</> : null}. A arte ainda precisa estar aqui.
        </div>
      ) : null}
      {post.notes.length ? (
        <div className="callout warn"><b>Verificar antes de aprovar:</b><ul className="ig-lista">{post.notes.map((n) => <li key={n}>{n}</li>)}</ul></div>
      ) : null}
      {post.status === "failed" && post.last_error ? <div className="callout warn"><b>Última falha:</b> {post.last_error}</div> : null}
      {post.permalink ? <div className="callout">Publicado: <a href={post.permalink} rel="noreferrer noopener" target="_blank">{post.permalink}</a></div> : null}

      <div className="grid g-2">
        <section className="card">
          <div className="card-body">
            <div className="card-head"><div><h3>Conteúdo</h3><div className="sub">{rascunho ? "Só rascunhos podem ser editados." : "Volte para rascunho para editar."}</div></div></div>
            <form id={FORM} method="post" action={comBase("/api/social/salvar")}>
              <fieldset className="ig-campos" disabled={!rascunho}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="posicoes" value={itens.map((i) => i.position).join(",")} />
                <label className="campo">Data e hora (São Paulo)<input type="datetime-local" name="quando" defaultValue={`${data}T${hora}`} required /></label>
                {feed ? (
                  <>
                    <label className="campo">Legenda<textarea name="legenda" rows={9} defaultValue={post.caption} maxLength={LIMITES.legenda} /></label>
                    <label className="campo">Hashtags<input name="hashtags" defaultValue={post.hashtags} /></label>
                    <div className="ig-conta">{tamanhoLegenda(post.caption, post.hashtags)}/{LIMITES.legenda} caracteres · {contarHashtags(post.hashtags)}/{LIMITES.hashtags} hashtags (salvo)</div>
                    <label className="campo">Texto alternativo do post<textarea name="alt" rows={3} defaultValue={post.alt_text} maxLength={LIMITES.alt} /></label>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="legenda" value="" />
                    <input type="hidden" name="hashtags" value="" />
                    <label className="campo">Texto alternativo<textarea name="alt" rows={2} defaultValue={post.alt_text} maxLength={LIMITES.alt} /></label>
                  </>
                )}
                <button type="submit" className="botao">Salvar</button>
              </fieldset>
            </form>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <div className="card-head"><div><h3>Prévia</h3><div className="sub">Aproximação do que vai ao ar (salvo no banco).</div></div></div>
            <Previa post={post} itens={itens} />
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-body">
          <div className="card-head">
            <div><h3>Slides</h3><div className="sub">JPEG até 8 MB, exatamente {dim.largura}×{dim.altura}. A ordem aqui é a ordem do carrossel.</div></div>
          </div>
          <ol className="ig-slides">
            {itens.map((i, n) => (
              <li key={i.position} className="ig-slide">
                <div className="ig-thumb">{i.public_url ? <img src={i.public_url} alt={i.alt_text || `Slide ${i.position}`} /> : <span>Sem imagem</span>}</div>
                <div className="ig-slide-txt">
                  <b>Slide {i.position}</b>
                  {i.slide_text ? <p className="ig-pre">{i.slide_text}</p> : null}
                  {i.visual_brief ? <p className="ig-brief">{i.visual_brief}</p> : null}
                  {feed && itens.length > 1 ? (
                    <label className="campo">Alt deste slide<input form={FORM} name={`alt_${i.position}`} defaultValue={i.alt_text} maxLength={LIMITES.alt} disabled={!rascunho} /></label>
                  ) : (
                    <input type="hidden" form={FORM} name={`alt_${i.position}`} value={i.alt_text} />
                  )}
                </div>
                <div className="ig-slide-acoes">
                  {itens.length > 1 ? (
                    <form method="post" action={comBase("/api/social/ordem")} className="ig-ordem">
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="posicao" value={i.position} />
                      <button type="submit" name="direcao" value="cima" className="botao sec" disabled={!rascunho || n === 0} aria-label={`Subir slide ${i.position}`}>↑</button>
                      <button type="submit" name="direcao" value="baixo" className="botao sec" disabled={!rascunho || n === itens.length - 1} aria-label={`Descer slide ${i.position}`}>↓</button>
                    </form>
                  ) : null}
                  <form method="post" action={comBase("/api/social/midia")} encType="multipart/form-data" className="ig-upload">
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="posicao" value={i.position} />
                    <input type="file" name="arquivo" accept="image/jpeg" required disabled={!rascunho} aria-label={`Imagem do slide ${i.position}`} />
                    <button type="submit" className="botao sec" disabled={!rascunho}>{i.public_url ? "Trocar imagem" : "Enviar imagem"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-body ig-aprovar">
          {post.status === "draft" ? (
            <form method="post" action={comBase("/api/social/status")}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" name="para" value="approved" className="botao" disabled={!!bloqueio}>Aprovar</button>
            </form>
          ) : null}
          {post.status === "approved" || post.status === "failed" ? (
            <form method="post" action={comBase("/api/social/status")}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" name="para" value="draft" className="botao sec">Voltar para rascunho</button>
            </form>
          ) : null}
          <span className="ig-conta">
            {post.status === "draft" ? (bloqueio ? MENSAGEM_BLOQUEIO[bloqueio] : "Pronto para aprovar. Aprovar não publica nada nesta fase.") : `Status: ${post.status === "approved" ? "aprovado, aguardando a F2 (publicação)" : post.status}.`}
          </span>
        </div>
      </section>
    </>
  );
}
