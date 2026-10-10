/**
 * LÉXICO DA CASA (W11, 10/10/2026) — fonte ÚNICA das trocas determinísticas de termo.
 *
 * Origem: mineração de 869 laudos com final de 180 dias (`scripts/bench-haiku/lexico-mineracao.ts`) +
 * pedido do Dr. Luiz (10/10) + `docs/estilo-casa-regras-gerais.md` §1. Cada entrada diz:
 *  - escopo: categorias (ausente = todas);
 *  - camadas: "ditado" (antes de qualquer LLM, junto da normalização do ASR) e/ou "saida" (depois da
 *    geração, junto dos guards finais) — o que o ASR erra e o que a IA erra;
 *  - tipo: "grafia" (a forma errada não é palavra do português médico: troca segura em qualquer
 *    contexto) ou "contextual" (só com o contexto do regex, ex.: ordinal antes de "compartimento").
 *
 * Decisões do Luiz de 10/10 (tarde, `docs/stories/haiku-migration/DECISOES-LUIZ-2026-10-10.md`, Termos):
 * "ecogênico" sozinho → "hiperecoico" (fora a obstetrícia: o "foco ecogênico intracardíaco" do golf ball
 * espera confirmação), "bolsa" → "bursa" no MSK e "modificação do padrão ecotextural" no MSK.
 *
 * Fora daqui de propósito: "tendinose", "córtico medular" (grafia do modelo do abdome, mantida pelo
 * médico) e "x" × "×".
 *
 * Algarismo romano não é tarefa do ASR (keyterm não garante grafia — doc oficial do Deepgram, ver
 * relatório): fica aqui, no contextual.
 *
 * Flags (env, por camada): LEXICO_DITADO_CATEGORIES e LEXICO_SAIDA_CATEGORIES. Ausente = todas as
 * categorias; "" = desligado (rollback); "A,B" = só essas. LEXICO_DESLIGADAS=id1,id2 desliga entradas.
 */

export type CamadaLexico = "ditado" | "saida";

export interface EntradaLexico {
  readonly id: string;
  readonly canonico: string;
  readonly tipo: "grafia" | "contextual";
  readonly camadas: readonly CamadaLexico[];
  /** Categorias em que a troca vale; ausente = todas. */
  readonly categorias?: readonly string[];
  /** Categorias em que a troca NÃO vale (exige categoria conhecida: sem categoria, não aplica). */
  readonly categoriasFora?: readonly string[];
  readonly regex: RegExp;
  readonly trocar: (match: string, ...grupos: string[]) => string;
}

const ROMANO = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
const ORDINAL: Record<string, number> = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6 };
const CARDINAL: Record<string, number> = { dois: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8 };

/** "4º" / "4o" / "quarto" → 4; senão undefined. */
function valorOrdinal(t: string): number | undefined {
  const s = t.toLowerCase();
  const d = /^([1-8])(?:º|°|o)?$/.exec(s);
  if (d) return Number(d[1]);
  return ORDINAL[s] ?? CARDINAL[s];
}

const MSK = ["MUSCULOESQUELETICO", "MUSCULOESQUELETICO_V2", "MUSCULOESQUELETICO_RARAS"];
// Mesma família do global obstétrico (`prompts/global.ts`, OBSTETRIC_GLOBAL_FAMILY).
const OBSTETRICIA = ["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO", "CERVICOMETRIA"];
const FIGADO = ["ABDOMEN_TOTAL", "ABDOMEN_SUPERIOR", "ABDOMEN_TOTAL_DOPPLER", "DOPPLER_HEPATICO"];

// Ordinal do punho: "4º", "4o", "quarto"… (1–6), opcionalmente numa lista que termina em "compartimento(s)".
const ORD_PUNHO = String.raw`(?:primeiro|segundo|terceiro|quarto|quinto|sexto|[1-6](?:º|°|o)(?!\w))`;
// Número de segmento hepático: 1–8 ou por extenso (sem "um", ambíguo).
const NUM_SEG = String.raw`(?:[1-8]|dois|tr[êe]s|quatro|cinco|seis|sete|oito)`;

