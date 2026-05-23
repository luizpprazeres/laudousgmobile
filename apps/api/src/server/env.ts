import { z } from "zod";

const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_AUD: z.string().default("authenticated"),
  DATABASE_URL: z.string().url(),

  OPENAI_API_KEY: z.string().min(20),
  // gpt-4.1-mini: modelo do LaudoUSG original, A/B-validado vs Llama 3.3 70B
  OPENAI_MODEL_STRUCTURER: z.string().default("gpt-4.1-mini"),
  OPENAI_MODEL_WRITER: z.string().default("gpt-4.1-mini"),
  OPENAI_MODEL_SANITY: z.string().default("gpt-4.1-mini"),
  OPENAI_MODEL_CONSULTANT: z.string().default("gpt-5-thinking"),
  OPENAI_MODEL_CONSULTANT_FALLBACK: z.string().default("gpt-4.1"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  DEEPGRAM_API_KEY: z.string().min(20),
  DEEPGRAM_MODEL: z.string().default("nova-3"),
  DEEPGRAM_LANGUAGE: z.string().default("pt-BR"),

  PROMPT_VERSION: z.string().default("v1.3"),
  FINDINGS_SCHEMA_VERSION: z.string().default("v1"),
  CONTRACT_VERSION: z.string().default("v1"),
  GENERATION_AUDIT_ENABLED: z.string().default("false"),
});

let _env: z.infer<typeof ServerEnvSchema> | null = null;

export function env() {
  if (_env) return _env;
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Env inválida:",
      JSON.stringify(parsed.error.format(), null, 2),
    );
    throw new Error("Variáveis de ambiente inválidas — ver logs.");
  }
  _env = parsed.data;
  return _env;
}
