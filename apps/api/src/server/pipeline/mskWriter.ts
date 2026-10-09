/**
 * MSK `writer_guarded` (piloto — arquitetura de 2 modos, 2026-07-02).
 *
 * Categoria ABERTA (MSK) escrita pelo LLM em vez do renderer determinístico: o modelo
 * ENTENDE o ditado em linguagem natural (multi-segmento, garble, comandos misturados),
 * guiado pelo ROTEIRO DA CASA no prompt (cobertura exata, sem inventar estrutura).
 *
 * Prova empírica (docs/plano-arquitetura-3-modos-2026-07-02.md §11): esta chamada é
 * TÃO rápida quanto a extração do renderer (~5s, 1º token ~1,2s) — o "14s" era modelo
 * grande + RAG pesado + multi-estágio, não o writer em si.
 *
 * Flag `MSK_WRITER` (default OFF). Fact-audit + rerun entram numa fatia seguinte.
 */
import { dedicatedWriterTarget, llmTextStream } from "../ai/llm";
import { cleanWriterOutput, WRITER_OUTPUT_RULE } from "./writerOutputGuard";
import { env } from "../env";
import { buildMskWriterSystemMessage } from "../renderer/categories/MUSCULOESQUELETICO";
import { MSK_FEWSHOTS } from "../renderer/categories/mskFewshots";
import { auditMskFacts, auditRevisarNote, type MskAudit } from "./mskWriterAudit";
import { normalizeMskWriterFormat } from "./mskWriterFormat";
import type { RagBlockForPrompt } from "@laudousg/shared";

export type MskWriterResult = {
  fullText: string;
  latencyMs: number;
  ttftMs: number;
  model: string;
  outputTokens?: number;
  /** Fact-audit determinístico (medida/lado/estrutura) — observabilidade. */
  audit: MskAudit;
};

/** Streama o laudo MSK escrito pelo LLM. Yields deltas; retorna o texto + métricas. */
export async function* runMskWriterStream(args: {
  rawInput: string;
  /** Biblioteca determinística já carregada por categoria+estilo no route. */
  ragBlocks?: RagBlockForPrompt[];
  signal?: AbortSignal;
}): AsyncGenerator<string, MskWriterResult, void> {
  const target = dedicatedWriterTarget(env().MSK_WRITER_MODEL, "msk-writer");
  const model = target.model;
  const t0 = Date.now();
  let ttftMs = 0;
  let full = "";

  // Few-shots dos laudos REAIS assinados do médico (estilo da casa por exemplo) +
  // regras no system. Prefixo estável → cacheável pelo provedor.
  const fewshotMsgs = MSK_FEWSHOTS.flatMap((f) => [
    { role: "user" as const, content: `Ditado do médico:\n${f.raw}` },
    { role: "assistant" as const, content: f.laudo },
  ]);

  // O modelo-base continua no prompt dedicado abaixo. Aqui entram apenas as
  // regras/frases clínicas validadas do banco; assim uma atualização da
  // biblioteca passa a valer para web, iOS e Android sem duplicação por cliente.
  const validatedLibrary = (args.ragBlocks ?? [])
    .filter((block) => block.kind !== "modelo" && block.kind !== "exemplo")
    .map((block) => `### ${block.title}\n${block.content.trim()}`)
    .join("\n\n");

  // Motor único (ai/llm.ts): Claude Haiku 5.5 por padrão; sem temperature no
  // Haiku (a 0.2 só vale no rollback OpenAI).
  const gen = llmTextStream({
    target,
    system: `${buildMskWriterSystemMessage({ validatedLibrary })}\n\n${WRITER_OUTPUT_RULE}`,
    messages: [
      ...fewshotMsgs,
      { role: "user", content: `Ditado do médico:\n${args.rawInput}` },
    ],
    openaiTemperature: 0.2,
    openaiMaxTokens: 4000,
    signal: args.signal,
    label: "msk-writer",
  });

  let outputTokens: number | undefined;
  for (;;) {
    const next = await gen.next();
    if (next.done) {
      outputTokens = next.value.outputTokens;
      break;
    }
    const delta = next.value;
    if (delta) {
      if (!ttftMs) ttftMs = Date.now() - t0;
      full += delta;
      yield delta;
    }
  }

  // Guard de formato determinístico (cabeçalhos canônicos, bullets, espaços) — só
  // formato, nunca conteúdo. Corrige typos raros do modelo (ex.: "OS SEGUINTOS").
  let fullText = normalizeMskWriterFormat(cleanWriterOutput(full).text);

  // Fact-audit determinístico (opção 2 do Luiz): streama otimista, audita DEPOIS.
  // Se um fato objetivo falha (medida/lado ausente, estrutura fora do protocolo),
  // ANEXA "[REVISAR: …]" ao fim (não re-roda — mantém o TTFT). Sempre logado.
  const audit = auditMskFacts(args.rawInput, fullText);
  const nota = auditRevisarNote(audit);
  if (nota) {
    fullText = `${fullText}\n\n${nota}`;
    yield `\n\n${nota}`;
  }

  return {
    fullText,
    latencyMs: Date.now() - t0,
    ttftMs,
    model,
    outputTokens,
    audit,
  };
}
