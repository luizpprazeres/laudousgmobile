/**
 * Jev como ÁRBITRA do ditado (opções C e D do estudo de transcrição de 12/10/2026).
 *
 * O código acha os trechos suspeitos e monta as opções; a Jev só escolhe; o código decide o que fazer:
 *   - "sem" trocado por algo que não é palavra antes de um achado ("C e nódulos", "cioligoâmnio", "se sombra")
 *       → troca sozinha com confiança ≥ 0,8
 *   - número antes de achado ("6 sinais", "100 sinais", "7 imagens") → só SUGERE (pode ser contagem de verdade)
 *   - centena trocada ("6 e 20 cm/s" → 120?) → só SUGERE (número nunca muda sem o médico)
 *   - grafia de escala ("BERADS", "BRADS", "QRADS") → troca sozinha com confiança ≥ 0,8
 *   - grafia fora do vocabulário da casa ("apoplítea" → poplítea, "Vim direito" → rim) → troca sozinha ≥ 0,7,
 *       sugere entre 0,5 e 0,7 (bancada: com corte 0,7, 0 palavras certas estragadas)
 *   - medida fundida pela formatação ("10,24 0,5", "20 e 0,5") → só AVISA, sem sugestão
 * Fora de propósito: adivinhar "sem" engolido (no real, 2 acertos em 21 alarmes).
 * Só sai um trecho curto (±90 caracteres) sem identificadores. Sem chave, falha ou tempo esgotado → nada muda.
 */
import { askJev, type JevQuestion } from "@/server/ai/jev";
import { hasIdentifierResidue, scrubIdentifiers } from "@/server/privacy/scrub";
import { suspiciousMeasures } from "./numberRepairs";
import { normalizeAsrTranscript } from "./transcriptNormalizer";
import vocabulario from "./vocabulario.json";

export type SuggestionKind = "negacao" | "centena" | "escala" | "grafia" | "medida" | "formato" | "lado";
export type DitadoSuggestion = {
  start: number;
  end: number;
  original: string;
  /** null = só aviso ("confira esta medida"), sem troca proposta. */
  replacement: string | null;
  kind: SuggestionKind;
  confidence: number;
  /** true = a troca é segura o bastante para entrar sozinha (modo "auto"). */
  automatic: boolean;
};

type Candidate = { id: string; kind: SuggestionKind; start: number; end: number; original: string; options: string[]; legitimate: boolean };

const ACHADO =
  "sinais|nódulos?|calcificações|refluxo|alterações|líquido|fluxo|dilatação|sombra|imagens?|lesões|trombos?|evidências?|espessamento|coleções|vascularização|rotura|derrame|diástole|oligoâmnio|polidrâmnio|linfonodos|cistos?|massas?|ascite";

const EXAME: Record<string, string> = {
  ABDOMEN_TOTAL: "ultrassonografia do abdome total", DOPPLER_VENOSO_MMII: "Doppler venoso dos membros inferiores",
  OBSTETRICA: "ultrassonografia obstétrica", DOPPLER_OBSTETRICO: "ultrassonografia obstétrica com Doppler",
  PELVE_FEMININA: "ultrassonografia pélvica", TIREOIDE: "ultrassonografia da tireoide", MAMARIA: "ultrassonografia das mamas",
  DOPPLER_CAROTIDAS: "Doppler das carótidas e vertebrais", MUSCULOESQUELETICO_V2: "ultrassonografia musculoesquelética",
};

const VOC = vocabulario as Record<string, string[]>;
const chave = (w: string) => w.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
const vocabCache = new Map<string, { set: Set<string>; list: string[] }>();
function vocab(categoria: string | null) {
  const k = categoria ?? "*";
  const hit = vocabCache.get(k);
  if (hit) return hit;
  const list = [...new Set([...(VOC[k] ?? []), ...(VOC["*"] ?? [])])];
  const v = { set: new Set(list.map(chave)), list };
  vocabCache.set(k, v);
  return v;
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n]!;
}
const sim = (a: string, b: string) => 1 - lev(a, b) / Math.max(a.length, b.length);