export const LEXICO_DA_CASA: readonly EntradaLexico[] = [
  {
    // "anecóica", "isoecóica", "hiperecóicas" (39 ditados, 13 corrigidos à mão no final).
    id: "ecoico-sem-acento",
    canonico: "anecoico / hipoecoico / hiperecoico / isoecoico (sem acento)",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    regex: /\b(an|hipo|hiper|iso)?ec[óÓ]ic(o|a|os|as)\b/gi,
    trocar: (_m, p = "", s) => `${p}ecoic${s}`,
  },
  {
    // "hiperecogênico(s)/a(s)" → "hiperecoico…" (regra da casa §1; 6 saídas da IA, 2 ditados).
    // "ecogenicidade" (propriedade) não casa; "ecogênico" sozinho fica para o Luiz.
    id: "ecogenico-para-ecoico",
    canonico: "hipoecoico / hiperecoico / anecoico / isoecoico",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    regex: /\b(hipo|hiper|an|iso)ecog[êe]nic(o|a|os|as)\b/gi,
    trocar: (_m, p, s) => `${p}ecoic${s}`,
  },
  {
    // ASR: "super lateral", "superlateral", "súpero-lateral"… — não são palavras (12 finais assinados com elas).
    id: "quadrante-mama-grafia",
    canonico: "superolateral / inferolateral / superomedial / inferomedial",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    categorias: ["MAMARIA"],
    // `\b` não vê "í"/"ú" como letra: limite por lookbehind Unicode.
    regex: /(?<!\p{L})(?:(super)[\s-]?|(s[úu]per|[íi]nfer)o[\s-]+|(s[úu]per|[íi]nfer)o-)(lateral|medial)(?!\p{L})/giu,
    trocar: (_m, a, b, c, lado) => `${normPos(a ?? b ?? c)}o${lado.toLowerCase()}`,
  },
  {
    // "quadrante(s) superior lateral" / "inferior medial"… → forma da casa; só depois de "quadrante(s)".
    id: "quadrante-mama-contextual",
    canonico: "superolateral / inferolateral / superomedial / inferomedial",
    tipo: "contextual",
    camadas: ["ditado", "saida"],
    categorias: ["MAMARIA"],
    regex: /(?<=\bquadrantes?\s+)(superior|inferior)\s+(lateral|medial)\b/gi,
    trocar: (_m, pos, lado) => `${pos.toLowerCase() === "superior" ? "super" : "infer"}o${lado.toLowerCase()}`,
  },
  {
    // Punho: o médico assina "IV compartimento extensor"; a IA e o ditado trazem "quarto"/"4º" (49 saídas).
    id: "compartimento-romano",
    canonico: "I…VI compartimento",
    tipo: "contextual",
    camadas: ["ditado", "saida"],
    categorias: MSK,
    regex: new RegExp(String.raw`\b${ORD_PUNHO}(?=(?:\s*(?:,|\be\b|\bao\b|\ba\b|\baté\b)\s*${ORD_PUNHO})*\s+compartimentos?\b)`, "gi"),
    trocar: (m) => ROMANO[valorOrdinal(m) ?? 0] || m,
  },
  {
    // Fígado: "segmento 4" → "segmento IV" (Couinaud). Nunca medida ("segmento 4 cm", "segmento de 4").
    id: "segmento-hepatico-romano",
    canonico: "segmento I…VIII",
    tipo: "contextual",
    camadas: ["ditado", "saida"],
    categorias: FIGADO,
    regex: new RegExp(
      String.raw`(?<=\bsegmentos?\s+(?:hep[áa]ticos?\s+)?(?:(?:[IVX]+|${NUM_SEG})\s*(?:,|\be\b|\ba\b)\s*)*)${NUM_SEG}\b(?!\s*(?:[.,]\d|cm|mm|ml|x\b|%))`,
      "gi",
    ),
    trocar: (m) => ROMANO[valorOrdinal(m) ?? 0] || m,
  },
  {
    // Luiz 10/10: "ecogênico(a)" sozinho → "hiperecoico(a)" ("foco ecogênico", "material ecogênico", "hilo
    // ecogênico"). "ecogenicidade" não casa. Fora: obstetrícia inteira ("Foco ecogênico no ventrículo
    // esquerdo" é o golf ball sem a palavra "intracardíaco" — exceção pendente do Luiz), "… intracardíaco" em
    // qualquer categoria e o comparativo ("mais/menos/pouco ecogênico que…"), que não é o adjetivo da casa.
    id: "ecogenico-sozinho",
    canonico: "hiperecoico",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    categoriasFora: OBSTETRICIA,
    regex: /(?<!\p{L})(?<!(?:mais|menos|pouco|t[ãa]o)\s+)ecog[êe]nic(o|a|os|as)(?!\p{L})(?!\s+intracard)/giu,
    trocar: (_m, s) => `hiperecoic${s.toLowerCase()}`,
  },
  {
    // "bursa subacromial subdeltoidea" (ditado, 10), "… e subdeltoidea" (IA, 4), "subdeltóidea" →
    // "subacromial-subdeltoidea" (49 finais). Mantém "bolsa"/"bursa" — a troca do nome é a entrada seguinte (MSK).
    id: "bursa-subacromial-subdeltoidea",
    canonico: "subacromial-subdeltoidea",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    regex: /\b(bursa|bolsa)\s+sub[\s-]?acromial(?:\s+e\s+|[\s-]+)sub[\s-]?delt[óo]idea\b/gi,
    trocar: (_m, b) => `${b} subacromial-subdeltoidea`,
  },
  {
    // Luiz 10/10: "bolsa" → "bursa" no MSK ("bolsa subacromial-subdeltoidea", "bolsa suprapatelar", "bolsas
    // sinoviais radial e ulnar" — 16 finais em 180 dias). Fora do MSK "bolsa" é outra coisa (escrotal,
    // vertical do líquido amniótico, de Blake) e fica.
    id: "bolsa-para-bursa",
    canonico: "bursa",
    tipo: "contextual",
    camadas: ["ditado", "saida"],
    categorias: MSK,
    regex: /(?<!\p{L})bolsa(s?)(?!\p{L})/giu,
    trocar: (_m, s) => `bursa${s.toLowerCase()}`,
  },
  {
    // Luiz 10/10: MSK escreve "modificação do padrão ecotextural", nunca "alteração" (o ditado chega a pedir
    // "da ecotextura escreva modificação do padrão ecotextural"). Nos finais de 180 dias: 58 com a forma da
    // casa × 17 "alteração do padrão ecotextural" e 17 "alteração ecotextural" vindos da IA. Variantes:
    // "alteração ecotextural", "… da/na ecotextura", "… do/no padrão ecotextural", com adjetivo no meio
    // ("alteração difusa do padrão…") e no plural. Fora do MSK (tireoide, abdome) fica como está.
    id: "modificacao-padrao-ecotextural",
    canonico: "modificação do padrão ecotextural",
    tipo: "contextual",
    camadas: ["ditado", "saida"],
    categorias: MSK,
    regex: /(?<!\p{L})altera[çc](ão|ao|ões|oes)((?:\s+(?:difusas?|focal|focais|discretas?|leves?|acentuadas?|importantes?))?)\s+(?:(?:do|no)\s+padr[ãa]o\s+ecotextural|ecotexturais|ecotextural|(?:da|na)\s+ecotextura)(?!\p{L})/giu,
    trocar: (_m, n, adj) => `${/^[õo]es$/i.test(n) ? "modificações" : "modificação"}${adj.toLowerCase()} do padrão ecotextural`,
  },
  {
    // Pedido do Luiz (10/10): "metacarpofalangiana". "falangeana", "metacarpo falangiana" não são a forma da casa.
    id: "metacarpofalangiana",
    canonico: "metacarpofalangiana",
    tipo: "grafia",
    camadas: ["ditado", "saida"],
    regex: /\bmetacarpo[\s-]*falang(?:e|ei)an([ao]s?)\b|\bmetacarpo[\s-]+falangian([ao]s?)\b/gi,
    trocar: (_m, a, b) => `metacarpofalangian${a ?? b}`,
  },
];

