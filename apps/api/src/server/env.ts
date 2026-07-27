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
  // Esforço de raciocínio quando OPENAI_MODEL_WRITER é um reasoning model (GPT-5):
  // none/low/medium/high/xhigh. Ignorado por modelos não-reasoning (gpt-4.1-mini).
  OPENAI_WRITER_REASONING_EFFORT: z.string().default("none"),
  // Reforço opt-in do prompt do writer anterior. OFF preserva o system message
  // byte a byte; ligar somente após validação A/B contra laudos reais.
  WRITER_HARDENING: z.string().default("false"),
  HARD_MODE_ENABLED: z.string().default("false"),
  HARD_MODE_MODEL: z.string().default("gpt-5.4"),
  TESTE_CATEGORY_MODEL: z.string().default(""),
  TESTE_CATEGORY_BASE_URL: z.string().default(""),
  TESTE_CATEGORY_API_KEY: z.string().default(""),
  TESTE_REASONING_EFFORT: z.string().default("low"),
  TESTE_ALLOWED_USER_ID: z.string().default(""),
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
  // DET-6: quando "true", as diretivas de conclusão do médico são aplicadas
  // como OPERAÇÕES tipadas (pipeline/operations.ts) em vez do commandGuard
  // legado. Drop-in determinístico, atrás de flag (default OFF) — liga após
  // golden + review. Ver pipeline/commandOperations.ts.
  COMMAND_OPERATIONS: z.string().default("false"),
  // WRITER V2 (experimental): user_id autorizado ao motor plano+montagem+
  // auditoria (writerV2). "" = OFF para todos (fail-closed). Ativa para essa
  // conta SEM o app enviar param — permite testar no iPhone. Qualquer erro do
  // V2 → fallback pro caminho atual (o route não quebra). Ver pipeline/writerV2/.
  WRITER_V2_USER_ID: z.string().default(""),
  // Categorias habilitadas p/ o Writer V2 (CSV de category_codes com spec em
  // writerV2/specs/). Ex.: "ABDOMEN_TOTAL,PELVE_FEMININA,OBSTETRICA". Só ativa
  // se a conta for a autorizada (WRITER_V2_USER_ID) OU o request pedir writer_variant=v2.
  WRITER_V2_CATEGORIES: z.string().default("ABDOMEN_TOTAL"),
  // Edição incremental A1: quando "true", o route poderá chamar o caminho de
  // ajuste de laudo final existente (laudo inteiro editado + diff-guard). OFF =
  // fluxo atual intacto; o módulo editReport.ts continua testável isoladamente.
  EDIT_INCREMENTAL: z.string().default("false"),
  // Épico IG determinística (Domingos): quando "true", a conclusão obstétrica
  // (OBSTETRICA/MORFOLOGICO) considera a referência precoce (1ª US/DUM) corrigida
  // p/ a data do exame e sinaliza a correção na divergência > threshold. OFF =
  // comportamento atual (só biometria, byte-idêntico). Liga após validação do
  // Luiz em prod. Ver renderer/ig.ts + docs/epico-ig-deterministica-design.md.
  IG_REFERENCE_CORRECTION: z.string().default("false"),
  // UX: quando "true", o caminho RENDERER emite eventos SSE de progresso
  // (stage: interpretando → achado → montando) e STREAMA a extração, para o app
  // mostrar status em vez de tela muda durante os ~5s da extração. OFF = SSE
  // idêntico ao atual (sem stage events, extração não-streaming). Ver
  // pipeline/renderer.ts + renderer/extraction.ts.
  RENDERER_PROGRESS: z.string().default("false"),
  // Camada flexível: quando "true", o renderer insere os `itens_conclusao_livres`
  // (conteúdo clínico extra que o médico ditou e não cabe em campo estruturado —
  // ex.: comparação com exame anterior), após guard de dedup determinístico. OFF =
  // itens livres extraídos mas NÃO inseridos (byte-idêntico). Ver OBSTETRICA.ts +
  // docs/camada-flexivel-design.md.
  FLEXIBLE_CONCLUSION: z.string().default("false"),
  // Placenta: quando "true", o grau de Grannum sai como parentético no fim da
  // frase da placenta ("(grau II de Grannum et al.)", romano) e, se a textura não
  // foi ditada mas o grau sim, infere-a (grau 0 = homogênea; I/II/III =
  // heterogênea, de acordo com a fase da gestação). SÓ no corpo, nunca na
  // conclusão. OFF = comportamento atual (grau inline). Ver OBSTETRICA.ts.
  GRANNUM_PLACENTA: z.string().default("false"),
  // Esquema visual venoso: quando "true", roda a extração side-channel de
  // DOPPLER_VENOSO_MMII APÓS o "done" e emite o evento SSE "scheme" com o
  // MapaVenoso (só o DESENHO; o texto do laudo continua no writer). OFF = nada
  // muda. Fail-safe: falha nunca derruba o laudo. Ver plano-integracao-esquemas.
  VENOUS_SCHEME_MAP: z.string().default("false"),
  // Cartografia venosa de 4 VISTAS: quando "true", o evento SSE "scheme" anuncia
  // asset_version "venous-4view-1" (o cliente renderiza as 8 células com
  // recolorVenousPixels4). OFF = mantém "venoso-anterior-1" (vista única). O
  // MapaVenoso é o mesmo; só muda o asset/coords/render no cliente. Fail-safe.
  VENOUS_SCHEME_4VIEW: z.string().default("false"),
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
