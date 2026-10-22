/** Regras do editor — puras e testáveis; a migração repete as mesmas checagens no banco. */
import { instanteNoFuso } from "./datas";
import { DIMENSOES, LIMITES, type Formato, type LinhaItem, type LinhaPost } from "./tipos";

/** Caracteres como o Instagram conta (pontos de código, não UTF-16). */
const tamanho = (s: string) => [...s].length;

/** Legenda publicada = legenda + linha em branco + hashtags. */
export const legendaFinal = (caption: string, hashtags: string) => (hashtags ? `${caption}\n\n${hashtags}` : caption);
export const tamanhoLegenda = (caption: string, hashtags: string) => tamanho(legendaFinal(caption, hashtags));
export const contarHashtags = (s: string) => (s.match(/(^|\s)#[^\s#]+/g) ?? []).length;

export type MotivoBloqueio = "status" | "sem_imagem" | "slides" | "passado";

export const MENSAGEM_BLOQUEIO: Record<MotivoBloqueio, string> = {
  status: "Só um rascunho pode ser aprovado.",
  sem_imagem: "Falta imagem em pelo menos um slide (stories manuais também precisam da arte).",
  slides: "Quantidade de slides não combina com o formato (foto e story: 1; carrossel: 2 ou mais).",
  passado: "O horário já passou. Ajuste a data antes de aprovar.",
};

/** null = pode aprovar. Igual a public.social_set_status. */
export function motivoBloqueioAprovacao(post: Pick<LinhaPost, "status" | "format" | "scheduled_at">, itens: Pick<LinhaItem, "storage_path">[], agora = new Date()): MotivoBloqueio | null {
  if (post.status !== "draft") return "status";
  if (itens.length === 0 || itens.some((i) => !i.storage_path)) return "sem_imagem";
  if (post.format === "carousel" ? itens.length < 2 : itens.length !== 1) return "slides";
  if (Date.parse(post.scheduled_at) <= agora.getTime()) return "passado";
  return null;
}

/** Lê largura × altura de um JPEG (marcador SOF), sem decodificar a imagem. */
export function dimensoesJpeg(b: Uint8Array): { largura: number; altura: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null;
    const marca = b[i + 1]!;
    if (marca === 0xff) {
      i++;
      continue;
    }
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marca === 0xd9 || marca === 0xda) return null; // fim ou início dos dados sem SOF antes
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (len < 2) return null;
    const sof = marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc;
    if (sof) {
      if (i + 8 >= b.length) return null;
      return { altura: (b[i + 5]! << 8) | b[i + 6]!, largura: (b[i + 7]! << 8) | b[i + 8]! };
    }
    i += 2 + len;
  }
  return null;
}

export type ErroImagem = "vazio" | "grande" | "tipo" | "dimensao";
export const MENSAGEM_IMAGEM: Record<ErroImagem, string> = {
  vazio: "Escolha um arquivo.",
  grande: "A imagem passa de 8 MB.",
  tipo: "Só JPEG (.jpg).",
  dimensao: "Tamanho errado: feed em 1080×1350, story em 1080×1920.",
};

/** Tipo declarado E assinatura do arquivo precisam ser JPEG; tamanho exato por formato. */
export function validarImagem(bytes: Uint8Array, tipo: string, formato: Formato): { ok: true } | { ok: false; erro: ErroImagem } {
  if (bytes.length === 0) return { ok: false, erro: "vazio" };
  if (bytes.length > LIMITES.imagemBytes) return { ok: false, erro: "grande" };
  if (tipo !== "image/jpeg" || bytes[2] !== 0xff) return { ok: false, erro: "tipo" };
  const d = dimensoesJpeg(bytes);
  if (!d) return { ok: false, erro: "tipo" };
  const alvo = DIMENSOES[formato];
  if (d.largura !== alvo.largura || d.altura !== alvo.altura) return { ok: false, erro: "dimensao" };
  return { ok: true };
}

export interface Edicao {
  scheduled_at: string;
  caption: string;
  hashtags: string;
  alt_text: string;
  slide_alts: { position: number; alt_text: string }[];
}

/** Campos do formulário do editor → edição validada, ou o motivo do erro. */
export function lerEdicao(form: { get(nome: string): unknown }, posicoes: number[]): { ok: true; edicao: Edicao } | { ok: false; erro: string } {
  const s = (n: string) => {
    const v = form.get(n);
    return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
  };
  const quando = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(s("quando"));
  let scheduled_at: string;
  try {
    if (!quando) throw new Error("sem data");
    scheduled_at = instanteNoFuso(quando[1]!, quando[2]!);
  } catch {
    return { ok: false, erro: "data" };
  }
  const caption = s("legenda");
  const hashtags = s("hashtags").replace(/\s+/g, " ");
  const alt_text = s("alt");
  if (tamanhoLegenda(caption, hashtags) > LIMITES.legenda) return { ok: false, erro: "legenda" };
  if (contarHashtags(hashtags) > LIMITES.hashtags) return { ok: false, erro: "hashtags" };
  const slide_alts = posicoes.map((position) => ({ position, alt_text: s(`alt_${position}`) }));
  if ([alt_text, ...slide_alts.map((a) => a.alt_text)].some((a) => tamanho(a) > LIMITES.alt)) return { ok: false, erro: "alt" };
  return { ok: true, edicao: { scheduled_at, caption, hashtags, alt_text, slide_alts } };
}
