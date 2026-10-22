/**
 * Quadro do Instagram — regras puras, usadas pelo servidor (página e rota de lote) e pelo navegador
 * (prévia do envio em lote, arrastar e soltar). Sem acesso a banco, rede ou Node.
 *  - quatro semanas (S1–S4) de segunda a domingo, a partir de uma segunda-feira;
 *  - mover para outro dia mantém a hora no fuso de São Paulo;
 *  - reordenação completa = permutação de 1..n (p[i] = posição atual do slide que vira o i-ésimo);
 *  - nome do arquivo `<id>-<slide>.jpg` define o destino do envio em lote.
 */
import { diaDaSemana, hojeNoFuso, instanteNoFuso, noFuso, somarDias, dataValida, horaValida } from "./datas";
import { seloPost, type Selo } from "./politica";
import { MENSAGEM_BLOQUEIO, motivoBloqueioAprovacao, type MotivoBloqueio } from "./regras";
import { DIMENSOES, FUSO, ID_POST, LIMITES, type Formato, type LinhaItem, type LinhaPost, type StatusPost } from "./tipos";

export const SEMANAS_QUADRO = 4;
/** Máximo de ids numa chamada de lote. */
export const LIMITE_LOTE_IDS = 100;
/**
 * Maior arquivo do envio em lote. A Vercel recusa corpo de função acima de ~4,5 MB antes do handler;
 * sobra folga para o envelope multipart. (A rota aceita até 8 MB, mas em produção o teto real é este.)
 */
export const LIMITE_ENVIO_BYTES = 4_400_000;

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const rotuloDia = (d: string) => `${DIAS[diaDaSemana(d)]} ${ddmm(d)}`;

// ---------- semanas ----------

/** Segunda-feira da semana de `data`. */
export const segundaDe = (data: string) => somarDias(data, -diaDaSemana(data));

/** Quatro semanas a partir da segunda de `ref`; intervalo [inicio, fim) em UTC. */
export function semanasQuadro(ref: string, fuso = FUSO): { semanas: string[][]; inicio: string; fim: string } {
  const primeira = segundaDe(ref);
  const semanas = Array.from({ length: SEMANAS_QUADRO }, (_, s) => Array.from({ length: 7 }, (_, d) => somarDias(primeira, s * 7 + d)));
  const ultimo = semanas[SEMANAS_QUADRO - 1]![6]!;
  return { semanas, inicio: instanteNoFuso(primeira, "00:00", fuso), fim: instanteNoFuso(somarDias(ultimo, 1), "00:00", fuso) };
}

// ---------- mover ----------

/**
 * Novo horário ao mover: o dia vira `data`; a hora fica a mesma (no fuso), a menos que `hora` venha.
 * Lança com data/hora inválida.
 */
export function moverPara(deIso: string, data: string, hora?: string | null, fuso = FUSO): string {
  if (Number.isNaN(Date.parse(deIso))) throw new Error("horário atual inválido");
  const h = hora || noFuso(deIso, fuso).hora;
  return instanteNoFuso(data, h, fuso);
}

export type ResultadoMover = "ok" | "status" | "passado" | "data" | "mudou" | "nao_encontrado" | "falha";

/** Checagem antes de chamar o banco (o banco repete status, horário atual e futuro). */
export function podeMover(p: Pick<LinhaPost, "status">, para: string, agora: number): Exclude<ResultadoMover, "mudou" | "nao_encontrado" | "falha"> {
  if (p.status !== "draft") return "status";
  const t = Date.parse(para);
  if (Number.isNaN(t)) return "data";
  if (t <= agora) return "passado";
  return "ok";
}

// ---------- reordenar ----------

/** p é permutação de 1..n? */
export function ordemValida(p: unknown, n: number): p is number[] {
  if (!Array.isArray(p) || p.length !== n || n < 1 || n > LIMITES.slides) return false;
  const vistos = new Set<number>();
  for (const x of p) {
    if (!Number.isInteger(x) || x < 1 || x > n || vistos.has(x)) return false;
    vistos.add(x);
  }
  return true;
}

/** Leva o slide da posição `de` para a posição `para` (1..n), deslocando os demais. Devolve a permutação. */
export function ordemArrastando(n: number, de: number, para: number): number[] {
  const p = Array.from({ length: n }, (_, i) => i + 1);
  if (de < 1 || de > n || para < 1 || para > n) return p;
  const [x] = p.splice(de - 1, 1);
  p.splice(para - 1, 0, x!);
  return p;
}