/** "Súper"/"ínfer" → "super"/"infer". */
function normPos(p: string): string {
  return p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Mantém a caixa do trecho original: "Anecóica" → "Anecoica"; "HIPOECOGÊNICO" (título) → "HIPOECOICO". */
function comCaixa(original: string, novo: string): string {
  if (/^[IVX]+$/.test(novo)) return novo;
  if (/\p{Lu}\p{Lu}/u.test(original) && original === original.toUpperCase()) return novo.toUpperCase();
  return /^[A-ZÀ-Ý]/.test(original) ? novo.charAt(0).toUpperCase() + novo.slice(1) : novo;
}

/** Categorias ligadas para a camada; `undefined` = env ausente → todas. */
export function lexicoAtivo(categoria: string | undefined, valorEnv: string | undefined): boolean {
  if (valorEnv === undefined) return true;
  const lista = valorEnv.split(",").map((c) => c.trim()).filter(Boolean);
  if (!lista.length) return false;
  if (lista.includes("*")) return true;
  return !!categoria && lista.includes(categoria);
}

export interface TrocaLexico {
  readonly id: string;
  readonly de: string;
  readonly para: string;
  /** Até 20 caracteres antes do trecho (auditoria e validação por contexto). */
  readonly antes: string;
}

/** Entradas desligadas por env (`LEXICO_DESLIGADAS=id1,id2`) — rollback de uma troca só. */
export function entradasDesligadas(valorEnv: string | undefined): Set<string> {
  return new Set((valorEnv ?? "").split(",").map((x) => x.trim()).filter(Boolean));
}

/**
 * Aplica o léxico a um texto, para a camada e a categoria dadas. Puro e determinístico.
 * Sem categoria, só as entradas sem escopo (globais) — nem as com `categoriasFora`.
 */
export function aplicarLexico(
  texto: string,
  opts: { categoria?: string; camada: CamadaLexico; desligadas?: ReadonlySet<string> },
): { texto: string; trocas: TrocaLexico[] } {
  const trocas: TrocaLexico[] = [];
  let out = texto;
  for (const e of LEXICO_DA_CASA) {
    if (!e.camadas.includes(opts.camada) || opts.desligadas?.has(e.id)) continue;
    if (e.categorias && !(opts.categoria && e.categorias.includes(opts.categoria))) continue;
    if (e.categoriasFora && (!opts.categoria || e.categoriasFora.includes(opts.categoria))) continue;
    out = out.replace(e.regex, (...args) => {
      // args = [match, grupo1…grupoN, offset, texto] (sem grupos nomeados)
      const match = args[0] as string;
      const offset = args[args.length - 2] as number;
      const novo = comCaixa(match, e.trocar(match, ...(args.slice(1, -2) as string[])));
      if (novo !== match) trocas.push({ id: e.id, de: match, para: novo, antes: out.slice(Math.max(0, offset - 20), offset) });
      return novo;
    });
  }
  return { texto: out, trocas };
}
