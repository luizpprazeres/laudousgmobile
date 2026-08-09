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

/** Teto de saída de um laudo escrito por modelo NÃO-raciocinador. */
const WRITER_MAX_TOKENS = 2500;

/**
 * Teto para provider `openai-compat`, onde o modelo pode ser raciocinador.
 *
 * MEDIDO EM PRODUÇÃO (09/08, categoria TESTE, `deepseek-v4-flash`): com o teto
 * em 2500 o modelo gastava TODO o orçamento nos tokens de raciocínio e emitia
 * **zero** conteúdo. A auditoria não deixa dúvida:
 *
 *   laudo simples   → tokens_output 1647, 14,6 s → laudo saiu
 *   laudo com achado→ tokens_output 2500, 22,0 s → saída VAZIA
 *   laudo com achado→ tokens_output 2500, 20,8 s → saída VAZIA
 *
 * Em API compatível com OpenAI, `max_tokens` limita o TOTAL — raciocínio mais
 * conteúdo. Como o raciocínio vem primeiro, estourar o teto não trunca o laudo:
 * apaga o laudo inteiro. E o stream termina limpo, então nada acusa erro.
 *
 * O valor precisa cobrir raciocínio + laudo, não só o laudo.
 */
const WRITER_COMPAT_MAX_TOKENS = 8000;

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
    // `reasoning_effort` só entra quando explicitamente configurado: provider
    // compatível é terreno de terceiros, e os estritos devolvem 400 em parâmetro
    // desconhecido. Sem a env, o comportamento é o mesmo de antes.
    const effort = args.config.reasoningEffort?.trim();
    return {
      ...base,
      max_tokens: WRITER_COMPAT_MAX_TOKENS,
      ...(effort ? { reasoning_effort: effort } : {}),
    };
  }

  const isReasoningModel =
    /gpt-5/.test(args.config.model) && !/chat-latest/.test(args.config.model);
  return isReasoningModel
    ? {
        // Mesmo raciocínio do teto acima: aqui o orçamento também cobre os
        // tokens de raciocínio, então não pode ser dimensionado só pelo laudo.
        ...base,
        max_completion_tokens: WRITER_COMPAT_MAX_TOKENS,
        reasoning_effort: args.config.reasoningEffort,
      }
    : { ...base, temperature: args.temperature, max_tokens: WRITER_MAX_TOKENS };
}