/** Aplica a permutação a uma lista (o i-ésimo novo = antigo p[i]). */
export const aplicarOrdem = <T>(lista: T[], p: number[]) => p.map((antiga) => lista[antiga - 1]!);

export const identidade = (p: number[]) => p.every((x, i) => x === i + 1);

// ---------- lote ----------

export type AcaoLote = "aprovar" | "rascunho";
export type ResultadoLote = "ok" | "status" | "sem_imagem" | "slides" | "passado" | "nao_encontrado" | "falha";

/** ids do pedido: 1 a 100, formato de id, sem repetição (ordem preservada). null = pedido inválido. */
export function idsDoLote(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > LIMITE_LOTE_IDS) return null;
  const vistos = new Set<string>();
  for (const id of v) {
    if (typeof id !== "string" || !ID_POST.test(id)) return null;
    vistos.add(id);
  }
  return [...vistos];
}

const MENSAGEM_COMUM: Record<string, string> = {
  nao_encontrado: "Post não encontrado (foi apagado ou o id mudou).",
  falha: "O banco não respondeu. Tente de novo.",
  mudou: "O horário mudou em outra aba. A tela foi atualizada; tente de novo.",
  data: "Data ou hora inválida.",
  ordem: "A ordem enviada não confere com os slides do post. Recarregue a página.",
};

/** Motivo legível de um resultado do lote/quadro. */
export function mensagemLote(acao: AcaoLote | "mover" | "reordenar", r: string): string {
  if (r === "ok") return "Feito.";
  if (r === "status") {
    if (acao === "aprovar") return "Só rascunho pode ser aprovado.";
    if (acao === "rascunho") return "Só aprovado (ainda não publicado) ou com falha volta para rascunho.";
    return "Só rascunho pode ser movido ou reordenado. Volte o post para rascunho primeiro.";
  }
  if (r === "passado") return acao === "aprovar" ? MENSAGEM_BLOQUEIO.passado : "O novo horário já passou.";
  if (r in MENSAGEM_BLOQUEIO) return MENSAGEM_BLOQUEIO[r as MotivoBloqueio];
  return MENSAGEM_COMUM[r] ?? "Algo falhou.";
}

// ---------- montagem do quadro (servidor → navegador) ----------

export interface SlideQuadro {
  posicao: number;
  url: string | null;
  alt: string;
  /** Primeira linha do texto do slide (aparece quando falta a imagem). */
  texto: string;
}

export interface CartaoQuadro {
  id: string;
  titulo: string;
  scheduled_at: string;
  data: string;
  hora: string;
  formato: Formato;
  status: StatusPost;
  manual: boolean;
  selo: Selo;
  slides: SlideQuadro[];
  /** Slides sem imagem. */
  faltam: number;
  /** Rascunho que passa nas regras de aprovação agora. */
  pronto: boolean;
  /** Por que não pode aprovar (null = pode, ou não é rascunho). */
  bloqueio: string | null;
  /** Só rascunho move e reordena. */
  editavel: boolean;
  link: string | null;
  erro: string | null;
}

export interface DiaQuadro {
  data: string;
  rotulo: string;
  hoje: boolean;
  passado: boolean;
  feed: CartaoQuadro[];
  stories: CartaoQuadro[];
}

export interface SemanaQuadro {
  rotulo: string;
  intervalo: string;
  dias: DiaQuadro[];
}

const primeiraLinha = (s: string) => (s.split("\n").find((l) => l.trim()) ?? "").trim().slice(0, 120);

export function cartao(p: LinhaPost, itens: LinhaItem[], agora: number): CartaoQuadro {
  const { data, hora } = noFuso(p.scheduled_at);
  const slides = [...itens].sort((a, b) => a.position - b.position).map((i) => ({ posicao: i.position, url: i.public_url, alt: i.alt_text || p.alt_text, texto: primeiraLinha(i.slide_text) }));
  const motivo = p.status === "draft" ? motivoBloqueioAprovacao(p, itens, new Date(agora)) : null;
  return {
    id: p.id,
    titulo: p.title || slides[0]?.texto || "(sem título)",
    scheduled_at: p.scheduled_at,
    data,
    hora,
    formato: p.format,
    status: p.status,
    manual: p.manual,
    selo: seloPost(p, agora),
    slides,
    faltam: itens.filter((i) => !i.storage_path).length,
    pronto: p.status === "draft" && motivo === null,
    bloqueio: motivo ? MENSAGEM_BLOQUEIO[motivo] : null,
    editavel: p.status === "draft",
    link: p.status === "published" ? p.permalink : null,
    erro: p.status === "failed" ? p.last_error : p.status === "approved" && !p.manual && p.attempts > 0 ? p.last_error : null,
  };
}

