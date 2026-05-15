import type {
  StructuredFindings,
  ValidatorResult,
  RagBlockForPrompt,
  SanityResult,
  WritingStyleCode,
  CategoryCode,
} from "@laudousg/shared";

/**
 * Contexto compartilhado entre as etapas do pipeline. Cada etapa lê o que
 * precisa, retorna o que produz, e o orquestrador atualiza o contexto.
 */
export type PipelineContext = {
  reportId: string;
  userId: string;
  rawInput: string;
  consolidatedTranscript: string | null;
  categoryHint?: CategoryCode;
  writingStyleId: string;
  writingStyleCode: WritingStyleCode;
  // Preenchido pelo structurer
  structured?: StructuredFindings;
  // Preenchido pelo validator
  validator?: ValidatorResult;
  // Preenchido pelo retriever
  ragBlocks?: RagBlockForPrompt[];
  // Preenchido pelo writer (acumulado em streaming)
  writerOutput?: string;
  // Preenchido pelo sanity check
  sanity?: SanityResult;
  // Métricas
  metrics: {
    structurerMs?: number;
    writerMs?: number;
    sanityMs?: number;
    tokensInput?: number;
    tokensOutput?: number;
  };
};

export type StageError = {
  stage: "structurer" | "validator" | "retriever" | "writer" | "sanity";
  code: string;
  message: string;
};
