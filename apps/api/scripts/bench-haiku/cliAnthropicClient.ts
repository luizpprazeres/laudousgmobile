/**
 * Cliente "Anthropic" que responde pela ASSINATURA (`claude -p`), para injetar
 * nas funções de produção que aceitam `anthropicClient` (writer, motor). Só
 * texto: concatena o system e os turnos do usuário, como o resto da bancada.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { callClaude } from "./claudeCli";

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : ((content as Array<{ type: string; text?: string }>) ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");

export function cliAnthropicClient(effort: "low" | "medium" | "high" = "medium"): Pick<Anthropic, "messages"> {
  return {
    messages: {
      stream: (params: Anthropic.MessageStreamParams) => {
        const system = Array.isArray(params.system) ? params.system.map((b) => b.text).join("\n\n") : String(params.system ?? "");
        const user = params.messages.filter((m) => m.role === "user").map((m) => textOf(m.content)).join("\n\n");
        const pending = callClaude({ model: params.model, system, user, effort });
        return {
          async *[Symbol.asyncIterator]() {
            const r = await pending;
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: r.text } };
          },
          finalMessage: async () => {
            const r = await pending;
            return {
              content: [{ type: "text", text: r.text }],
              stop_reason: "end_turn",
              stop_details: null,
              usage: { input_tokens: r.inputTokens, output_tokens: r.outputTokens, cache_read_input_tokens: 0 },
            };
          },
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}
