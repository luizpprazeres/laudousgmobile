/**
 * Filtro dos avisos da SANITY POR IA (estudo dos alertas de 12–13/10/2026).
 *
 * Metade dos avisos da IA era falso alarme, e o padrão mais visível no app era a IA chamar de
 * "achado inventado" uma frase do PRÓPRIO modelo da casa: a técnica dos COMENTÁRIOS, a frase normal do
 * ovário ("imagens anecoicas", "folículos") ou a frase da Biblioteca para um achado ditado
 * ("esteatose acentuada" → "aumento difuso da ecogenicidade… importante atenuação sonora").
 *
 * Camadas (nesta ordem):
 *   1. aviso que se desmente ("…o que está correto, sem divergência", sem "porém/mas") → sai
 *   2. achado_inventado cujo trecho é frase da Biblioteca da categoria:
 *        modelo/técnica (texto padrão) → sai
 *        frase de achado (variante) → sai só se a Jev disser que o ditado a justifica (≥ 0,7)
 *   3. achado_inventado/outro restante → a Jev julga; sai só "falso" com confiança ≥ 0,7
 * NUNCA filtra: omissão, lateralidade, medida, data, comando, conclusão inconsistente, categoria.
 * Sem Jev (chave/falha), as camadas 2-variante e 3 não removem nada.
 */
import { getDbClient, schema } from "@laudousg/db";
import { and, eq } from "drizzle-orm";
import type { SanityIssue, SanityResult } from "@laudousg/shared";
import { askJev, type JevQuestion } from "@/server/ai/jev";
import { hasIdentifierResidue, scrubIdentifiers } from "@/server/privacy/scrub";

const NUNCA = new Set(["achado_omitido", "lateralidade_divergente", "medida_divergente", "data_divergente", "comando_ignorado", "conclusao_inconsistente", "categoria_divergente"]);
const FILTRAVEIS_JEV = new Set(["achado_inventado", "outro"]);

