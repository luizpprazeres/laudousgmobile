/**
 * Guard determinístico de COMANDOS do médico para a CONCLUSÃO.
 *
 * Dor recorrente do dono: "peço algo nos achados e ele simplesmente ignora".
 * O writer (LLM) às vezes não obedece instruções diretas como "na conclusão,
 * recomendar controle em 6 meses". Reforço de prompt não vence → determinístico:
 * detectamos a diretiva no ditado e GARANTIMOS que ela entre na conclusão (se
 * o LLM já tiver incluído algo equivalente, não duplicamos).
 *
 * Escopo (conservador, alta precisão): diretivas EXPLÍCITAS para a conclusão —
 * "na conclusão[,] X", "recomendar/recomende X", "acrescente/adicione X". Não
 * tenta interpretar comandos vagos; foca no que o médico pede de forma clara.
 */
import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

const STOPWORDS = new Set([
  "para","pela","pelo","com","sem","que","uma","umas","uns","dos","das","nas",
  "nos","ao","aos","de","da","do","em","na","no","e","ou","a","o","os","as",
  "se","na","conclusao","conclusão","seguir","exame",
]);

/** Capitaliza a 1ª letra e garante ponto final. */
function asItem(text: string): string {
  let t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

/** Normaliza o conteúdo de um comando numa frase de conclusão. */
function normalizeCommand(content: string): string {
  let c = content.trim().replace(/^[,:;\s]+/, "");
  // Remove fillers de abertura ("a frase:", "o texto:", "o seguinte:", "que").
  c = c
    .replace(
      /^(?:a\s+(?:seguinte\s+)?frase|o\s+(?:seguinte\s+)?texto|o\s+seguinte|a\s+seguinte|o\s+item)\s*[:,]?\s*/i,
      "",
    )
    .replace(/^que\s+/i, "")
    .trim();
  // "recomendar/recomende/recomendo X" → "Recomenda-se X."
  const rec = c.match(/^recomend(?:ar|e|o|a-se|amos)?\s+(.+)$/i);
  if (rec?.[1]) return asItem(`Recomenda-se ${rec[1]}`);
  // Imperativos (2ª pessoa) → infinitivo, estilo laudo (review dex2 boletim):
  // "correlacione com X" → "Correlacionar com X."
  const IMP: [RegExp, string][] = [
    [/^correlacion(?:e|ar|a-se|amos)?\b/i, "Correlacionar"],
    [/^compar(?:e|ar|amos)?\b/i, "Comparar"],
    [/^consider(?:e|ar|amos)?\b/i, "Considerar"],
    [/^avali(?:e|ar|amos)?\b/i, "Avaliar"],
    [/^(?:mantenh(?:a|amos)|manter)\b/i, "Manter"],
    [/^repit(?:a|amos)?\b|^repetir\b/i, "Repetir"],
  ];
  for (const [re, inf] of IMP) {
    const m = c.match(re);
    if (m) return asItem(`${inf} ${c.slice(m[0].length).trim()}`.trim());
  }
  return asItem(c);
}

/**
 * Heurística anti-vazamento (boletim 2026-06-19): em ASR SEM pontuação, a captura
 * lazy `(.+?)(?:[.;\n]|$)` engole o restante do ditado (medidas, datas, biometria)
 * e isso ia parar na conclusão como item. Rejeita conteúdo que claramente é
 * transcrição crua, NÃO uma diretiva curta de conclusão.
 */
function looksLikeTranscription(text: string): boolean {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean).length;
  // Captura longa = transcrição engolida (comandos legítimos são curtos).
  if (words > 18 || t.length > 160) return true;
  // Assinaturas FORTES de transcrição crua (independem de tamanho). Não basta uma
  // medida isolada — um comando legítimo pode citar "nódulo de 2 cm" ou "20 semanas".
  if (/\d+\s+(?:d[eo]|do)\s+(?:do\s+)?\d+\s+de\s+\d{4}/.test(t)) return true; // data ditada completa
  if (/ultrassonografia\s+realizada|\bhoje com\b|\brim (?:direito|esquerdo)\s+medindo|bols[ãa]o\s+vertical\s+mede/.test(t)) return true;
  // Múltiplas medidas (biometria crua) — 2+ tokens "X por Y", "X x Y", "X cm".
  const measures = (t.match(/\b\d+[.,]?\d*\s*(?:por|x|×|cm|mm|cent[íi]metr)\b/g) ?? []).length;
  if (measures >= 2) return true;
  return false;
}

export interface ConclusionCommand {
  /** Frase já normalizada pra item de conclusão. */
  text: string;
  /** Índice (0-based) onde inserir; undefined = ao final. */
  insertAt?: number;
}

/**
 * Detecta posição alvo no início do conteúdo do comando.
 *  - "após/depois (do) item N" → novo vira item N+1 → insertAt = N (0-based).
 *  - "antes (do) item N" / "no item N" / "como item N" → vira item N → insertAt = N-1.
 */
