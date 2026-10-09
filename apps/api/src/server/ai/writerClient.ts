import OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";
import { openai } from "./openai";
import {
  anthropic,
  effortParam,
  LivreRoutingError,
  toLivreFailure,
} from "./livreProvider";
import type { WriterModelConfig } from "../pipeline/modelResolver";

let testeClient: OpenAI | null = null;

export function writerClient(config: WriterModelConfig): OpenAI {
  if (config.provider === "anthropic") {
    throw new Error("writerClient: provider anthropic usa streamAnthropicLivreWriter.");
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
 * Writer Claude Opus 5.5 do LAUDO LIVRE ROTEADO. Usa thinking adaptativo em
 * esforço baixo, não envia temperature e valida o desfecho do stream antes de
 * finalizar o report.
 */
export async function* streamAnthropicLivreWriter(args: {
  config: WriterModelConfig;
  systemMessage: string;
  userMessage: string;
  signal?: AbortSignal;
  /** Só para testes: substitui o cliente Anthropic. */
  client?: Pick<Anthropic, "messages">;
}): AsyncGenerator<string, { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }, void> {
  let full = "";
  let finalMessage;
  try {
    const stream = (args.client ?? anthropic()).messages.stream(
      {
        model: args.config.model,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: { ...effortParam(args.config.reasoningEffort) },
        system: [{ type: "text", text: args.systemMessage, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: args.userMessage }],
      },
      { signal: args.signal, timeout: 180_000 },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        yield event.delta.text;
      }
    }
    finalMessage = await stream.finalMessage();
  } catch (err) {
    throw toLivreFailure(err, "LIVRE_WRITER_FAILED");
  }

  if (finalMessage.stop_reason === "refusal") {
    throw new LivreRoutingError("LIVRE_WRITER_REFUSED", "O redator do Laudo Livre recusou gerar o laudo.");
  }
  if (
    finalMessage.stop_reason === "max_tokens" ||
    finalMessage.stop_reason === "model_context_window_exceeded"
  ) {
    throw new LivreRoutingError("LIVRE_WRITER_TRUNCATED", "O laudo do Laudo Livre foi truncado; geração interrompida.");
  }
  if (finalMessage.stop_reason !== "end_turn") {
    throw new LivreRoutingError(
      "LIVRE_WRITER_FAILED",
      `O redator do Laudo Livre terminou de forma inesperada (${finalMessage.stop_reason ?? "sem motivo"}).`,
    );
  }
  if (!full.trim()) {
    throw new LivreRoutingError("LIVRE_WRITER_EMPTY", "O redator do Laudo Livre devolveu um laudo vazio.");
  }
  return {
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    cachedInputTokens: finalMessage.usage.cache_read_input_tokens ?? undefined,
  };
}