export type HouseSentence = { text: string; norm: string; tokens: Set<string>; padrao: boolean; regra?: string };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/\d+(?:[.,]\d+)?/g, "#").replace(/[^a-z#\s]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(s.split(" ").filter((t) => t.length > 2));

/** Título da regra mais próxima antes da posição ("3. ESTEATOSE HEPÁTICA ACENTUADA"). */
function regraAntes(content: string, pos: number): string | undefined {
  const antes = content.slice(Math.max(0, pos - 400), pos);
  const ms = Array.from(antes.matchAll(/(?:^|\s)\d+[.)][ \t]+((?:[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9\-/(),]*[ \t]*){1,10})/g));
  const t = ms.at(-1)?.[1]?.trim().replace(/[ \t]+(NO|NA)$/, "");
  return t && t.length >= 4 ? t : undefined;
}

/** Frases de um bloco: linhas, trechos entre aspas (com a regra de origem) e sentenças. */
export function sentencesFrom(content: string, padrao: boolean): HouseSentence[] {
  const out: HouseSentence[] = [];
  const pieces: Array<{ text: string; regra?: string }> = [
    ...content.split(/\n+/).map((text) => ({ text })),
    ...Array.from(content.matchAll(/[“"]([^”"]{12,})[”"]/g), (m) => ({ text: m[1]!, regra: regraAntes(content, m.index!) })),
  ];
  for (const p of pieces)
    for (const s of p.text.split(/(?<=[.;])\s+/)) {
      const n = norm(s.replace(/^\s*(\d+[.)]|[-•*]|no corpo:|na conclus[aã]o:)\s*/i, ""));
      if (n.length >= 12) out.push({ text: s.trim(), norm: n, tokens: tokens(n), padrao, regra: p.regra });
    }
  return out;
}

const cache = new Map<string, { at: number; frases: HouseSentence[] }>();
export async function houseSentences(categoria: string): Promise<HouseSentence[]> {
  const hit = cache.get(categoria);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.frases;
  const rows = await getDbClient()
    .select({ kind: schema.knowledgeBlocks.kind, content: schema.knowledgeBlocks.content })
    .from(schema.knowledgeBlocks)
    .where(and(eq(schema.knowledgeBlocks.categoryCode, categoria), eq(schema.knowledgeBlocks.status, "validated")));
  const frases = rows.flatMap((r) => sentencesFrom(String(r.content), r.kind === "modelo" || r.kind === "comentario_tecnico"));
  cache.set(categoria, { at: Date.now(), frases });
  return frases;
}

/** O trecho (ou cada pedaço "a / b") é frase da casa? Devolve "padrao", "variante" ou null. */
export function houseMatch(trecho: string, frases: HouseSentence[]): "padrao" | "variante" | null {
  return houseMatchInfo(trecho, frases)?.tipo ?? null;
}

export function houseMatchInfo(trecho: string, frases: HouseSentence[]): { tipo: "padrao" | "variante"; regras: string[] } | null {
  const partes = trecho.split(/\s+\/\s+/).map(norm).filter((p) => p.length >= 12);
  if (!partes.length) return null;
  let todasPadrao = true;
  const regras: string[] = [];
  for (const p of partes) {
    const tp = tokens(p);
    // melhor frase: contém o trecho inteiro > trecho contém a frase > mais palavras em comum; empate → padrão
    let melhor: HouseSentence | null = null;
    let melhorScore = 0;
    for (const f of frases) {
      let score = 0;
      if (f.norm.includes(p)) score = 3 - f.norm.length / 10_000;
      else if (p.includes(f.norm) && f.norm.length >= 20) score = 2 + f.norm.length / 10_000;
      else if (tp.size >= 4) {
        let inter = 0;
        for (const t of tp) if (f.tokens.has(t)) inter++;
        if (inter / tp.size >= 0.8) score = inter / tp.size;
      }
      if (score > 0 && f.padrao) score += 0.001;
      if (score > melhorScore) { melhor = f; melhorScore = score; }
    }
    if (!melhor) return null;
    if (!melhor.padrao) todasPadrao = false;
    if (melhor.regra) regras.push(melhor.regra);
  }
  return { tipo: todasPadrao ? "padrao" : "variante", regras };
}

const SE_DESMENTE = /(o que est[aá] corret[oa]|est[aá] corret[oa]\b|sem diverg[eê]ncia|n[aã]o [eé] (um )?(issue|problema|erro)|arredondamento aceit[aá]vel|coincide com o ditado|bate com o ditado|consistente com o ditado)/i;
// "mas" só arma a comparação ("no ditado X, mas no laudo X, o que está correto"); estas introduzem problema de fato
const RESSALVA = /\b(por[eé]m|contudo|entretanto|todavia|no entanto)\b/i;

const num = (s: string) => Number(s.replace(",", "."));
const numeros = (s: string) => Array.from(s.matchAll(/(?<![\d,.])\d+(?:[.,]\d+)?/g), (m) => num(m[0]));
const perto = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.03) || (Number.isInteger(a) && Math.abs(a - b) <= 0.5);

/**
 * Padrões de falso alarme da IA medidos no estudo (o motivo é conferido, não confiado):
 * média do saco gestacional que bate, mesma medida em cm e em mm, ossos D/E iguais no morfológico/
 * obstétrico (estilo da casa), [REVISAR] apontado de novo, cabeçalho técnico do modelo.
 */
export function padraoFalso(issue: SanityIssue, categoria: string | null): string | null {
  const d = issue.detail;
  if (/saco gestacional|di[aâ]metro m[eé]dio/i.test(d)) {
    // as três medidas do saco aparecem primeiro na mensagem ("ditado 17,8 x 16,9 x 14,7, laudo 16,5 mm")
    const cadeia = d.match(/(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)/i);
    const n = cadeia ? [num(cadeia[1]!), num(cadeia[2]!), num(cadeia[3]!), ...numeros(d.slice(cadeia.index! + cadeia[0].length))] : [];
    if (n.length >= 4) {
      const media = (n[0]! + n[1]! + n[2]!) / 3;
      if (n.slice(3).some((x) => perto(x, media))) return "media_saco";
    }
  }
  if (issue.type === "medida_divergente") {
    // exatamente dois valores e um é o outro ×10 (0,2 cm = 2,0 mm). Arredondamento (1,55 → 1,6) NÃO é isso.
    const v = [...new Set(numeros(d).filter((x) => x > 0).map((x) => Math.round(x * 1000) / 1000))];
    if (v.length === 2) {
      const [a, b] = v as [number, number];
      if (Math.abs(a * 10 - b) < 1e-6 || Math.abs(b * 10 - a) < 1e-6) return "cm_mm";
    }
  }
  if (/(OBSTETRIC|MORFOLOG|DOPPLER_OBST)/.test(categoria ?? "") && /(f[eê]mur|t[ií]bia|f[ií]bula|[uú]mero|r[aá]dio|ulna|ossos?)/i.test(d) && /(direit[oa] e esquerd[oa]|lateralidade|bilateral)/i.test(d))
    return "ossos_de";
  if (/\[REVISAR/i.test(d) && (issue.type === "outro" || issue.type === "formato_quebrado")) return "revisar_repetido";
  if ((issue.type === "outro" || issue.type === "achado_inventado") && /(transdutor|MHz|documenta[cç][aã]o fotogr[aá]fica|cabe[cç]alho t[eé]cnico|t[eé]cnica do exame|detalhes t[eé]cnicos)/i.test(d))
    return "tecnica";
  return null;
}

function excerpt(text: string, needle: string, max = 1200): string {
  const i = needle ? text.toLowerCase().indexOf(needle.toLowerCase().slice(0, 40)) : -1;
  if (text.length <= max) return text;
  const start = Math.max(0, (i >= 0 ? i : 0) - max / 2);
  return text.slice(start, start + max);
}

export type SanityFilterStats = { antes: number; depois: number; seDesmente: number; padrao: number; variante: number; jev: number };

export async function filterAiSanity(args: {
  ai: SanityResult;
  finalText: string;
  rawInput: string;
  categoria: string | null;
  frases?: HouseSentence[];
  ask?: typeof askJev;
}): Promise<{ result: SanityResult; stats: SanityFilterStats }> {
  const stats: SanityFilterStats = { antes: args.ai.issues.length, depois: 0, seDesmente: 0, padrao: 0, variante: 0, jev: 0 };
  let frases = args.frases;
  if (!frases && args.categoria) {
    try { frases = await houseSentences(args.categoria); } catch { frases = []; }
  }
  const ditado = scrubIdentifiers(args.rawInput);
  const podeIrParaJev = !hasIdentifierResidue(ditado);
  const mantidos: SanityIssue[] = [];
  const perguntas: Record<string, JevQuestion> = {};
  const pendentes: Array<{ id: string; issue: SanityIssue; motivo: "variante" | "jev" }> = [];

  args.ai.issues.forEach((issue, idx) => {
    if (SE_DESMENTE.test(issue.detail) && !RESSALVA.test(issue.detail)) { stats.seDesmente++; return; }
    if (padraoFalso(issue, args.categoria)) { stats.padrao++; return; }
    if (NUNCA.has(issue.type)) { mantidos.push(issue); return; }
    const trecho = issue.trecho_laudo ?? "";
    if (issue.type === "achado_inventado" && trecho && frases?.length) {
      const info = houseMatchInfo(trecho, frases);
      if (info?.tipo === "padrao") { stats.padrao++; return; }
      if (info?.tipo === "variante" && podeIrParaJev) {
        const id = `v${idx}`;
        const regra = info.regras.length ? ` Na Biblioteca da casa, ela é a frase pronta para: ${[...new Set(info.regras)].join("; ")}.` : " Ela é uma frase pronta da casa para descrever um achado.";
        perguntas[id] = {
          type: "choice",
          instructions: `Laudo de ultrassom. A frase do laudo é "${scrubIdentifiers(trecho)}".${regra} O ditado do médico foi: "${excerpt(ditado, trecho)}". O médico ditou esse achado (com outras palavras, mesmo grau e mesmo lado)?`,
          criteria: { sim: "sim — o médico ditou esse achado; a frase é o jeito da casa de escrevê-lo", nao: "não — o ditado não fala desse achado ou diz outra coisa (outro grau, outro lado, ausência)" },
        };
        pendentes.push({ id, issue, motivo: "variante" });
        return;
      }
    }
    if (FILTRAVEIS_JEV.has(issue.type) && podeIrParaJev) {
      const id = `j${idx}`;
      perguntas[id] = {
        type: "choice",
        instructions: `Revisão automática de laudo de ultrassom. Aviso: (${issue.type}) "${scrubIdentifiers(issue.detail)}". Trecho do laudo: "${scrubIdentifiers(trecho)}". Ditado do médico: "${excerpt(ditado, trecho)}". Este aviso aponta um problema real?`,
        criteria: { real: "real — o laudo afirma algo que o ditado não sustenta", falso: "falso alarme — é texto padrão do modelo, ou está no ditado com outras palavras, ou não há problema", medico: "só o médico pode dizer" },
      };
      pendentes.push({ id, issue, motivo: "jev" });
      return;
    }
    mantidos.push(issue);
  });

  if (pendentes.length) {
    const r = await (args.ask ?? askJev)({ tarefa: "revisar avisos de laudo" }, perguntas, { timeoutMs: 3000, tag: "sanity" });
    for (const p of pendentes) {
      const a = r?.answers[p.id];
      const tirar = a?.type === "choice" && a.confidence >= 0.7 && (p.motivo === "variante" ? a.choice === "sim" : a.choice === "falso");
      if (tirar) { if (p.motivo === "variante") stats.variante++; else stats.jev++; }
      else mantidos.push(p.issue);
    }
  }
  stats.depois = mantidos.length;
  const verdict = mantidos.some((i) => i.severity === "critical") ? "critical" : mantidos.some((i) => i.severity === "warning") ? "warning" : "ok";
  return { result: { ...args.ai, issues: mantidos, verdict }, stats };
}