function parsePosition(content: string): { insertAt?: number; rest: string } {
  let m = content.match(
    /^(?:ap[óo]s|depois)\s+(?:d[eo]\s+)?(?:o\s+)?item\s+(\d+)\b[,:.\s]*(.*)$/i,
  );
  if (m?.[1]) return { insertAt: parseInt(m[1], 10), rest: m[2] ?? "" };
  m = content.match(
    /^(?:antes\s+(?:d[eo]\s+)?(?:o\s+)?item|n[oa]\s+item|como\s+item)\s+(\d+)\b[,:.\s]*(.*)$/i,
  );
  if (m?.[1]) return { insertAt: Math.max(0, parseInt(m[1], 10) - 1), rest: m[2] ?? "" };
  return { rest: content };
}

/** Extrai diretivas explícitas para a conclusão a partir do ditado. */
export function extractConclusionCommands(rawInput: string): ConclusionCommand[] {
  const out: ConclusionCommand[] = [];
  const seen = new Set<string>();
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const { insertAt, rest } = parsePosition(raw.trim());
    const text = normalizeCommand(rest);
    // Rejeita transcrição crua engolida (boletim P0 #1) — só diretivas reais entram.
    if (text.length > 4 && !looksLikeTranscription(text) && !seen.has(text)) {
      seen.add(text);
      out.push({ text, insertAt });
    }
  };

  // "na conclusão[,:] X" (até fim de frase) — captura a diretiva inteira.
  for (const m of rawInput.matchAll(
    /\bna\s+conclus[ãa]o[,:\s]+(.+?)(?:[.;\n]|$)/gi,
  )) {
    push(m[1]);
  }
  // "acrescente/adicione/inclua/coloque [na conclusão] X"
  for (const m of rawInput.matchAll(
    /\b(?:acrescent\w+|adicion\w+|inclu\w+|coloc\w+)\s+(?:na\s+conclus[ãa]o[,:\s]+)?(.+?)(?:[.;\n]|$)/gi,
  )) {
    // Só conta como comando de CONCLUSÃO. Pula quando o alvo é outra seção:
    // "após o título acrescente X", "no cabeçalho", "nos achados", "no corpo"
    // (a menos que "na conclusão" esteja explícito no próprio comando).
    const explicitConclusao = /na\s+conclus[ãa]o/i.test(m[0]);
    if (!explicitConclusao) {
      // Alvo é OUTRA seção (título, cabeçalho, FINAL DOS ACHADOS / corpo, antes
      // da conclusão)? Então não é comando de conclusão — deixa o LLM posicionar.
      const before = rawInput.slice(Math.max(0, (m.index ?? 0) - 50), m.index ?? 0);
      if (
        /t[íi]tulo|cabe[çc]alho|coment[áa]rio|t[ée]cnica|(?:final|fim)\s+dos\s+achados|antes\s+d[ao]\s+conclus|no\s+corpo/i.test(
          before,
        )
      )
        continue;
      if (
        /^\s*(?:n[oa]s?\s+achados|n[oa]s?\s+coment[áa]rios?|n[oa]\s+t[ée]cnica|n[oa]\s+corpo\b|antes\s+d[ao]\s+conclus|n[oa]\s+(?:final|fim)\s+dos\s+achados)/i.test(
          m[1] ?? "",
        )
      )
        continue;
    }
    push(m[1]);
  }
  // "recomendar/recomende X" (recomendação → conclusão), se não já capturado.
  for (const m of rawInput.matchAll(/\brecomend(?:ar|e|o)\s+(.+?)(?:[.;\n]|$)/gi)) {
    push(`recomendar ${m[1]}`);
  }

  return out;
}

/** O item já está refletido na conclusão? (sobreposição de termos significativos) */
function alreadyPresent(item: string, conclusion: string): boolean {
  const words = (item.toLowerCase().match(/\p{L}{4,}/gu) ?? []).filter(
    (w) => !STOPWORDS.has(w),
  );
  if (words.length === 0) return true; // nada significativo → não arrisca duplicar
  const hay = conclusion.toLowerCase();
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length >= 0.6;
}

/**
 * Garante que as diretivas de conclusão do médico entrem no laudo. Acrescenta
 * como itens numerados ao final da conclusão os comandos ainda ausentes.
 */
export function applyCommandGuard(laudo: string, rawInput: string): string {
  const commands = extractConclusionCommands(rawInput);
  if (commands.length === 0) return laudo;

  const parsed = parseConclusion(laudo);
  if (!parsed.found) return laudo;

  const conclusionText = parsed.items.join(" \n ");
  const missing = commands.filter(
    (cmd) => !alreadyPresent(cmd.text, conclusionText),
  );
  if (missing.length === 0) return laudo;

  const items = [...parsed.items];
  // Posicionados primeiro, em ordem DECRESCENTE de índice (pra um splice não
  // deslocar o alvo do próximo). A renumeração final empurra os demais.
  const positioned = missing
    .filter((c) => c.insertAt !== undefined)
    .sort((a, b) => (b.insertAt ?? 0) - (a.insertAt ?? 0));
  for (const c of positioned) {
    items.splice(Math.min(c.insertAt as number, items.length), 0, c.text);
  }
  // Sem posição → ao final.
  for (const c of missing.filter((c) => c.insertAt === undefined)) {
    items.push(c.text);
  }

  return renderWithConclusion(parsed, items);
}
