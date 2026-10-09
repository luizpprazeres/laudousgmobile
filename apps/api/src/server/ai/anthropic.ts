import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

/**
 * Cliente Anthropic da jornada LAUDO LIVRE ROTEADO.
 *
 * Usado SÓ pelo roteador e pelo writer dessa jornada. Não existe fallback para
 * OpenAI nem para outro modelo: chave ausente, modelo inválido, recusa ou
 * resposta truncada viram `LivreRoutingError` com código próprio, que a rota
 * emite como erro explícito.
 */
let _client: Anthropic | null = null;

export type LivreFailureCode =
  | "LIVRE_PROVIDER_NOT_CONFIGURED"
  | "LIVRE_ROUTE_AMBIGUOUS"
  | "LIVRE_ROUTE_MULTIPLE"
  | "LIVRE_ROUTE_UNSUPPORTED"
  | "LIVRE_ROUTE_INCOMPATIBLE"
  | "LIVRE_ROUTER_REFUSED"
  | "LIVRE_ROUTER_TRUNCATED"
  | "LIVRE_ROUTER_INVALID_RESPONSE"
  | "LIVRE_ROUTER_FAILED"
  | "LIVRE_ROUTER_DISABLED"
  | "LIVRE_WRITER_REFUSED"
  | "LIVRE_WRITER_TRUNCATED"
  | "LIVRE_WRITER_EMPTY"
  | "LIVRE_WRITER_FAILED";

export class LivreRoutingError extends Error {
  constructor(
    readonly code: LivreFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "LivreRoutingError";
  }
}

export function isLivreRoutingError(err: unknown): err is LivreRoutingError {
  return err instanceof LivreRoutingError;
}

type AnthropicEnv = Pick<ReturnType<typeof env>, "ANTHROPIC_API_KEY" | "LIVRE_ANTHROPIC_MODEL">;

/**
 * Valida a configuração ANTES de qualquer chamada. A jornada é Sonnet 5.5 por
 * definição: outro modelo configurado é erro de configuração, não troca
 * silenciosa de família.
 */
export function assertLivreProviderConfigured(config: AnthropicEnv = env()): string {
  if (!config.ANTHROPIC_API_KEY.trim()) {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      "Laudo Livre roteado indisponível: provedor Anthropic não configurado.",
    );
  }
  const model = config.LIVRE_ANTHROPIC_MODEL.trim();
  if (model !== "claude-sonnet-5-5") {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      `Laudo Livre roteado indisponível: modelo configurado (${model || "vazio"}) não é Sonnet 5.5.`,
    );
  }
  return model;
}

export function anthropic(): Anthropic {
  if (_client) return _client;
  // Retentativas do SDK repetem o MESMO modelo (429/5xx/rede) — não é fallback.
  const e = env();
  const workspaceId = e.ANTHROPIC_WORKSPACE_ID.trim();
  _client = new Anthropic({
    apiKey: e.ANTHROPIC_API_KEY,
    maxRetries: 2,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });
  return _client;
}

/** `""` desliga o parâmetro (modelos que não aceitam effort). */
export function effortParam(
  effort: string,
): { effort: "low" | "medium" | "high" | "xhigh" | "max" } | undefined {
  return effort === "low" ||
    effort === "medium" ||
    effort === "high" ||
    effort === "xhigh" ||
    effort === "max"
    ? { effort }
    : undefined;
}

/**
 * Converte erros do SDK em falha explícita da jornada, sem engolir abort do
 * cliente (a rota trata `AbortError` como desconexão, não como falha).
 */
export function toLivreFailure(
  err: unknown,
  code: "LIVRE_ROUTER_FAILED" | "LIVRE_WRITER_FAILED",
): unknown {
  if (err instanceof LivreRoutingError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return err;
  if (err instanceof Anthropic.APIError) {
    const stage = code === "LIVRE_ROUTER_FAILED" ? "roteador" : "redator";
    return new LivreRoutingError(
      code,
      `Falha do ${stage} Anthropic do Laudo Livre (HTTP ${err.status ?? "sem status"}).`,
    );
  }
  return err;
}
