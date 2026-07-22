import { env } from "../env";

export type GenerationMode = "standard" | "hard";

export type WriterModelConfig = {
  provider: "openai" | "openai-compat";
  model: string;
  reasoningEffort: string;
  credentialRef: "default" | "teste";
};

export type WriterModelContext = {
  mode: GenerationMode;
  categoryCode: string;
  userId?: string;
};

type ModelResolverEnv = Pick<
  ReturnType<typeof env>,
  | "OPENAI_MODEL_WRITER"
  | "OPENAI_WRITER_REASONING_EFFORT"
  | "HARD_MODE_ENABLED"
  | "HARD_MODE_MODEL"
  | "TESTE_CATEGORY_MODEL"
  | "TESTE_CATEGORY_BASE_URL"
  | "TESTE_CATEGORY_API_KEY"
  | "TESTE_REASONING_EFFORT"
  | "TESTE_ALLOWED_USER_ID"
>;

export class WriterModelResolutionError extends Error {
  constructor(
    message: string,
    readonly code: "TESTE_FORBIDDEN" | "TESTE_PROVIDER_NOT_CONFIGURED",
    readonly status: 403 | 503,
  ) {
    super(message);
    this.name = "WriterModelResolutionError";
  }
}

export function resolveWriterModel(
  ctx: WriterModelContext,
  config: ModelResolverEnv = env(),
): WriterModelConfig {
  if (ctx.categoryCode === "TESTE") {
    if (
      !config.TESTE_ALLOWED_USER_ID ||
      !ctx.userId ||
      ctx.userId !== config.TESTE_ALLOWED_USER_ID
    ) {
      throw new WriterModelResolutionError(
        "Categoria TESTE restrita ao usuário autorizado.",
        "TESTE_FORBIDDEN",
        403,
      );
    }
    if (
      !config.TESTE_CATEGORY_MODEL ||
      !config.TESTE_CATEGORY_BASE_URL ||
      !config.TESTE_CATEGORY_API_KEY
    ) {
      throw new WriterModelResolutionError(
        "Provider da categoria TESTE não está configurado.",
        "TESTE_PROVIDER_NOT_CONFIGURED",
        503,
      );
    }
    return {
      provider: "openai-compat",
      model: config.TESTE_CATEGORY_MODEL,
      reasoningEffort: config.TESTE_REASONING_EFFORT || "low",
      credentialRef: "teste",
    };
  }

  if (ctx.mode === "hard" && config.HARD_MODE_ENABLED === "true") {
    return {
      provider: "openai",
      model: config.HARD_MODE_MODEL || "gpt-5.4",
      reasoningEffort: "low",
      credentialRef: "default",
    };
  }

  return {
    provider: "openai",
    model: config.OPENAI_MODEL_WRITER,
    reasoningEffort: config.OPENAI_WRITER_REASONING_EFFORT,
    credentialRef: "default",
  };
}