/** Posts + slides → semanas S1–S4 com dias, feed e stories em ordem de horário. */
export function montarQuadro(semanas: string[][], posts: LinhaPost[], itens: LinhaItem[], agora: number): SemanaQuadro[] {
  const hoje = hojeNoFuso(new Date(agora));
  const porPost = new Map<string, LinhaItem[]>();
  for (const i of itens) porPost.set(i.post_id, [...(porPost.get(i.post_id) ?? []), i]);
  const porDia = new Map<string, DiaQuadro>();
  const resultado = semanas.map((dias, s) => ({
    rotulo: `S${s + 1}`,
    intervalo: `${ddmm(dias[0]!)} a ${ddmm(dias[6]!)}`,
    dias: dias.map((d) => {
      const dia: DiaQuadro = { data: d, rotulo: rotuloDia(d), hoje: d === hoje, passado: d < hoje, feed: [], stories: [] };
      porDia.set(d, dia);
      return dia;
    }),
  }));
  for (const p of [...posts].sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at) || a.id.localeCompare(b.id))) {
    const c = cartao(p, porPost.get(p.id) ?? [], agora);
    const dia = porDia.get(c.data);
    if (dia) (c.formato === "story" ? dia.stories : dia.feed).push(c);
  }
  return resultado;
}

// ---------- envio em lote: nome do arquivo → destino ----------

/** O que o envio em lote precisa saber de cada post do quadro. */
export interface DestinoCatalogo {
  formato: Formato;
  status: StatusPost;
  /** comImagem[i] = o slide i+1 já tem imagem. */
  comImagem: boolean[];
}
export type Catalogo = Record<string, DestinoCatalogo>;

export function catalogoDe(semanas: SemanaQuadro[]): Catalogo {
  const c: Catalogo = {};
  for (const s of semanas) for (const d of s.dias) for (const p of [...d.feed, ...d.stories]) c[p.id] = { formato: p.formato, status: p.status, comImagem: p.slides.map((x) => !!x.url) };
  return c;
}

export type MotivoArquivo =
  | "fontes" // dentro de _fontes/ (ignorado sem aviso)
  | "sistema" // arquivo oculto (.DS_Store etc.)
  | "previa" // -v1, -v2a, -v2b-… : prévia, ignorada
  | "fora_do_padrao" // nome não é <id>-<slide>.jpg
  | "nao_jpeg"
  | "post_inexistente"
  | "ambiguo"
  | "slide_inexistente"
  | "nao_rascunho"
  | "grande"
  | "duplicado"
  | "vazio";

export type Classificacao =
  | { ok: true; caminho: string; id: string; posicao: number; formato: Formato; substitui: boolean }
  | { ok: false; caminho: string; motivo: MotivoArquivo; id?: string; posicao?: number; ignorado: boolean };

/** Ignorados (não entram na contagem de problemas): _fontes, ocultos, prévias e nomes fora do padrão. */
const IGNORADOS = new Set<MotivoArquivo>(["fontes", "sistema", "previa", "fora_do_padrao"]);

export const MENSAGEM_ARQUIVO: Record<MotivoArquivo, string> = {
  fontes: "Pasta _fontes: ignorado.",
  sistema: "Arquivo oculto do sistema: ignorado.",
  previa: "Prévia (-v1, -v2…): ignorada.",
  fora_do_padrao: "Nome fora do padrão <id-do-post>-<slide>.jpg: ignorado.",
  nao_jpeg: "Não é JPEG (.jpg).",
  post_inexistente: "Post inexistente neste quadro (S1–S4 exibidas).",
  ambiguo: "Nome ambíguo: casa com dois posts. Renomeie para <id>-<slide>.jpg.",
  slide_inexistente: "Slide inexistente nesse post.",
  nao_rascunho: "O post não está em rascunho (volte para rascunho para trocar a arte).",
  grande: "Passa de 4,4 MB (limite por envio na Vercel).",
  duplicado: "Dois arquivos para o mesmo slide: nenhum dos dois vai.",
  vazio: "Arquivo vazio.",
};

