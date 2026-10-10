/**
 * Guard determinístico: METATEXTO do extrator nos campos de texto livre.
 *
 * O renderer cola literalmente no laudo os campos livres da extração (achados
 * adicionais, observações, descrições). Como extrator, o Claude Haiku 5.5 às
 * vezes escreve ali comentários sobre o ditado ou sobre o schema — "Conclusão do
 * médico: …", "conforme conclusão do médico", "não cabem no esquema", "ditado
 * ilegível… conferir com o médico", "(ditado com repetição; confirmar)". O W4
 * mediu 11/67 saídas com isso (gpt-4.1-mini: 0).
 *
 * A regra no prompt (motor `ai/llm.ts`) previne; este guard limpa o que escapar,
 * ANTES do render. Conservador por desenho:
 *  - só mexe em string livre (campo de enum fica intacto);
 *  - rótulo e cláusula de metatexto saem, o conteúdo clínico da frase fica
 *    ("Litíase vesical, conforme conclusão do médico." → "Litíase vesical.");
 *  - frase INTEIRA só sai quando é comentário sobre o ditado/extração
 *    ("Ditado com trechos incompreensíveis…", "Conferir com o médico: …");
 *  - campo que vira vazio vira null quando o schema aceita null.
 */

type Json = Record<string, unknown>;

/** Campos cujo conteúdo É o texto cru do ditado por contrato: só limpeza leve. */
const RAW_TEXT_FIELDS = new Set(["medida_invalida"]);

const LABEL_RE =
  /(^|[.;]\s+)(?:conclus[ãa]o|impress[ãa]o|observa[çc](?:[ãa]o|[õo]es)|notas?|obs\.?|coment[áa]rios?)\s+(?:do|da)\s+(?:m[ée]dic[oa]|ditado)\s*:\s*/gi;

const LABEL_AT_START_RE =
  /^\s*(?:conclus[ãa]o|impress[ãa]o|observa[çc](?:[ãa]o|[õo]es)|notas?|obs\.?|coment[áa]rios?)\s+(?:do|da)\s+(?:m[ée]dic[oa]|ditado)\s*:/i;

/** Cláusulas de metatexto dentro de uma frase com conteúdo clínico. */
const CLAUSES: Array<[RegExp, string]> = [
  // Marca de revisão pedida pela regra comum de extração: sai do laudo e vai ao
  // card de pendências (ver cleanExtractionMetatext → warnings).
  [/\s*\[REVISAR\b[^\]]*\]/gi, ""],
  // parêntese que comenta o ditado / a extração
  [/\s*\([^()]*?(?:ditad|esquema|\benum\b|l[ée]xico|confirmar|conferir|transcri|ileg[ií]vel|incompreens|n[ãa]o identificad|corrigid)[^()]*\)/gi, ""],
  [/,?\s*conforme\s+(?:a\s+|o\s+)?(?:conclus[ãa]o\s+do\s+m[ée]dico|ditado|transcri[çc][ãa]o|solicitado pelo m[ée]dico)/gi, ""],
  [/,?\s*(?:que\s+)?n[ãa]o\s+cabe[m]?\s+(?:em\s+nenhum\s+campo|no\s+(?:esquema|schema))/gi, ""],
  [/,?\s*sem\s+campo\s+(?:pr[óo]prio|espec[íi]fico)(?:\s+no\s+(?:esquema|schema))?/gi, ""],
  [/\s*[—–]\s*(?:conferir|confirmar|verificar)\b[^.;]*/gi, ""],
  // "medidas/volume ditado de X" → "medidas/volume de X"; "margem ditada como regular" → "margem regular"
  [/\b(medidas?|volume|valor(?:es)?|di[âa]metro|dist[âa]ncia)\s+ditad[oa]s?\s+(de|como)\b/gi, "$1 $2"],
  [/\s+ditad[oa]s?\s+como\s+/gi, " "],
  [/\s+ditad[oa]s?(?=\s*[:.])/gi, ""],
];

/** Frase que é comentário sobre o ditado/extração — sai inteira. */
const META_SENTENCE_RE = new RegExp(
  [
    "ileg[ií]ve(?:l|is)",
    "incompreens[ií]ve(?:l|is)",
    "n[ãa]o\\s+(?:foi\\s+|foram\\s+)?(?:extra[íi]d|estruturad|transcrit|convertid)",
    "(?:conferir|confirmar|verificar)\\s+com\\s+o\\s+m[ée]dico",
    "n[ãa]o\\s+identificad[oa]s?\\s+com\\s+seguran[çc]a",
    "fora\\s+do\\s+l[ée]xico",
    "\\benum\\b",
    "\\b(?:no|do|ao|pelo)\\s+(?:esquema|schema)\\b",
    "\\bschema\\b",
    "\\bnull\\b",
    "\\btermo\\s+[\"“']",
    "\\bditado\\s+(?:com|inicia|cont[ée]m|traz|n[ãa]o|sem)\\b",
    "\\btrechos?\\s+(?:incompleto|incompreens|n[ãa]o)",
    "sem\\s+lateralidade\\s+expl[íi]cita",
  ].join("|"),
  "i",
);

