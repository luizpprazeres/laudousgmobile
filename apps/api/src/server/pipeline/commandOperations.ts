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
import type { ReportOperation } from "@laudousg/shared";

/**
 * Converte as diretivas de conclusão do ditado em operações `add_conclusion_item`.
 * `insertAt` (0-based, do commandGuard) → `position` (1-based) = insertAt + 1.
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

/** Versão auditável: devolve laudo + relatório de operações aplicadas. */
export function applyCommandOperationsWithAudit(
  laudo: string,
  rawInput: string,
): ApplyOperationsResult {
  const ops = conclusionCommandsToOperations(rawInput);
  if (ops.length === 0) return { laudo, results: [] };
  return applyOperations(laudo, ops);
}

/** Drop-in de `applyCommandGuard`: aplica as operações e devolve só o laudo. */
export function applyCommandOperations(laudo: string, rawInput: string): string {
  return applyCommandOperationsWithAudit(laudo, rawInput).laudo;
}