/** -v1, -v2, -v2a, -v2b-com-gravacao… */
const PREVIA = /-v\d+[a-z]?(?:-|$)/i;
const NUMERO_SLIDE = /^(.+)-(\d{1,2})$/;
const PADRAO = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Classifica um arquivo pelo caminho (relativo à pasta escolhida) e tamanho. Não lê o conteúdo:
 * o tipo JPEG de verdade e a dimensão são conferidos depois (validarImagem) e de novo no servidor.
 * `<id>.jpg` vale como slide 1 quando o id existe (ex.: `st-1026-1.jpg` = story st-1026-1, slide 1).
 */
export function classificarArquivo(caminho: string, tamanho: number, cat: Catalogo): Classificacao {
  const partes = caminho.replace(/\\/g, "/").split("/").filter(Boolean);
  const nome = partes[partes.length - 1] ?? "";
  const nao = (motivo: MotivoArquivo, extra: { id?: string; posicao?: number } = {}): Classificacao => ({ ok: false, caminho, motivo, ignorado: IGNORADOS.has(motivo), ...extra });
  if (partes.slice(0, -1).some((p) => p.toLowerCase() === "_fontes")) return nao("fontes");
  if (nome.startsWith(".")) return nao("sistema");
  const m = /^(.*)\.(jpe?g)$/i.exec(nome);
  if (!m) return nao("nao_jpeg");
  const base = m[1]!.toLowerCase();
  if (PREVIA.test(base)) return nao("previa");
  if (!PADRAO.test(base)) return nao("fora_do_padrao");

  const exato = cat[base] ? { id: base, posicao: 1 } : null;
  const n = NUMERO_SLIDE.exec(base);
  const dividido = n && cat[n[1]!] ? { id: n[1]!, posicao: Number(n[2]) } : null;
  if (exato && dividido) return nao("ambiguo");
  const alvo = dividido ?? exato;
  if (!alvo) return n ? nao("post_inexistente", { id: n[1]!, posicao: Number(n[2]) }) : nao("fora_do_padrao");
  const destino = cat[alvo.id]!;
  if (alvo.posicao < 1 || alvo.posicao > destino.comImagem.length) return nao("slide_inexistente", alvo);
  if (destino.status !== "draft") return nao("nao_rascunho", alvo);
  if (tamanho <= 0) return nao("vazio", alvo);
  if (tamanho > LIMITE_ENVIO_BYTES) return nao("grande", alvo);
  return { ok: true, caminho, id: alvo.id, posicao: alvo.posicao, formato: destino.formato, substitui: destino.comImagem[alvo.posicao - 1] === true };
}

/** Classifica a lista inteira e derruba os dois lados de um destino repetido. */
export function classificarArquivos(arquivos: { caminho: string; tamanho: number }[], cat: Catalogo): Classificacao[] {
  const r = arquivos.map((a) => classificarArquivo(a.caminho, a.tamanho, cat));
  const conta = new Map<string, number>();
  for (const c of r) if (c.ok) conta.set(`${c.id}#${c.posicao}`, (conta.get(`${c.id}#${c.posicao}`) ?? 0) + 1);
  return r.map((c) => (c.ok && (conta.get(`${c.id}#${c.posicao}`) ?? 0) > 1 ? { ok: false, caminho: c.caminho, motivo: "duplicado", id: c.id, posicao: c.posicao, ignorado: false } : c));
}

/** Texto da dimensão exigida para o formato. */
export const dimensaoExigida = (f: Formato) => `${DIMENSOES[f].largura}×${DIMENSOES[f].altura}`;

/** Converte "AAAA-MM-DD" + "HH:MM" validando (para a rota de lote). */
export function dataHoraValidas(data: unknown, hora: unknown): { data: string; hora: string | null } | null {
  if (typeof data !== "string" || !dataValida(data)) return null;
  if (hora == null || hora === "") return { data, hora: null };
  if (typeof hora !== "string" || !horaValida(hora)) return null;
  return { data, hora };
}
