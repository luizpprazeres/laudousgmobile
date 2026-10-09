import OpenAI from "openai";
import { env } from "../env";

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
  "OPENAI_API_KEY" | "LIVRE_OPENAI_MODEL"
>;

/**
 * O Laudo Livre roteado usa um único modelo e falha fechado. Outro ID não
 * ativa fallback para o writer padrão nem para um modelo diferente.
 */
export function assertLivreProviderConfigured(config: LivreProviderEnv = env()): string {
  if (!config.OPENAI_API_KEY.trim()) {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      "Laudo Livre roteado indisponível: provedor OpenAI não configurado.",
    );
  }
  const model = config.LIVRE_OPENAI_MODEL.trim();
  if (model !== "gpt-6-luna") {
    throw new LivreRoutingError(
      "LIVRE_PROVIDER_NOT_CONFIGURED",
      `Laudo Livre roteado indisponível: modelo configurado (${model || "vazio"}) não é GPT-6 Luna.`,
    );
  }
  return model;
}

/** Converte falhas do SDK sem esconder cancelamentos do cliente. */
export function toLivreFailure(
  err: unknown,
  code: "LIVRE_ROUTER_FAILED" | "LIVRE_WRITER_FAILED",
): unknown {
  if (err instanceof LivreRoutingError) return err;
  if (err instanceof OpenAI.APIUserAbortError) return err;
  if (err instanceof OpenAI.APIError) {
    const stage = code === "LIVRE_ROUTER_FAILED" ? "roteador" : "redator";
    return new LivreRoutingError(
      code,
      `Falha do ${stage} OpenAI do Laudo Livre (HTTP ${err.status ?? "sem status"}).`,
    );
  }
  return err;
}
