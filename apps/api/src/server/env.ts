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
  // Pós-validador clínico determinístico. "observe" apenas registra issues no
  // sanity (roda após a entrega do laudo — não altera o texto); "block_critical"
  // interromperia a entrega quando houver issue critical (não usado ainda).
  POST_VALIDATOR_MODE: z.enum(["observe", "block_critical"]).default("observe"),
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
  // Projeto modelos (docs/projeto-modelos/): categorias cujo renderer monta o
  // laudo a partir do CATÁLOGO (renderer/catalog/) em vez das frases literais
  // em código. Lista CSV de category_codes. Vazio = comportamento atual, byte
  // a byte — a equivalência é verificada por
  // renderer/__tests__/catalog-equivalence.manual.ts (3840 combinações).
  // Só o estilo CLÁSSICO tem catálogo hoje; o objetivo cai no caminho antigo.
  // Rollback trivial: tirar a categoria da lista.
  // Reforço de intenção e completude no prompt do writer (bloco ADICIONAL no
  // fim do system message). Endereça a família de defeitos do boletim de 100
  // laudos: átomo do ditado que some, negação virando frase normal, comando
  // executado como texto. Default OFF — entra inerte.
  WRITER_HARDENING: z.string().default("false"),
  MODEL_CATALOG_CATEGORIES: z.string().default(""),
  // Projeto modelos item 7: categorias em que a personalização PUBLICADA do
  // médico é aplicada na geração. Trava separada de MODEL_CATALOG_CATEGORIES
  // de propósito — o catálogo é byte-idêntico ao renderer (risco nulo), mas
  // aplicar o overlay do usuário muda o texto do laudo. Só vale quando as
  // DUAS estão ligadas. Rollback trivial: esvaziar esta.
  MODEL_CUSTOMIZATION_CATEGORIES: z.string().default(""),
  /**
   * ALLOWLIST DE USUÁRIOS da personalização — CSV de `user_id`.
   *
   * Categoria não é canário de usuário (crítica do Codex, 19/08): ligar
   * `MODEL_CUSTOMIZATION_CATEGORIES` habilita a personalização para QUALQUER
   * médico que tenha publicado naquela categoria, não só para quem está
   * pilotando. Numa função que muda o texto do laudo por decisão do usuário,
   * o piloto precisa ser nominal.
   *
   * Vazio = NINGUÉM, mesmo com a categoria ligada. Fail-closed, como as
   * demais flags deste sistema.
   */
  MODEL_CUSTOMIZATION_USER_IDS: z.string().default(""),

  /**
   * Segredo de SISTEMA das rotas `/api/catalog/*` — o modelo de laudo que a web
   * consome para montar por cliques.
   *
   * O catálogo não tem dado de paciente e não depende de usuário, mas é a
   * redação clínica da casa inteira: uma rota aberta convida raspagem. Só o
   * backend da web usa; o navegador nunca vê a chave.
   *
   * Vazio ou curto = rota indisponível (503). Ver `catalog-api/auth.ts`.
   */
  CATALOG_SERVICE_TOKEN: z.string().default(""),
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
  // LEGADO (compat): var da 1ª ativação do abdome, ainda setada em prod e
  // Sensitive (não legível p/ migrar). O gate usa WRITER_V2_USER_ID OU esta,
  // então o abdome segue ativo sem migrar o id. Preferir WRITER_V2_USER_ID.
  WRITER_V2_ABDOME_USER_ID: z.string().default(""),
  // Categorias habilitadas p/ o Writer V2 (CSV de category_codes com spec em
  // writerV2/specs/). Ex.: "ABDOMEN_TOTAL,PELVE_FEMININA,OBSTETRICA". Só ativa
  // se a conta for a autorizada (WRITER_V2_USER_ID) OU o request pedir writer_variant=v2.
  WRITER_V2_CATEGORIES: z.string().default("ABDOMEN_TOTAL"),
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
  // Biometria fetal determinística (boletim 02/07, laudo 62f15728): quando "true",
  // o bloco "Biometria fetal:" da calculadora do app + a reconciliação cm→mm de
  // ditado por voz VENCEM a extração LLM (que ecoou CC/CA/CF sem o ×10), e o
  // measureSanity ganha o check IG×CF (fórmula canônica do app). Default OFF.
  OBST_BIOMETRIA_DET: z.string().default("false"),
  // Dedup da frase de referência de IG (boletim 04/07, caso 10813392): quando
  // "true", a frase "Primeira ultrassonografia realizada…/Data da última
  // menstruação em…" só aparece UMA vez (o comando "após o título acrescente…"
  // fazia o interpretador re-inserir uma cópia nos comentários). Default OFF.
  OBST_REF_DEDUP: z.string().default("false"),
  // Sanity de IG (boletim 04/07, caso 10813392): quando "true", divergência
  // IMPLAUSÍVEL (>4 semanas) entre biometria e referência precoce = erro de
  // ditado → NÃO corrige (âncora = biometria pura) + [REVISAR]. Default OFF.
  OBST_IG_SANITY: z.string().default("false"),
  // SEGURANÇA P0 Doppler (boletim 03/07, caso 89ffa1ef): quando "true", NUNCA
  // afirmar "IP normal na artéria umbilical" com diástole zero/reversa ditada ou
  // IP umbilical bruto ≥ 1,5 (grosseiramente anormal). A lógica antiga dependia só
  // do flag verbalizado + percentil → falso-normal em feto PIG. Default OFF (LIGAR
  // ASSIM QUE VALIDADO — é correção de risco clínico direto).
  DOPPLER_UMBILICAL_SAFETY: z.string().default("false"),
  // Arquitetura 2 modos (2026-07-02): quando "true", PARTES_MOLES (categoria ABERTA,
  // lesão de qualquer tipo/topografia) é escrita pelo LLM (writer_guarded) — mesma
  // receita do MSK (prompt base + roteiro da casa + few-shots dos laudos assinados +
  // fact-audit). Piloto: pipeline/partesMolesWriter.ts. OFF = renderer atual. Default OFF.
  PARTES_MOLES_WRITER: z.string().default("false"),
  // Modelo do PARTES_MOLES writer_guarded (mesma justificativa do MSK_WRITER_MODEL).
  PARTES_MOLES_WRITER_MODEL: z.string().default("gpt-4.1"),
  // Auditoria 2026-07-01 gap #1 (🔴 falha de seguimento): quando "true", detecta
  // golf ball / foco ecogênico intracardíaco no ditado (OBSTETRICA/MORFOLOGICO/
  // DOPPLER_OBSTETRICO) e injeta as frases canônicas da casa (corpo + item de
  // conclusão + recomendação de eco fetal ~28s). Determinístico, sem LLM
  // (renderer/categories/golfBall.ts). OFF = comportamento atual. Default OFF.
  GOLF_BALL_SNIPPET: z.string().default("false"),
  // Auditoria 2026-07-01 gap #3 (🟠): quando "true", a MAMARIA anexa "[REVISAR: …]"
  // quando detecta incoerência de BI-RADS — SÓ SINALIZA, NUNCA rebaixa (rebaixar
  // categoria por heurística = risco de mascarar malignidade). (A) achado sólido sem
  // categoria; (B) BI-RADS >= 4 sobre nódulo morfologicamente benigno. Default OFF.
  MAMARIA_BIRADS_GUARD: z.string().default("false"),
  // Arquitetura 2 modos (pedido Luiz 02/07): quando "true", PELVE_FEMININA (TA/TV
  // têm muitos detalhes que mudam → renderer gera frase repetida/mal posicionada/
  // alucinada) é escrita pelo LLM (writer_guarded). Mesma receita do MSK/PARTES_MOLES.
  // Piloto: pipeline/pelveWriter.ts. OFF = renderer determinístico atual. Default OFF.
  PELVE_WRITER: z.string().default("false"),
  // Modelo do PELVE writer_guarded (mesma justificativa do MSK_WRITER_MODEL).
  PELVE_WRITER_MODEL: z.string().default("gpt-4.1"),
  // Eixo vascular Doppler (piloto, decisão Claude+Dex2 03/07): DOPPLER_RENAL escrita
  // pelo LLM (writer_guarded) — o médico dita compacto e o template rígido enche de
  // ____. Gate = membership em RENDERER_CATEGORIES (como DOPPLER_OBSTETRICO); fora da
  // env → writer geral atual. pipeline/dopplerRenalWriter.ts. Modelo configurável.
  DOPPLER_RENAL_WRITER_MODEL: z.string().default("gpt-4.1"),
  // Eixo vascular — DOPPLER_VENOSO_MMII writer_guarded (2ª modalidade). Gate =
  // membership em RENDERER_CATEGORIES. Segurança: TVP-only não afirma superficial.
  DOPPLER_VENOSO_WRITER_MODEL: z.string().default("gpt-4.1"),
  // Auditoria 2026-07-01 gap #6 (🟡): quando "true", a PELVE_FEMININA deduplica itens
  // de conclusão IDÊNTICOS (a extração às vezes emite o mesmo achado 2x — ex.: também
  // em achados_adicionais). Conservador: só duplicata literal (preserva lateralidade/
  // topografia). OFF = comportamento atual. Default OFF.
  PELVE_CONCL_DEDUP: z.string().default("false"),
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
  // Edição incremental: quando "true", habilita POST /api/edit (ajuste pontual de
  // laudo pronto via linguagem natural + diff-guard). OFF = endpoint responde 404.
  EDIT_INCREMENTAL: z.string().default("false"),
  // Placenta: quando "true", o grau de Grannum sai como parentético no fim da
  // frase da placenta ("(grau II de Grannum et al.)", romano) e, se a textura não
  // foi ditada mas o grau sim, infere-a (grau 0 = homogênea; I/II/III =
  // heterogênea, de acordo com a fase da gestação). SÓ no corpo, nunca na
  // conclusão. OFF = comportamento atual (grau inline). Ver OBSTETRICA.ts.
  GRANNUM_PLACENTA: z.string().default("false"),
  // Esquema visual venoso: quando "true", roda a extração side-channel de
  // DOPPLER_VENOSO_MMII (chave _SCHEME) APÓS o "done" e emite o evento SSE
  // "scheme" com o MapaVenoso (só o DESENHO; o texto do laudo continua no writer).
  // OFF = nada muda. Fail-safe: falha nunca derruba o laudo.
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

/**
 * Relê `process.env`. SÓ PARA OS GATES manuais.
 *
 * Existe por causa da allowlist da personalização: o `user_id` do piloto só é
 * conhecido depois de consultar o banco, e a essa altura `env()` já foi
 * memoizada pelo cliente do Postgres. Sem isto, o gate não conseguiria
 * exercitar o caminho ligado — e a trava mais importante ficaria sem teste.
 *
 * Recusa-se a rodar em produção: mudar env em runtime lá seria um jeito de
 * ligar uma flag sem deploy.
 */
export function recarregarEnvParaTeste(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("recarregarEnvParaTeste não roda em produção");
  }
  _env = null;
}