/** Trecho removido que é aviso útil ao médico (vai ao card de pendências). */
const REVIEW_RE =
  /\[REVISAR|ileg[ií]ve|incompreens|confer|confirm|n[ãa]o\s+identificad|n[ãa]o\s+(?:foi\s+|foram\s+)?(?:extra[íi]d|estruturad|convertid)|amb[ií]gu|repeti[çc][ãa]o|inconsist/i;

/**
 * Frase com metatexto: se COMEÇA falando do ditado/extração, sai inteira; se
 * começa com conteúdo clínico, fica a parte clínica até o primeiro trecho de
 * metatexto ("Mioma subseroso de 2,3 cm, segunda medida ilegível." → "Mioma
 * subseroso de 2,3 cm."). Dado clínico nunca some em silêncio (A13): a frase
 * original vai ao card de pendências.
 */
function cleanSentence(sentence: string): string {
  if (!META_SENTENCE_RE.test(sentence)) return sentence;
  const end = /[.!?]\s*$/.test(sentence) ? "." : "";
  const body = sentence.replace(/[.!?]\s*$/, "");
  const segments = body.split(/;\s+|\s+[—–]\s+|,\s+/);
  const kept: string[] = [];
  for (const seg of segments) {
    if (META_SENTENCE_RE.test(seg)) break;
    kept.push(seg);
  }
  if (kept.length === 0) return "";
  // Recompõe com o separador original entre os segmentos mantidos.
  const prefix = body.slice(0, body.indexOf(kept[kept.length - 1]!) + kept[kept.length - 1]!.length);
  return `${prefix.trim()}${end}`;
}

function cleanSentences(text: string): string {
  // Frases: termina em . ! ? seguido de espaço e início de frase.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(\d])/);
  return sentences.map(cleanSentence).filter(Boolean).join(" ");
}

function tidy(text: string): string {
  return text
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,;:])(?=[.;])/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s,;:—–-]+/, "")
    .replace(/[\s,;:—–-]+$/, (m) => (m.includes(".") ? "." : ""))
    .trim();
}

/** Limpa uma string livre. `raw` = campo de texto cru por contrato (sem tirar frases). */
export function stripExtractionMetatext(text: string, opts: { raw?: boolean } = {}): string {
  if (opts.raw) {
    // Texto cru por contrato: se o modelo citou o trecho do ditado, o trecho é o valor.
    const quoted = text.match(/["“'‘]([^"”'’]{2,})["”'’]/);
    if (quoted && META_SENTENCE_RE.test(text)) return quoted[1]!.trim();
  }
  const labelAtStart = LABEL_AT_START_RE.test(text);
  let out = text.replace(LABEL_RE, "$1");
  for (const [re, rep] of CLAUSES) out = out.replace(re, rep);
  if (!opts.raw) out = cleanSentences(out);
  out = tidy(out);
  if (out === text.trim()) return text;
  return labelAtStart ? out.charAt(0).toUpperCase() + out.slice(1) : out;
}

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function schemaTypes(node: Json): string[] {
  const t = node.type;
  return Array.isArray(t) ? (t as string[]) : typeof t === "string" ? [t] : [];
}

function variantsOf(node: Json): Json[] {
  const v = (Array.isArray(node.anyOf) ? node.anyOf : Array.isArray(node.oneOf) ? node.oneOf : []) as unknown[];
  return v.filter(isObject);
}

function isFreeString(node: Json): boolean {
  if (node.enum || node.const !== undefined) return false;
  if (schemaTypes(node).includes("string")) return true;
  return variantsOf(node).some((v) => !v.enum && schemaTypes(v).includes("string"));
}

function allowsNull(node: Json): boolean {
  return schemaTypes(node).includes("null") || variantsOf(node).some((v) => schemaTypes(v).includes("null"));
}

/**
 * Percorre a extração guiado pelo schema e limpa toda string livre. Devolve o
 * valor limpo e os trechos alterados (para log/auditoria).
 */
export function cleanExtractionMetatext(
  value: unknown,
  schema: unknown,
): { value: unknown; changed: string[]; warnings: string[] } {
  const changed: string[] = [];
  const warnings: string[] = [];
  const walk = (v: unknown, node: unknown, field: string): unknown => {
    if (!isObject(node)) return v;
    if (typeof v === "string") {
      if (!isFreeString(node)) return v;
      const cleaned = stripExtractionMetatext(v, { raw: RAW_TEXT_FIELDS.has(field) });
      if (cleaned === v) return v;
      changed.push(`${field}: ${v.slice(0, 160)}`);
      // O que o modelo avisava sobre o ditado ("ilegível… conferir") sai do laudo,
      // mas não se perde: vai ao card de pendências (sanity) do médico.
      for (const sentence of v.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/)) {
        if (REVIEW_RE.test(sentence) && !cleaned.includes(sentence.trim())) warnings.push(sentence.trim().slice(0, 240));
      }
      return cleaned === "" && allowsNull(node) ? null : cleaned;
    }
    if (Array.isArray(v)) {
      const items = isObject(node.items) ? node.items : variantsOf(node).find((x) => isObject(x.items))?.items;
      if (!isObject(items)) return v;
      return v.map((x) => walk(x, items, field)).filter((x) => !(typeof x === "string" && x === ""));
    }
    if (isObject(v)) {
      const objectNode = isObject(node.properties) ? node : variantsOf(node).find((x) => isObject(x.properties));
      const props = objectNode?.properties as Json | undefined;
      if (!props) return v;
      const out: Json = {};
      for (const [k, x] of Object.entries(v)) out[k] = k in props ? walk(x, props[k], k) : x;
      return out;
    }
    return v;
  };
  return { value: walk(value, schema, ""), changed, warnings };
}
