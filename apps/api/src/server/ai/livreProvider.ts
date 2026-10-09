import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

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

type LivreProviderEnv = Pick<
  ReturnType<typeof env>,
  "ANTHROPIC_API_KEY" | "LIVRE_ANTHROPIC_MODEL"
>;

/**
 * O Laudo Livre roteado usa um único modelo e falha fechado. Outro ID não
 * ativa fallback para o writer padrão nem para um modelo diferente.
 */
export function assertLivreProviderConfigured(config: LivreProviderEnv = env()): string {
  if (!config.ANTHROPIC_API_KEY.trim()) {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      "Laudo Livre roteado indisponível: provedor Anthropic não configurado.",
    );
  }
  const model = config.LIVRE_ANTHROPIC_MODEL.trim();
  if (model !== "claude-opus-5-5") {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      `Laudo Livre roteado indisponível: modelo configurado (${model || "vazio"}) não é Claude Opus 5.5.`,
    );
  }
  return model;
}

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

export function effortParam(
  effort: string,
): { effort: "low" | "medium" | "high" | "xhigh" | "max" } | undefined {
  if (
    effort === "low" ||
    effort === "medium" ||
    effort === "high" ||
    effort === "xhigh" ||
    effort === "max"
  ) {
    return { effort };
  }
  return undefined;
}

/** Converte falhas do SDK sem esconder cancelamentos do cliente. */
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
