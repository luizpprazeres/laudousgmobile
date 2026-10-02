/**
 * Detector contextual do TÍTULO "abdome/abdômen total com Doppler" no ditado.
 *
 * Só identifica o exame atual. Rejeita a menção quando ela vem negada
 * ("não foi realizado abdome total com Doppler", "abdome total com Doppler não
 * realizado") ou quando aponta para outro exame ("exame anterior de abdome total
 * com Doppler", "comparado ao abdome total com Doppler", "abdome total com
 * Doppler prévio"). Basta UMA menção afirmativa para identificar o exame.
 *
 * Assimetria deliberada: uma falsa detecção leva ao contrato estruturado, que
 * bloqueia sem dados mínimos; uma falsa rejeição levaria ao writer comum. Por
 * isso só pistas fortes e próximas do título rejeitam, e vírgula/ponto isolam a
 * pista anterior ("Em comparação com o exame anterior, abdome total com Doppler").
 */

/** Minúsculas sem diacríticos: "abdômen" e "abdómen" viram "abdomen". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const EXAM_TITLE =
  /\babdom(?:e|en)[_\s]+total[_\s]+(?:(?:com|c\/)\s*(?:(?:o|estudo|mapeamento)\s+)?)?doppler\b/g;

/** Fronteira de oração para o contexto ANTES do título. */
const BEFORE_BOUNDARY = /[.;!?\n,]/;
/** Fronteira de frase para o contexto DEPOIS do título (vírgula não encerra). */
const AFTER_BOUNDARY = /[.;!?\n]/;

const NEGATION_BEFORE = /\b(?:nao|nem|sem|exceto|salvo|cancelad[oa]s?|suspens[oa]s?|dispensad[oa]s?)\b/;
const PRIOR_BEFORE =
  /\b(?:anterior(?:es|mente)?|previ[oa]s?|ultim[oa]s?|antig[oa]s?|pregress[oa]s?|extern[oa]s?|outro\s+servico|compara(?:do|da|dos|das|cao|ndo|r|tivamente)\s+(?:com|a|ao|aos|as)|em\s+relacao\s+(?:a|ao|aos|as)|traz|trouxe|trazid[oa]|historico\s+de)\b/;

const PERFORMED = "(?:realizad|solicitad|feit|executad|efetuad|indicad|autorizad|possivel|disponivel)";
const NEGATION_AFTER = new RegExp(
  `^(?:nao\\s+(?:(?:foi|e|sera|seria|pode\\s+ser|esta|estava)\\s+)?${PERFORMED}|nao$|cancelad|suspens|dispensad|adiad|contraindicad)`,
);
const PRIOR_AFTER =
  /^(?:anterior(?:es)?\b|previ[oa]s?\b|antig[oa]s?\b|pregress[oa]s?\b|extern[oa]s?\b|(?:de|do|em)\s+outro\s+servico\b|realizad[oa]s?\s+ha\b|ha\s+\d+\s+(?:dias?|semanas?|mes|meses|anos?)\b|d[oe]\s+ano\s+passado\b)/;

const NEGATION_WINDOW_TOKENS = 4;
const PRIOR_WINDOW_TOKENS = 6;

function lastTokens(text: string, count: number): string {
  return text.split(/\s+/).filter(Boolean).slice(-count).join(" ");
}

function clauseBefore(text: string, index: number): string {
  const before = text.slice(0, index);
  let start = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    if (BEFORE_BOUNDARY.test(before[i]!)) {
      start = i + 1;
      break;
    }
  }
  return before.slice(start);
}

function phraseAfter(text: string, index: number): string {
  const after = text.slice(index);
  const end = after.search(AFTER_BOUNDARY);
  // Vírgula, dois-pontos, parênteses e travessões viram espaço: "Doppler (anterior)".
  return (end === -1 ? after : after.slice(0, end)).replace(/[,:()[\]\-–—"']/g, " ").replace(/\s+/g, " ").trim();
}

export type AbdomenDopplerMention = {
  text: string;
  accepted: boolean;
  reason?: "negated" | "prior_exam";
};

/** Todas as menções ao título, com o motivo de rejeição quando houver. */
export function classifyAbdomenDopplerMentions(rawInput: string): AbdomenDopplerMention[] {
  // Os índices abaixo são sempre usados sobre o texto já dobrado.
  const text = fold(rawInput);
  const mentions: AbdomenDopplerMention[] = [];
  for (const match of text.matchAll(EXAM_TITLE)) {
    const start = match.index ?? 0;
    const before = clauseBefore(text, start);
    const after = phraseAfter(text, start + match[0].length);
    let reason: AbdomenDopplerMention["reason"];
    if (NEGATION_BEFORE.test(lastTokens(before, NEGATION_WINDOW_TOKENS)) || NEGATION_AFTER.test(after)) reason = "negated";
    else if (PRIOR_BEFORE.test(lastTokens(before, PRIOR_WINDOW_TOKENS)) || PRIOR_AFTER.test(after)) reason = "prior_exam";
    mentions.push(reason ? { text: match[0], accepted: false, reason } : { text: match[0], accepted: true });
  }
  return mentions;
}

/** true quando o ditado nomeia afirmativamente o exame atual de abdome total com Doppler. */
export function mentionsCurrentAbdomenTotalDoppler(rawInput: string): boolean {
  return classifyAbdomenDopplerMentions(rawInput).some((mention) => mention.accepted);
}