const MAX_GRAFIA = 25;
/** Nunca viram candidatas de grafia: comandos de ditado e palavras comuns que a Biblioteca não tem. */
const PROTEGIDAS = new Set(
  ("acrescente acrescentar acrescenta adicione adicionar coloque colocar remova remover retire retirar substitua substituir troque trocar " +
   "corrija corrigir escreva escrever mantenha manter apague apagar inclua incluir exclua excluir altere alterar repita repetindo conclusão " +
   "conclua frase linha parágrafo título vírgula ponto entre parênteses aspas também então porém depois antes acima abaixo após primeiro " +
   "primeira segundo segunda terceiro terceira paciente exame hoje ontem").split(" ").map((w) => w.normalize("NFD").replace(/\p{Mn}/gu, "")),
);
/** Uma troca de grafia que PRODUZ negação, ausência ou lado nunca entra sozinha (muda o sentido). */
const SENTIDO = /^(sem|nao|ausente|ausentes|ausencia|negativo|negativa|presente|presenca|direit[oa]s?|esquerd[oa]s?|bilateral)$/;

/** Candidatos (puro, sem rede). */
export function detectCandidates(text: string, categoria: string | null): Candidate[] {
  const out: Candidate[] = [];
  const add = (c: Omit<Candidate, "id">) => {
    if (!out.some((o) => o.start < c.end && c.start < o.end)) out.push({ ...c, id: `q${out.length}` });
  };
  for (const m of text.matchAll(new RegExp(`(?<=^|[.,;]\\s|\\s)((?:c|cê|ce|se|si)(?:\\s+e)?)\\s+(?=(?:${ACHADO})\\b)`, "giu")))
    add({ kind: "negacao", start: m.index!, end: m.index! + m[1]!.length, original: m[1]!, options: ["sem"], legitimate: false });
  for (const m of text.matchAll(new RegExp(`\\b(6|7|100|seis|cem)\\s+(?=(?:${ACHADO})\\b)`, "giu")))
    add({ kind: "negacao", start: m.index!, end: m.index! + m[1]!.length, original: m[1]!, options: ["sem"], legitimate: true });
  for (const m of text.matchAll(/\b(c?r?io|ci|si)(oligo\p{L}+|polid\p{L}+)/giu))
    add({ kind: "negacao", start: m.index!, end: m.index! + m[0].length, original: m[0], options: [`sem ${m[2]}`], legitimate: false });
  for (const m of text.matchAll(/\b(6|seis|centro|sento)\s+e\s+(\d{1,2})\b(?=\s*(?:cm|cent|bat|bpm|mm))/giu))
    add({ kind: "centena", start: m.index!, end: m.index! + m[0].length, original: m[0], options: [String(100 + Number(m[2]))], legitimate: true });
  for (const m of text.matchAll(/\b(b\s*e\s*r\s*a\s*d\s*s|berads|brads|b\s+rads|q\s*rads|qrads|t\s+rads)\b/giu))
    add({ kind: "escala", start: m.index!, end: m.index! + m[0].length, original: m[0], options: /^[bq]/i.test(m[1]!) ? ["BI-RADS", "TI-RADS"] : ["TI-RADS", "BI-RADS"], legitimate: false });
  // lado virou número: "ovários 15 medindo" ← "ovário esquerdo" (captura real de 13/10). Só sugestão.
  const ORGAO: Record<string, [string, "m" | "f"]> = { "ovário": ["ovário", "m"], "ovario": ["ovário", "m"], "ovários": ["ovário", "m"], "ovarios": ["ovário", "m"], rim: ["rim", "m"], rins: ["rim", "m"], lobo: ["lobo", "m"], mama: ["mama", "f"], mamas: ["mama", "f"], axila: ["axila", "f"], "testículo": ["testículo", "m"], testiculo: ["testículo", "m"], joelho: ["joelho", "m"], ombro: ["ombro", "m"], punho: ["punho", "m"], tornozelo: ["tornozelo", "m"] };
  for (const m of text.matchAll(/\b(ov[aá]rios?|rins?|lobo|mamas?|axila|test[ií]culo|joelho|ombro|punho|tornozelo)\s+(\d{1,3})\s+(?=(?:medindo|mede|com|de|apresenta|apresentando|sem)\b)/giu)) {
    const [base, g] = ORGAO[m[1]!.toLowerCase()] ?? [m[1]!, "m"];
    const lados = g === "f" ? ["esquerda", "direita"] : ["esquerdo", "direito"];
    const original = m[0].trimEnd();
    add({ kind: "lado", start: m.index!, end: m.index! + original.length, original, options: lados.map((l) => `${base} ${l}`), legitimate: true });
  }
  // grafia: palavra fora do vocabulário da casa com candidata parecida
  const v = vocab(categoria);
  let n = 0;
  for (const m of text.matchAll(/[\p{L}][\p{L}-]{3,}/gu)) {
    if (n >= MAX_GRAFIA) break;
    const w = m[0], k = chave(w);
    if (v.set.has(k) || PROTEGIDAS.has(k) || /^(direit|esquerd|bilateral|sem$|nao$)/i.test(k)) continue;
    // Privacidade: maiúscula no meio da frase ou palavra depois de "paciente/senhora…" pode ser nome
    // próprio — nunca vira pergunta.
    const antes = text.slice(Math.max(0, m.index! - 24), m.index!);
    const inicioDeFrase = /(^|[.!?:]\s*|\n\s*)$/.test(antes);
    if ((/^\p{Lu}/u.test(w) && !inicioDeFrase) || /\b(paciente|sra?\.?|senhora?|dona|nome|chamad[ao])\s*:?\s*$/i.test(antes)) continue;
    const cands = v.list
      .map((c) => ({ c, s: sim(k, chave(c)) }))
      .filter((x) => x.s >= 0.65 && x.c.length >= 3)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.c);
    if (!cands.length) continue;
    n++;
    add({ kind: "grafia", start: m.index!, end: m.index! + w.length, original: w, options: cands, legitimate: true });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Trecho em volta do candidato, cortado em espaço (não parte CPF/telefone ao meio) e sem identificadores. */
function safeWindow(text: string, c: Candidate): string | null {
  let ws = Math.max(0, c.start - 90), we = Math.min(text.length, c.end + 60);
  while (ws > 0 && !/\s/.test(text[ws - 1]!)) ws--;
  while (we < text.length && !/\s/.test(text[we]!)) we++;
  const pre = scrubIdentifiers(text.slice(ws, c.start));
  const pos = scrubIdentifiers(text.slice(c.end, we));
  // A limpeza do trecho inteiro tem de dar o mesmo que pedaço a pedaço: senão um identificador
  // atravessa o candidato (ex.: o candidato é "Paciente" de "Paciente: Fulana").
  if (scrubIdentifiers(text.slice(ws, we)) !== pre + c.original + pos) return null;
  if (scrubIdentifiers(c.original) !== c.original) return null;
  const window = `${pre}⟦${c.original}⟧${pos}`;
  return hasIdentifierResidue(window) ? null : window;
}

function question(text: string, c: Candidate, exame: string): JevQuestion | null {
  const window = safeWindow(text, c);
  if (!window) return null;
  const criteria: Record<string, string> = { manter: `O médico disse mesmo "${c.original}" — está certo como está.` };
  c.options.forEach((o, k) => (criteria[`o${k}`] = `O médico disse "${o}" e o reconhecimento de voz escreveu "${c.original}".`));
  const hint =
    c.kind === "negacao" ? "Pense se o médico descrevia a AUSÊNCIA do achado ou contava/afirmava o achado."
    : c.kind === "centena" ? "Pense em qual valor é fisiologicamente plausível para essa medida."
    : c.kind === "escala" ? "Qual escala de classificação faz sentido neste exame?"
    : c.kind === "lado" ? "O reconhecimento de voz às vezes troca 'esquerdo/direito' por um número. Pelo resto do ditado (o outro lado já descrito?), qual lado é este?"
    : "Prefira 'manter' quando a palavra transcrita já faz sentido clínico.";
  return {
    type: "choice",
    instructions: `Ditado médico de ${exame}, transcrito por reconhecimento de voz, que erra palavras curtas, números e termos. Trecho: "${window}". O ponto marcado com ⟦ ⟧ é suspeito. ${hint} Escolha o que o médico realmente ditou.`,
    criteria,
  };
}

function automaticFor(c: Candidate, confidence: number, replacement: string): boolean {
  if (c.kind === "centena" || c.kind === "lado" || (c.legitimate && c.kind === "negacao")) return false;
  // grafia: só troca sozinha quando a candidata é quase a mesma palavra ("apoplítea" → "poplítea");
  // longe disso ("microcitos" → "microlitíase") pode ser outro achado — vira sugestão.
  if (c.kind === "grafia") return confidence >= 0.7 && sim(chave(c.original), chave(replacement)) >= 0.75 && !SENTIDO.test(chave(replacement));
  return !c.legitimate && confidence >= 0.8;
}

export type ArbitrateResult = { text: string; suggestions: DitadoSuggestion[]; ms: number; asked: number };

/**
 * O que o servidor faria com o ditado antes da IA (normalizeAsrTranscript com os reparos de número),
 * como trechos trocáveis no texto ORIGINAL — para a tela mostrar o mesmo texto que vai para o laudo.
 * Diferença palavra a palavra; cada trecho alterado vira uma sugestão automática "formato".
 */
export function formatSuggestions(text: string): DitadoSuggestion[] {
  const alvo = normalizeAsrTranscript(text, { repairNumbers: true });
  if (alvo === text) return [];
  const tok = (s: string) => Array.from(s.matchAll(/\S+/g), (m) => ({ w: m[0], ini: m.index!, fim: m.index! + m[0].length }));
  const a = tok(text), b = tok(alvo);
  if (a.length * b.length > 4_000_000) return [];
  const L = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) L[i]![j] = a[i]!.w === b[j]!.w ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: DitadoSuggestion[] = [];
  let i = 0, j = 0, ra: typeof a = [], rb: typeof b = [];
  const flush = () => {
    if (ra.length) {
      const start = ra[0]!.ini, end = ra[ra.length - 1]!.fim;
      out.push({ start, end, original: text.slice(start, end), replacement: rb.map((t) => t.w).join(" "), kind: "formato", confidence: 1, automatic: true });
    }
    ra = []; rb = [];
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i]!.w === b[j]!.w) { flush(); i++; j++; }
    else if (j < b.length && (i >= a.length || L[i]![j + 1]! >= L[i + 1]![j]!)) rb.push(b[j++]!);
    else ra.push(a[i++]!);
  }
  flush();
  return out;
}

