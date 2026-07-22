import OpenAI from "openai";
import { env } from "../env";
import { openai } from "./openai";
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
    /gpt-5/.test(args.config.model) && !/chat-latest/.test(args.config.model);
  return isReasoningModel
    ? {
        ...base,
        max_completion_tokens: 2500,
        reasoning_effort: args.config.reasoningEffort,
      }
    : { ...base, temperature: args.temperature, max_tokens: 2500 };
}
