import OpenAI from "openai";
import { env } from "../env";
import { openai } from "./openai";
import {
  LivreRoutingError,
  toLivreFailure,
} from "./livreProvider";
import type { WriterModelConfig } from "../pipeline/modelResolver";

let testeClient: OpenAI | null = null;

export function writerClient(config: WriterModelConfig): OpenAI {
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
 * Writer GPT-6 Luna do LAUDO LIVRE ROTEADO. Usa reasoning `none`, não envia
 * temperature e valida o desfecho do stream antes de finalizar o report.
 */
export async function* streamOpenAILivreWriter(args: {
  config: WriterModelConfig;
  systemMessage: string;
  userMessage: string;
  signal?: AbortSignal;
  /** Só para testes: substitui o cliente OpenAI. */
  client?: Pick<OpenAI, "chat">;
}): AsyncGenerator<string, { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }, void> {
  let full = "";
  let finishReason: string | null = null;
  let refused = false;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let cachedInputTokens: number | undefined;
  try {
    const stream = await (args.client ?? openai()).chat.completions.create(
      {
        model: args.config.model,
        stream: true,
        stream_options: { include_usage: true },
        max_completion_tokens: 16000,
        reasoning_effort: "none",
        messages: [
          { role: "system", content: args.systemMessage },
          { role: "user", content: args.userMessage },
        ],
      },
      { signal: args.signal, timeout: 180_000 },
    );
    for await (const chunk of stream) {
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
        cachedInputTokens = chunk.usage.prompt_tokens_details?.cached_tokens;
      }
      const choice = chunk.choices[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (choice?.delta?.refusal) refused = true;
      const text = choice?.delta?.content ?? "";
      if (text) {
        full += text;
        yield text;
      }
    }
  } catch (err) {
    throw toLivreFailure(err, "LIVRE_WRITER_FAILED");
  }

  if (refused) {
    throw new LivreRoutingError("LIVRE_WRITER_REFUSED", "O redator do Laudo Livre recusou gerar o laudo.");
  }
  if (finishReason === "length") {
    throw new LivreRoutingError("LIVRE_WRITER_TRUNCATED", "O laudo do Laudo Livre foi truncado; geração interrompida.");
  }
  if (finishReason !== "stop") {
    throw new LivreRoutingError(
      "LIVRE_WRITER_FAILED",
      `O redator do Laudo Livre terminou de forma inesperada (${finishReason ?? "sem motivo"}).`,
    );
  }
  if (!full.trim()) {
    throw new LivreRoutingError("LIVRE_WRITER_EMPTY", "O redator do Laudo Livre devolveu um laudo vazio.");
  }
  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
  };
}
