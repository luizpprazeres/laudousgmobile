/**
 * DET-6 — Aplicador determinístico de OPERAÇÕES sobre o laudo renderizado.
 *
 * Recebe o laudo (string) + uma lista FECHADA de operações tipadas
 * (`ReportOperation`, em @laudousg/shared) e devolve o laudo transformado +
 * um relatório auditável (cada operação aplicou? por quê não?). Função PURA:
 * mesma entrada → mesma saída, sem LLM, sem efeitos colaterais.
 *
 * As operações são aplicadas EM ORDEM, cada uma sobre o resultado da anterior.
 * Operações de conclusão reusam `conclusionUtils` (parse + renumeração) para
 * nunca quebrar a numeração canônica.
 */
import { parseConclusion, renderWithConclusion } from "./conclusionUtils";
import type { ReportOperation } from "@laudousg/shared";

export interface AppliedOperation {
  op: ReportOperation;
  /** A operação efetivamente alterou o laudo? */
  applied: boolean;
  /** Quando não aplicou, por quê (auditoria). */
  reason?: string;
}

export interface ApplyOperationsResult {
  laudo: string;
  results: AppliedOperation[];
}

type OpOutcome = { laudo: string; applied: boolean; reason?: string };

/** Capitaliza a 1ª letra e garante ponto final (item de conclusão canônico). */
function asItem(text: string): string {
  let t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

/** Normaliza para comparação de itens (case/pontuação/espaço-insensível). */
function normItem(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.!?;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Substituição literal de TODAS as ocorrências de `from` por `to`. */
function applyReplacePhrase(
  laudo: string,
  from: string,
  to: string,
): OpOutcome {
  if (!laudo.includes(from)) {
    return { laudo, applied: false, reason: "frase_nao_encontrada" };
  }
  return { laudo: laudo.split(from).join(to), applied: true };
}

/** Acrescenta item à conclusão (1-based; dedup por conteúdo equivalente). */
function applyAddConclusionItem(
  laudo: string,
  text: string,
  position: number | undefined,
): OpOutcome {
  const parsed = parseConclusion(laudo);
  if (!parsed.found) return { laudo, applied: false, reason: "sem_conclusao" };

  const item = asItem(text);
  const target = normItem(item);
  const dup = parsed.items.some((it) => {
    const n = normItem(it);
    return n === target || n.includes(target) || target.includes(n);
  });
  if (dup) return { laudo, applied: false, reason: "ja_presente" };

  const items = [...parsed.items];
  if (position === undefined || position > items.length) {
    items.push(item);
  } else {
    items.splice(Math.max(0, position - 1), 0, item);
  }
  return { laudo: renderWithConclusion(parsed, items), applied: true };
}

/** Remove da conclusão os itens que contêm o trecho `match`. */
function applyRemoveConclusionItem(laudo: string, match: string): OpOutcome {
  const parsed = parseConclusion(laudo);
  if (!parsed.found) return { laudo, applied: false, reason: "sem_conclusao" };

  const needle = normItem(match);
  if (!needle) return { laudo, applied: false, reason: "match_vazio" };
  const kept = parsed.items.filter((it) => !normItem(it).includes(needle));
  if (kept.length === parsed.items.length) {
    return { laudo, applied: false, reason: "nao_encontrado" };
  }
  return { laudo: renderWithConclusion(parsed, kept), applied: true };
}

/** Insere `text` como nova linha antes/depois da 1ª linha que contém `anchor`. */
function applyInsertLine(
  laudo: string,
  anchor: string,
  text: string,
  where: "before" | "after",
): OpOutcome {
  const lines = laudo.split("\n");
  const i = lines.findIndex((l) => l.includes(anchor));
  if (i === -1) return { laudo, applied: false, reason: "ancora_nao_encontrada" };
  const at = where === "before" ? i : i + 1;
  lines.splice(at, 0, text);
  return { laudo: lines.join("\n"), applied: true };
}

function applyOne(laudo: string, op: ReportOperation): OpOutcome {
  switch (op.op) {
    case "replace_phrase":
      return applyReplacePhrase(laudo, op.from, op.to);
    case "add_conclusion_item":
      return applyAddConclusionItem(laudo, op.text, op.position);
    case "remove_conclusion_item":
      return applyRemoveConclusionItem(laudo, op.match);
    case "insert_before":
      return applyInsertLine(laudo, op.anchor, op.text, "before");
    case "insert_after":
      return applyInsertLine(laudo, op.anchor, op.text, "after");
    default: {
      // Exaustividade: se um novo `op` entrar no schema sem handler, o TS acusa.
      const _exhaustive: never = op;
      return { laudo, applied: false, reason: "op_desconhecida" };
    }
  }
}

/** Aplica a lista de operações em ordem, retornando laudo final + auditoria. */
export function applyOperations(
  laudo: string,
  ops: ReportOperation[],
): ApplyOperationsResult {
  let current = laudo;
  const results: AppliedOperation[] = [];
  for (const op of ops) {
    const r = applyOne(current, op);
    current = r.laudo;
    results.push({ op, applied: r.applied, reason: r.reason });
  }
  return { laudo: current, results };
}
