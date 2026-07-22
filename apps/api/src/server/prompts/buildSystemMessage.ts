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
import { toObjectiveHeaders } from "./contracts/objective";
import { getStyleOverlay } from "./styles";
import { LIVRE_SYSTEM_PROMPT } from "../pipeline/livreSystemPrompt";

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
 *
 * INVARIANTE DET-1 (prompt caching): esta montagem é uma função PURA dos
 * inputs e toda a ordem é fixa. Para categorias no bundle determinístico
 * (bundleLoader.ts), os blocos chegam em ordem total estável (kind →
 * priority DESC → id), logo o system message INTEIRO é byte-idêntico entre
 * requests da mesma (categoria, estilo, variante de modelo) — o dado
 * variável (ditado/achados) vai SEMPRE no user message, depois do prefixo.
 * Não introduzir aqui nada não-determinístico (timestamps, ordem de Map não
 * ordenada, etc.) sem revisar o impacto no cached_tokens.
 */
export function buildSystemMessage(args: {
  categoryCode: string;
  categoryLabel: string;
  writingStyleCode: WritingStyleCode;
  ragBlocks: RagBlockForPrompt[];
}): string {
  if (args.categoryCode === "LIVRE" || args.categoryCode === "TESTE") {
    return LIVRE_SYSTEM_PROMPT;
  }

  const contract = getCategoryContract(
    args.categoryCode,
    args.writingStyleCode,
  );
  const styleOverlay = getStyleOverlay(args.writingStyleCode);
  const formatSection =
    args.writingStyleCode === "OBJETIVO" ? toObjectiveHeaders : (text: string) => text;

  // No estilo OBJETIVO, os blocos RAG (templates/modelos curados no DB) ainda
  // trazem cabeçalhos clássicos (COMENTÁRIOS / OS SEGUINTES ASPECTOS / CONCLUSÃO).
  // Converte-os para TÉCNICA / ACHADOS / IMPRESSÃO ANTES de injetar — senão o LLM
  // copia o cabeçalho clássico do template e ignora o overlay (ex.: DOPPLER_VENOSO
  // saindo com "CONCLUSÃO:" em vez de "IMPRESSÃO:").
  const ragBlocks =
    args.writingStyleCode === "OBJETIVO"
      ? args.ragBlocks.map((b) => ({ ...b, content: toObjectiveHeaders(b.content) }))
      : args.ragBlocks;

  const fewShots = ragBlocks.filter((b) => b.kind === "exemplo");
  const otherBlocks = ragBlocks.filter((b) => b.kind !== "exemplo");

  // Fallback minimalista se categoria não tem contract, RAG nem overlay
  if (
    !contract &&
    otherBlocks.length === 0 &&
    fewShots.length === 0 &&
    !styleOverlay
  ) {
    return DEFAULT_SYSTEM_MESSAGE;
  }

  const sections: string[] = [];

  sections.push(formatSection(contract ?? DEFAULT_SYSTEM_MESSAGE));

  // 2. subspecialty — TODO

  sections.push(formatSection(GLOBAL_RULES_BLOCK));

  if (styleOverlay) sections.push(styleOverlay);

  // Fix codex MÉDIO #5: blocos RAG normativos (modelo/regra/frase/conclusao/
  // excecao/comentario_tecnico) entram ANTES dos few-shots. Few-shots têm
  // peso menor — vêm depois com aviso explícito de não copiar fatos clínicos.
  if (otherBlocks.length > 0) {
    sections.push(formatRagSection(otherBlocks));
  }

  if (fewShots.length > 0) {
    sections.push(
      "EXEMPLOS DE LAUDOS (few-shots — APENAS referência de ESTILO, FORMATO e ESTRUTURA).\n" +
        "REGRAS ABSOLUTAS sobre estes exemplos:\n" +
        "- NUNCA copie diagnóstico, medidas, lateralidade, conclusão, datas, percentis ou QUALQUER dado clínico dos exemplos.\n" +
        "- NUNCA mencione achados que estejam APENAS nos exemplos e não estejam nos ACHADOS ESTRUTURADOS do médico.\n" +
        "- Use só para calibrar tom, ordem de seções, vocabulário e nível de detalhe.\n" +
        "- Os dados clínicos vêm EXCLUSIVAMENTE da seção ACHADOS ESTRUTURADOS no user message.\n\n" +
        fewShots
          .map((b) => `--- ${b.title} ---\n${b.content}`)
          .join("\n\n"),
    );
  }

  sections.push(formatSection(GLOBAL_PROHIBITIONS));
  sections.push(formatSection(buildCoTInstruction(args.categoryLabel)));

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
