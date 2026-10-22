/**
 * Leitura do copy/calendario-instagram.json → posts prontos para public.social_import.
 * Tudo ou nada: um item inválido derruba a importação inteira (nada é gravado pela metade).
 *  - feed "foto" → image; "carrossel"/"viral" com mais de um slide → carousel (um slide → image);
 *  - stories → story, com um slide (texto + visual) e o quadro como pilar;
 *  - publicacao "manual" → manual = true; data + hora no fuso America/Sao_Paulo.
 */
import { contarHashtags, tamanhoLegenda } from "./regras";
import { FUSO, ID_POST, LIMITES, type Formato, type Interacao, type PostImportado, type SlideImportado } from "./tipos";
import { dataValida, horaValida, instanteNoFuso } from "./datas";

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export interface LeituraCalendario {
  posts: PostImportado[];
  erros: string[];
}

function lerInteracao(v: unknown, onde: string, erros: string[]): Interacao | null {
  if (v == null) return null;
  if (!ehObj(v) || typeof v.tipo !== "string" || !v.tipo.trim()) {
    erros.push(`${onde}: interação inválida`);
    return null;
  }
  const opcoes = Array.isArray(v.opcoes) ? v.opcoes.filter((o): o is string => typeof o === "string").map((o) => o.trim()).slice(0, 10) : [];
  return { tipo: v.tipo.trim().slice(0, 40), opcoes };
}

function quando(item: Obj, onde: string, erros: string[]): string | null {
  const data = texto(item.data);
  const hora = texto(item.hora);
  if (!dataValida(data) || !horaValida(hora)) {
    erros.push(`${onde}: data/hora inválida (${data || "?"} ${hora || "?"})`);
    return null;
  }
  return instanteNoFuso(data, hora, FUSO);
}

function publicacao(item: Obj, onde: string, erros: string[]): boolean {
  if (item.publicacao === "manual") return true;
  if (item.publicacao === "auto" || item.publicacao == null) return false;
  erros.push(`${onde}: publicacao deve ser "auto" ou "manual"`);
  return false;
}

function lerFeed(item: Obj, erros: string[]): PostImportado | null {
  const id = texto(item.id);
  const onde = `feed ${id || "?"}`;
  const n0 = erros.length;
  const scheduled_at = quando(item, onde, erros);
  const manual = publicacao(item, onde, erros);
  const brutos = Array.isArray(item.slides) ? item.slides : [];
  const slides: SlideImportado[] = [];
  for (const s of brutos) {
    if (!ehObj(s) || !Number.isInteger(s.n)) {
      erros.push(`${onde}: slide sem número`);
      continue;
    }
    slides.push({ position: s.n as number, slide_text: texto(s.texto), visual_brief: texto(s.visual), alt_text: "" });
  }
  slides.sort((a, b) => a.position - b.position);
  if (slides.length === 0 || slides.length > LIMITES.slides) erros.push(`${onde}: precisa de 1 a ${LIMITES.slides} slides`);
  if (slides.some((s, i) => s.position !== i + 1)) erros.push(`${onde}: slides devem ser numerados 1, 2, 3…`);

  let format: Formato | null = null;
  if (item.formato === "foto") {
    format = "image";
    if (slides.length > 1) erros.push(`${onde}: foto com mais de um slide`);
  } else if (item.formato === "carrossel" || item.formato === "viral") {
    format = slides.length > 1 ? "carousel" : "image";
  } else erros.push(`${onde}: formato "${String(item.formato)}" desconhecido`);

  const caption = texto(item.legenda);
  const hashtags = texto(item.hashtags);
  const alt_text = texto(item.alt);
  if (tamanhoLegenda(caption, hashtags) > LIMITES.legenda) erros.push(`${onde}: legenda + hashtags passam de ${LIMITES.legenda} caracteres`);
  if (contarHashtags(hashtags) > LIMITES.hashtags) erros.push(`${onde}: mais de ${LIMITES.hashtags} hashtags`);
  if ([...alt_text].length > LIMITES.alt) erros.push(`${onde}: texto alternativo longo demais`);
  // Foto única: o alt do post é o alt da imagem.
  if (format === "image" && slides[0]) slides[0].alt_text = alt_text;

  const notes = Array.isArray(item.verificar) ? item.verificar.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [];
  if (erros.length > n0 || !scheduled_at || !format) return null;
  return {
    id, scheduled_at, format, caption, hashtags, alt_text, manual, interaction: null,
    pillar: texto(item.pilar).slice(0, 80), angle: texto(item.angulo).slice(0, 80), title: texto(item.titulo).slice(0, 300), notes, slides,
  };
}

function lerStory(item: Obj, erros: string[]): PostImportado | null {
  const id = texto(item.id);
  const onde = `story ${id || "?"}`;
  const n0 = erros.length;
  if (item.formato !== "story") erros.push(`${onde}: formato deve ser "story"`);
  const scheduled_at = quando(item, onde, erros);
  const manual = publicacao(item, onde, erros);
  const interaction = lerInteracao(item.interacao, onde, erros);
  const slide_text = texto(item.texto);
  if (!slide_text) erros.push(`${onde}: sem texto`);
  if (erros.length > n0 || !scheduled_at) return null;
  return {
    id, scheduled_at, format: "story", caption: "", hashtags: "", alt_text: "", manual, interaction,
    pillar: texto(item.quadro).slice(0, 80), angle: "", title: "", notes: [],
    slides: [{ position: 1, slide_text, visual_brief: texto(item.visual), alt_text: "" }],
  };
}

export function lerCalendario(json: unknown): LeituraCalendario {
  const erros: string[] = [];
  if (!ehObj(json)) return { posts: [], erros: ["o arquivo não é um objeto JSON"] };
  if (json.fuso != null && json.fuso !== FUSO) erros.push(`fuso "${String(json.fuso)}" não suportado (use ${FUSO})`);
  const feed = Array.isArray(json.feed) ? json.feed : [];
  const stories = Array.isArray(json.stories) ? json.stories : [];
  if (feed.length + stories.length === 0) erros.push("nenhum post em feed[] ou stories[]");

  const posts: PostImportado[] = [];
  const vistos = new Set<string>();
  const registrar = (p: PostImportado | null, bruto: unknown) => {
    const id = ehObj(bruto) ? texto(bruto.id) : "";
    if (!ID_POST.test(id)) {
      erros.push(`id inválido: "${id}"`);
      return;
    }
    if (vistos.has(id)) erros.push(`id repetido: ${id}`);
    vistos.add(id);
    if (p) posts.push(p);
  };
  for (const f of feed) registrar(ehObj(f) ? lerFeed(f, erros) : (erros.push("item de feed inválido"), null), f);
  for (const s of stories) registrar(ehObj(s) ? lerStory(s, erros) : (erros.push("item de stories inválido"), null), s);
  return erros.length ? { posts: [], erros } : { posts, erros };
}
