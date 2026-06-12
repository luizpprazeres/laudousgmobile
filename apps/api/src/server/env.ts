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
  OPENAI_MODEL_CONSULTANT: z.string().default("gpt-5"),
  OPENAI_MODEL_CONSULTANT_FALLBACK: z.string().default("gpt-4.1"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  DEEPGRAM_API_KEY: z.string().min(20),
  DEEPGRAM_MODEL: z.string().default("nova-3"),
  DEEPGRAM_LANGUAGE: z.string().default("pt-BR"),
  // FALLBACK PROTÓTIPO: se /auth/grant falhar (conta sem permissão), o endpoint
  // /api/deepgram/token devolve a API key direta. ⚠️ inseguro — desligar
  // ("false") quando o token temporário funcionar. Default "true" só pro teste.
  DEEPGRAM_ALLOW_DIRECT_KEY: z.string().default("true"),
  // A conta não tem permissão de /auth/grant (403). PULA a ida ao Deepgram e
  // devolve a key direta na hora — economiza ~0,3-0,5s no início da gravação.
  // Quando o grant for habilitado na conta, setar "false".
  DEEPGRAM_SKIP_GRANT: z.string().default("true"),
  // Keyterm Prompting (boost de vocabulário médico no STT). Controlado pelo
  // servidor pra ligar/desligar/tunar SEM rebuild do app. Setar "false" desliga.
  DEEPGRAM_KEYTERMS_ENABLED: z.string().default("true"),

  PROMPT_VERSION: z.string().default("v1.3"),
  FINDINGS_SCHEMA_VERSION: z.string().default("v1"),
  CONTRACT_VERSION: z.string().default("v1"),
  GENERATION_AUDIT_ENABLED: z.string().default("false"),
  // FAST-PATH como padrão do servidor (pula o structurer, ~5s mais rápido).
  // Revert instantâneo: setar "false" na env (Vercel) — sem mexer em código.
  // O request pode sobrescrever via campo fast_path.
  FAST_PATH_DEFAULT: z.string().default("true"),
  // DET-5: categorias que usam o RENDERER (extração tipada + montagem em
  // código) em vez do writer. Lista CSV de category_codes (ex:
  // "ABDOMEN_TOTAL,TIREOIDE"). Vazio = renderer desligado. A categoria também
  // precisa de template_body na variante resolvida — senão cai no writer
  // (fallback automático, rollback trivial = tirar da lista).
  RENDERER_CATEGORIES: z.string().default(""),
  APPLE_BUNDLE_ID: z.string().default("com.laudousg.LaudoUSG"),
  APPLE_NOTIFICATION_SECRET: z.string().optional(),
  BETA_TESTER_EMAILS: z.string().optional(),
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
