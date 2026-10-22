/** Peças da seção Instagram (sem JavaScript no navegador). */
import Link from "next/link";
import type { ReactNode } from "react";
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
  aprovado: "Post aprovado. Nada é publicado nesta fase.",
  rascunho: "Post voltou para rascunho.",
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
