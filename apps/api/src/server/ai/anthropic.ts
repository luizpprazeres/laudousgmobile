import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

let _client: Anthropic | null = null;

/** Cliente Anthropic único do servidor (motor Haiku e Laudo Livre). */
export function anthropic(): Anthropic {
  if (_client) return _client;
  const e = env();
  const workspaceId = e.ANTHROPIC_WORKSPACE_ID.trim();
  _client = new Anthropic({
    apiKey: e.ANTHROPIC_API_KEY,
    maxRetries: 2,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });
  return _client;
}