/**
 * mode "auto": devolve o texto com as trocas automáticas aplicadas (e todas as sugestões).
 * mode "suggest": não aplica nada; devolve as sugestões para o app mostrar.
 * `ask` injetável para teste.
 */
export async function arbitrate(
  text: string,
  categoria: string | null,
  opts: { mode: "auto" | "suggest"; timeoutMs?: number; ask?: typeof askJev } = { mode: "suggest" },
): Promise<ArbitrateResult> {
  const t0 = Date.now();
  const medidas: DitadoSuggestion[] = suspiciousMeasures(text).map((m) => ({
    start: m.start, end: m.end, original: m.text, replacement: null, kind: "medida", confidence: 1, automatic: false,
  }));
  const cands = detectCandidates(text, categoria);
  const exame = EXAME[categoria ?? ""] ?? "ultrassonografia";
  const qs: Record<string, JevQuestion> = {};
  for (const c of cands) { const q = question(text, c, exame); if (q) qs[c.id] = q; }
  const asked = Object.keys(qs).length;
  const r = asked ? await (opts.ask ?? askJev)({ exame }, qs, { timeoutMs: opts.timeoutMs ?? 1500, tag: "ditado" }) : null;
  const suggestions: DitadoSuggestion[] = [...medidas];
  if (r) {
    for (const c of cands) {
      const a = r.answers[c.id];
      if (!a || a.type !== "choice" || a.choice === "manter") continue;
      const replacement = c.options[Number(a.choice.slice(1))];
      if (replacement === undefined) continue;
      if (c.kind === "grafia" && a.confidence < 0.5) continue;
      suggestions.push({ start: c.start, end: c.end, original: c.original, replacement, kind: c.kind, confidence: a.confidence, automatic: automaticFor(c, a.confidence, replacement) });
    }
  }
  // reparos de formato entram primeiro e vencem qualquer pergunta que caia no mesmo trecho
  // medida suspeita fica intacta e com o aviso (formatar "7.34 0,1" esconderia o problema)
  const formato = formatSuggestions(text).filter((f) => !medidas.some((m) => f.start < m.end && m.start < f.end));
  const final = [...formato, ...suggestions.filter((x) => x.kind === "medida" || !formato.some((f) => f.start < x.end && x.start < f.end))];
  suggestions.length = 0;
  suggestions.push(...final);
  suggestions.sort((a, b) => a.start - b.start);
  let out = text;
  if (opts.mode === "auto")
    for (const s of [...suggestions].sort((a, b) => b.start - a.start))
      if (s.automatic && s.replacement !== null) out = out.slice(0, s.start) + s.replacement + out.slice(s.end);
  return { text: out, suggestions, ms: Date.now() - t0, asked };
}
