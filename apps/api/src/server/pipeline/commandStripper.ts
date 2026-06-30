/**
 * DET-6 FASE 3 — Pré-geração: FONTE ÚNICA de comandos (tira + executa pela MESMA
 * régua).
 *
 * Problema (validação E2E): o "tirador" (strip) e o "executor" (fase 1) olhavam o
 * ditado de formas diferentes — o executor guloso re-introduzia o comando E pedaços
 * do ditado cru como itens de conclusão (mama 88543eea: itens-lixo 7 e 8). Strip ≠
 * aplicação.
 *
 * Solução: `parseCommandsPregen` identifica os comandos UMA vez e devolve {clean,
 * ops}: `clean` (sem os comandos) vai para a geração; `ops` (exatamente os comandos
 * identificados) são aplicados depois. Por construção o que foi tirado é o que é
 * executado — o executor não "inventa" comando que o tirador não viu.
 *
 * MUITO CONSERVADOR (review dex1): só comandos de marcador inequívoco. O ambíguo
 * ("na conclusão pode colocar X" = reclassificar/achado-no-corpo) é TIRADO mas não
 * vira op determinística — fica para a fase 2 (LLM) decidir o lugar certo.
 *
 * Flag: `COMMAND_PREGEN` (default OFF).
 */
import { normalizeAsrCommands } from "./asrNormalize";
import { COMMENT_STRIP_RE, REPLACE_RE } from "./commandOperations";
import type { ReportOperation } from "@laudousg/shared";

/** "na conclusão" + VERBO de adição claro + conteúdo → add_conclusion_item. */
const NA_CONCLUSAO_ADD_RE =
  /\bna\s+conclus[ãa]o\s*[,;:]?\s*(recomend\w+|acrescent\w+|adicion\w+|inclu\w+|escrev\w+)\s+([^.;\n]+)/gi;
/** "na conclusão" + colocar/substituir = AMBÍGUO → só tira (fase 2 decide). */
const NA_CONCLUSAO_AMBIG_RE =
  /\bna\s+conclus[ãa]o\s*[,;:]?\s*(?:pode\s+colocar|coloqu\w+|substitu\w+)[^.;\n]*/gi;

export interface PregenResult {
  clean: string;
  ops: ReportOperation[];
  stripped: string[];
}

/**
 * Identifica os comandos de alta confiança UMA vez. Devolve o ditado SEM eles
 * (`clean`, p/ a geração) + os `ops` a aplicar depois (mesma régua) + os spans
 * removidos (auditoria). `typedEngine` (COMMAND_OPERATIONS||COMMAND_INTERPRETER):
 * comentário/substituição só entram quando há aplicador tipado ligado.
 */
export function parseCommandsPregen(
  rawInput: string,
  opts?: { typedEngine?: boolean },
): PregenResult {
  let clean = normalizeAsrCommands(rawInput);
  const ops: ReportOperation[] = [];
  const stripped: string[] = [];
  const consume = (
    re: RegExp,
    makeOp: (m: string[]) => ReportOperation | null,
  ): void => {
    clean = clean.replace(new RegExp(re.source, "gi"), (match: string, ...rest: unknown[]) => {
      const groups = rest.slice(0, -2) as string[]; // tira offset + string
      const t = match.trim();
      if (t) stripped.push(t);
      const op = makeOp([match, ...groups]);
      if (op) ops.push(op);
      return " ";
    });
  };

  // "na conclusão, recomendar/acrescente/... X" → item de conclusão (verbo claro).
  consume(NA_CONCLUSAO_ADD_RE, (m) => {
    const verbo = (m[1] ?? "").toLowerCase();
    const conteudo = (m[2] ?? "").trim();
    if (!conteudo) return null;
    const text = /^recomend/.test(verbo) ? `Recomenda-se ${conteudo}` : conteudo;
    return { op: "add_conclusion_item", text };
  });
  // "na conclusão, pode colocar X" (ambíguo) → só tira; fase 2 decide o lugar.
  consume(NA_CONCLUSAO_AMBIG_RE, () => null);

  if (opts?.typedEngine) {
    consume(COMMENT_STRIP_RE, (m) =>
      m[1]?.trim() ? { op: "add_comment", text: m[1].trim() } : null,
    );
    consume(REPLACE_RE, (m) => {
      const from = m[1]?.trim();
      const to = m[2]?.trim();
      if (!from || !to) return null;
      // "no lugar DA FRASE DO X" = referência SEMÂNTICA: não dá p/ ancorar literal
      // no draft. Garante o conteúdo Y na conclusão (add determinístico) — se a
      // frase X existir, o médico revisa; perder o comando é pior que duplicar.
      if (/^(?:a\s+)?frase\b/i.test(from)) return { op: "add_conclusion_item", text: to };
      return { op: "replace_phrase", from, to };
    });
  }

  clean = clean
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.;,])/g, "$1")
    .replace(/^[\s.,;]+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, ops, stripped };
}

/** Compat: só o texto limpo + spans (o golden e usos que não precisam dos ops). */
export function stripCommandSpans(
  rawInput: string,
  opts?: { typedEngine?: boolean },
): { clean: string; stripped: string[] } {
  const { clean, stripped } = parseCommandsPregen(rawInput, opts);
  return { clean, stripped };
}
