import OpenAI from "openai";
import { env } from "../env";

let _client: OpenAI | null = null;

/**
 * Cliente OpenAI do servidor. Depois da migração para o Claude Haiku 5.5, a
 * OpenAI fica com: transcrição, embeddings, consultor, modo "laudo difícil",
 * Writer V2 experimental e o rollback por env do motor (`ai/llm.ts`).
 */
export function openai() {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: env().OPENAI_API_KEY });
  return _client;
}
