import OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { openai } from "./openai";
import { LivreRoutingError, toLivreFailure, type LivreFailureCode } from "./livreProvider";
import { llmTextStream, LlmOutputError, type LlmFailureCode, type LlmUsage } from "./llm";
import type { WriterModelConfig } from "../pipeline/modelResolver";

let testeClient: OpenAI | null = null;

export function writerClient(config: WriterModelConfig): OpenAI {
  if (config.provider === "anthropic") {
    throw new Error("writerClient: provider anthropic usa streamAnthropicWriter (motor ai/llm.ts).");
  }
  if (config.provider === "openai") return openai();
  if (testeClient) return testeClient;
  const e = env();
  testeClient = new OpenAI({
    apiKey: e.TESTE_CATEGORY_API_KEY,
    baseURL: e.TESTE_CATEGORY_BASE_URL,
  });
  return testeClient;
}

export function writerRequestParams(args: {
  config: WriterModelConfig;
  systemMessage: string;
  userMessage: string;
  temperature: number;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    model: args.config.model,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: args.systemMessage },
      { role: "user", content: args.userMessage },
    ],
  };

  if (args.config.provider === "openai-compat") {
    return { ...base, max_tokens: 2500 };
  }

  const isReasoningModel =
    /gpt-(?:5|6)/.test(args.config.model) && !/chat-latest/.test(args.config.model);
  return isReasoningModel
    ? {
        ...base,
        max_completion_tokens: 2500,
        reasoning_effort: args.config.reasoningEffort,
      }
    : { ...base, temperature: args.temperature, max_tokens: 2500 };
}

/**
 * Writer Claude (Haiku 5.5) pelo motor único (`ai/llm.ts`): thinking adaptativo,
 * esforço do `config`, sem temperature, `stop_reason` validado antes de o
 * laudo ser dado como pronto. Falhas sobem como `LlmOutputError`.
 */
export async function* streamAnthropicWriter(args: {
  config: WriterModelConfig;
  systemMessage: string;
  userMessage: string;
  signal?: AbortSignal;
  maxTokens?: number;
  /** Só para testes: substitui o cliente Anthropic. */
  client?: Pick<Anthropic, "messages">;
}): AsyncGenerator<string, LlmUsage, void> {
  try {
    return yield* llmTextStream({
      target: { provider: "anthropic", model: args.config.model, effort: args.config.reasoningEffort },
      system: args.systemMessage,
      messages: [{ role: "user", content: args.userMessage }],
      maxTokens: args.maxTokens,
      signal: args.signal,
      label: "writer",
      anthropicClient: args.client,
    });
  } catch (err) {
    // Recusa do modelo: mensagem que o médico entende, código próprio na rota.
    if (err instanceof LlmOutputError && err.code === "LLM_REFUSED") {
      throw new LlmOutputError(
        "LLM_REFUSED",
        `O redator (${args.config.model}) recusou escrever este laudo. Revise o ditado e gere de novo. [${err.message}]`,
      );
    }
    throw err;
  }
}

const LIVRE_WRITER_CODES: Record<LlmFailureCode, LivreFailureCode> = {
  LLM_PROVIDER_NOT_CONFIGURED: "LIVRE_PROVIDER_NOT_CONFIGURED",
  LLM_REFUSED: "LIVRE_WRITER_REFUSED",
  LLM_TRUNCATED: "LIVRE_WRITER_TRUNCATED",
  LLM_EMPTY: "LIVRE_WRITER_EMPTY",
  LLM_STOPPED: "LIVRE_WRITER_FAILED",
  LLM_NO_STRUCTURED_OUTPUT: "LIVRE_WRITER_FAILED",
};

const LIVRE_WRITER_MESSAGES: Partial<Record<LivreFailureCode, string>> = {
  LIVRE_WRITER_REFUSED: "O redator do Laudo Livre recusou gerar o laudo.",
  LIVRE_WRITER_TRUNCATED: "O laudo do Laudo Livre foi truncado; geração interrompida.",
  LIVRE_WRITER_EMPTY: "O redator do Laudo Livre devolveu um laudo vazio.",
};

/**
 * Writer do LAUDO LIVRE ROTEADO: o mesmo writer Claude, com as falhas traduzidas
 * para os códigos próprios da jornada Livre.
 */
export async function* streamAnthropicLivreWriter(args: {
  config: WriterModelConfig;
  systemMessage: string;
  userMessage: string;
  signal?: AbortSignal;
  /** Só para testes: substitui o cliente Anthropic. */
  client?: Pick<Anthropic, "messages">;
}): AsyncGenerator<string, LlmUsage, void> {
  try {
    return yield* streamAnthropicWriter({ ...args, maxTokens: 16000 });
  } catch (err) {
    if (err instanceof LlmOutputError) {
      const code = LIVRE_WRITER_CODES[err.code];
      throw new LivreRoutingError(code, LIVRE_WRITER_MESSAGES[code] ?? err.message);
    }
    throw toLivreFailure(err, "LIVRE_WRITER_FAILED");
  }
}
