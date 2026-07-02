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
  // DET-6 FASE 2: quando "true", roda o INTERPRETADOR DE COMANDOS por LLM
  // (pipeline/commandInterpreter.ts) DEPOIS da fase 1 determinística — resolve
  // âncora semântica ("a frase do resíduo") e achado-no-corpo ("pode colocar X").
  // Adiciona 1 chamada LLM; falha graciosa (laudo intocado). Default OFF.
  COMMAND_INTERPRETER: z.string().default("false"),
  // DET-6 FASE 3: quando "true", SEPARA os comandos do ditado ANTES da geração
  // (pipeline/commandStripper.ts) — o writer/extração gera o draft SEM o comando
  // (não ecoa); os comandos são aplicados depois (fase 1/2) sobre o draft limpo.
  // Resolve o eco upstream que o pós-processamento sozinho não removia. Default OFF.
  COMMAND_PREGEN: z.string().default("false"),
  // Boletim 2026-06-30: quando "true", normaliza GARBLE de ASR clínico inequívoco
  // ("estímulo"→istmo, "ecoeca"→anecoica, "miolétrico"→miométrio) no ditado ANTES
  // da extração (pipeline/asrClinical.ts) — evita eco cru/perda de dado. OFF =
  // ditado intocado (byte-idêntico). Default OFF.
  ASR_CLINICAL: z.string().default("false"),
  // Auditoria 2026-07-01: quando "true", o renderer MSK detecta laudo JÁ formatado
  // (colado pronto: título + COMENTÁRIOS + ASPECTOS/ACHADOS + CONCLUSÃO) e faz
  // PASSTHROUGH fiel (preserva o texto do médico, só padroniza nomenclatura) em vez
  // de regerar a partir da extração. Ditado curto (só-diagnóstico) segue no renderer
  // + biblioteca canônica. OFF = sempre regenera (comportamento atual). Default OFF.
  MSK_PASSTHROUGH: z.string().default("false"),
  // Arquitetura 2 modos (2026-07-02): quando "true", MSK (categoria ABERTA) é escrito
  // pelo LLM (writer_guarded) em vez do renderer determinístico — entende linguagem
  // natural (multi-segmento, garble, comandos), guiado pelo roteiro da casa no prompt.
  // Piloto: pipeline/mskWriter.ts. OFF = renderer atual. Default OFF.
  MSK_WRITER: z.string().default("false"),
  // Modelo do MSK writer_guarded. gpt-4.1 (full) acerta as convenções da casa com
  // os few-shots (e não é mais lento que o mini: ~3s). Configurável.
  MSK_WRITER_MODEL: z.string().default("gpt-4.1"),
  // Auditoria 2026-07-01 gap #4 (🟡): quando "true", a TIREOIDE COM DOPPLER OMITE a
  // linha de pico sistólico quando o valor não foi ditado (null), em vez de imprimir
  // "____ cm/s" (placeholder feio — corpus §2 "remover linhas de pico não ditadas").
  // Vale p/ clássico e objetivo. OFF = comportamento atual ("____"). Default OFF.
  TIREOIDE_PICO_OMIT: z.string().default("false"),
  // Arquitetura 2 modos (2026-07-02): quando "true", PARTES_MOLES (categoria ABERTA,
  // lesão de qualquer tipo/topografia) é escrita pelo LLM (writer_guarded) — mesma
  // receita do MSK (prompt base + roteiro da casa + few-shots dos laudos assinados +
  // fact-audit). Piloto: pipeline/partesMolesWriter.ts. OFF = renderer atual. Default OFF.
  PARTES_MOLES_WRITER: z.string().default("false"),
  // Modelo do PARTES_MOLES writer_guarded (mesma justificativa do MSK_WRITER_MODEL).
  PARTES_MOLES_WRITER_MODEL: z.string().default("gpt-4.1"),
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
