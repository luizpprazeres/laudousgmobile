/**
 * DET-6 — Ponte determinística: comandos do médico → OPERAÇÕES tipadas.
 *
 * Primeiro passo de "aposentar o commandGuard": em vez de mutar a conclusão
 * com lógica ad-hoc de splice, derivamos `ReportOperation[]` das diretivas
 * explícitas do ditado (reusando o detector regex já validado do commandGuard)
 * e aplicamos pelo aplicador puro `applyOperations`. Resultado: o mesmo efeito
 * de conclusão, mas via o conjunto FECHADO e auditável de operações do DET-6.
 *
 * Drop-in de `applyCommandGuard(laudo, rawInput)` — mesma assinatura. Plugado
 * atrás da flag `COMMAND_OPERATIONS` (default OFF); enquanto desligada, o
 * caminho legado (commandGuard) segue intocado.
 *
 * Semântica de dedup: `applyOperations` é mais conservador que o `alreadyPresent`
 * (overlap de 60%) do commandGuard — só evita item idêntico/contido. É de
 * propósito: previsibilidade > heurística. Quando ligarmos a flag, a diferença
 * é avaliada por golden + review (dex1/dex2).
 */
import { extractConclusionCommands } from "./commandGuard";
import { applyOperations, type ApplyOperationsResult } from "./operations";
import { normalizeAsrCommands } from "./asrNormalize";
import type { ReportOperation } from "@laudousg/shared";

/**
 * Converte as diretivas de conclusão do ditado em operações `add_conclusion_item`.
 * `insertAt` (0-based, do commandGuard) → `position` (1-based) = insertAt + 1.
 * (Mantido para compat; a extração rica é `extractCommandOperations`.)
 */
export function conclusionCommandsToOperations(
  rawInput: string,
): ReportOperation[] {
  return extractConclusionCommands(rawInput).map((c) => ({
    op: "add_conclusion_item" as const,
    text: c.text,
    ...(c.insertAt !== undefined ? { position: c.insertAt + 1 } : {}),
  }));
}

/**
 * Meta-comandos que NÃO viram item de conclusão: a correlação de IG pela US
 * precoce/DUM já é montada deterministicamente pelo renderer (regra Domingos), e
 * referências a "item N" são posicionais, não conteúdo. Dropar evita o item-lixo
 * "Com a ultrassonografia precoce." (caso b8f67ca5).
 */
const META_DROP =
  /com\s+a\s+ultrassonografia\s+precoce|correlacion\w*\s+com\s+(?:a\s+|o\s+)?(?:ultrassonograf|us\s+precoce|\bdum\b|data\s+da\s+[úu]ltima|idade\s+gestacional|\big\b)|item\s+\d+\s+da\s+conclus|no\s+item\s+\d+/i;

/**
 * "acrescente nos/após comentários (que) X" → texto X para a seção COMENTÁRIOS.
 * Cobre "nos comentários", "após (os) comentários" (caso 43657c4b) e "ao final dos".
 */
export const COMMENT_RE =
  /(?:acrescent\w+|adicion\w+|coloqu\w+|inclu\w+)\s+(?:(?:n[oa]s?|ap[óo]s(?:\s+os)?|ao\s+final\s+d[oa]s)\s+)?coment[áa]rios?\s*(?:,?\s*que\s+)?[:\s-]*([^.;\n]+)/gi;

/** "no lugar d(e|o|a) X (escreva|coloque|ponha)[,:] Y" → replace_phrase literal. */
export const REPLACE_RE =
  /no\s+lugar\s+d[eoa]\s+(.+?)\s+(?:escrev\w+|coloqu\w+|ponh\w+)[\s,:]+([^.;\n]+)/gi;

/**
 * Extrai operações tipadas do ditado (caminho DET-6, flag COMMAND_OPERATIONS):
 * roteia para COMENTÁRIOS, gera substituição literal, dropa meta-comandos e só
 * então deriva itens de conclusão — nunca imprime o comando literal.
 */
export function extractCommandOperations(rawInput: string): ReportOperation[] {
  const text = normalizeAsrCommands(rawInput);
  const ops: ReportOperation[] = [];
  // `cleaned`: o que sobra para o extrator de conclusão, sem os trechos já
  // consumidos por comentário/substituição (evita captura dupla).
  let cleaned = text;

  for (const m of text.matchAll(COMMENT_RE)) {
    const t = m[1]?.trim();
    if (t) {
      ops.push({ op: "add_comment", text: t, trecho_original: m[0] });
      cleaned = cleaned.replace(m[0], " ");
    }
  }
  for (const m of cleaned.matchAll(REPLACE_RE)) {
    const from = m[1]?.trim();
    const to = m[2]?.trim();
    if (from && to) {
      ops.push({ op: "replace_phrase", from, to, trecho_original: m[0] });
      cleaned = cleaned.replace(m[0], " ");
    }
  }
  for (const c of extractConclusionCommands(cleaned)) {
    if (META_DROP.test(c.text)) continue;
    ops.push({
      op: "add_conclusion_item",
      text: c.text,
      ...(c.insertAt !== undefined ? { position: c.insertAt + 1 } : {}),
    });
  }
  return ops;
}

/** Versão auditável: devolve laudo + relatório de operações aplicadas. */
export function applyCommandOperationsWithAudit(
  laudo: string,
  rawInput: string,
): ApplyOperationsResult {
  const ops = extractCommandOperations(rawInput);
  if (ops.length === 0) return { laudo, results: [] };
  return applyOperations(laudo, ops);
}

/** Drop-in de `applyCommandGuard`: aplica as operações e devolve só o laudo. */
export function applyCommandOperations(laudo: string, rawInput: string): string {
  return applyCommandOperationsWithAudit(laudo, rawInput).laudo;
}
