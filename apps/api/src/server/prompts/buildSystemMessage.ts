import type {
  RagBlockForPrompt,
  WritingStyleCode,
} from "@laudousg/shared";
import {
  GLOBAL_PROHIBITIONS,
  GLOBAL_RULES_BLOCK,
  buildCoTInstruction,
  DEFAULT_SYSTEM_MESSAGE,
} from "./global";
import { getCategoryContract } from "./contracts";
import { getStyleOverlay } from "./styles";

/**
 * Monta o system message do writer seguindo a ordem do LaudoUSG original
 * (lib/promptBuilder.ts:buildSystemMessage):
 *
 *   1. categoryRules            (contrato da categoria — pode ser null)
 *   2. subspecialtyRules        (futuro — detector em prompts/subspecialty.ts)
 *   3. GLOBAL_RULES_BLOCK
 *   4. styleOverlay             (apenas para DIRETO_OBJETIVO/DETALHADO_PROTOCOLAR)
 *   5. fewShots                 (RAG: kind=exemplo)
 *   6. ragOtherBlocks           (RAG: modelo + regra + frase + conclusao + excecao + comentario_tecnico)
 *   7. GLOBAL_PROHIBITIONS
 *   8. CoT instruction
 *
 * Se não houver categoryRules nem RAG, fallback para DEFAULT_SYSTEM_MESSAGE.
 */
export function buildSystemMessage(args: {
  categoryCode: string;
  categoryLabel: string;
  writingStyleCode: WritingStyleCode;
  ragBlocks: RagBlockForPrompt[];
}): string {
  const contract = getCategoryContract(args.categoryCode);
  const styleOverlay = getStyleOverlay(args.writingStyleCode);

  const fewShots = args.ragBlocks.filter((b) => b.kind === "exemplo");
  const otherBlocks = args.ragBlocks.filter((b) => b.kind !== "exemplo");

  // Fallback minimalista se categoria não tem contract nem RAG
  if (!contract && otherBlocks.length === 0 && fewShots.length === 0) {
    return DEFAULT_SYSTEM_MESSAGE;
  }

  const sections: string[] = [];

  if (contract) sections.push(contract);

  // 2. subspecialty — TODO

  sections.push(GLOBAL_RULES_BLOCK);

  if (styleOverlay) sections.push(styleOverlay);

  if (fewShots.length > 0) {
    sections.push(
      "EXEMPLOS DE LAUDOS (few-shots):\n" +
        fewShots
          .map((b) => `--- ${b.title} ---\n${b.content}`)
          .join("\n\n"),
    );
  }

  if (otherBlocks.length > 0) {
    sections.push(formatRagSection(otherBlocks));
  }

  sections.push(GLOBAL_PROHIBITIONS);
  sections.push(buildCoTInstruction(args.categoryLabel));

  return sections.join("\n\n");
}

function formatRagSection(blocks: RagBlockForPrompt[]): string {
  const byKind = new Map<string, RagBlockForPrompt[]>();
  for (const b of blocks) {
    const list = byKind.get(b.kind) ?? [];
    list.push(b);
    byKind.set(b.kind, list);
  }

  const order = ["modelo", "regra", "frase", "conclusao", "excecao", "comentario_tecnico"];
  const parts: string[] = ["BIBLIOTECA RAG VALIDADA (referência ativa para este caso):"];

  for (const kind of order) {
    const list = byKind.get(kind);
    if (!list || list.length === 0) continue;
    parts.push(`\n## ${kind.toUpperCase()}`);
    for (const b of list) {
      parts.push(`### ${b.title}\n${b.content}`);
    }
  }

  return parts.join("\n");
}
