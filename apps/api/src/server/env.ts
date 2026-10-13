import { z } from "zod";

const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_AUD: z.string().default("authenticated"),
  DATABASE_URL: z.string().url(),

  OPENAI_API_KEY: z.string().min(20),
  /**
   * MOTOR DE IA (server/ai/llm.ts) — migração Haiku 5.5, 09/10/2026.
   *
   * Um modelo por papel. O provedor sai do nome: `claude-*` → Anthropic
   * (ANTHROPIC_API_KEY); outro → OpenAI. Rollback sem deploy: trocar o modelo
   * do papel (ex.: LLM_WRITER_MODEL=gpt-5.4-mini + LLM_WRITER_EFFORT=low).
   * A família gpt-4.1 foi removida (decisão do Luiz, 09/10/2026) e é recusada em código: um valor
   * antigo vira Haiku 5.5 com aviso no log.
   *
   * Substituem OPENAI_MODEL_STRUCTURER, OPENAI_MODEL_WRITER, OPENAI_MODEL_SANITY
   * e OPENAI_WRITER_REASONING_EFFORT, que não são mais lidas.
   * Esforço: low/medium/high/xhigh/max no Haiku (default medium, o da bancada);
   * no rollback OpenAI vira `reasoning_effort` (none/low/… nos modelos GPT-5).
   */
  // Extração estruturada: renderer, structurer, interpretador de comandos,
  // esquema venoso.
  LLM_EXTRACTION_MODEL: z.string().default("claude-haiku-5-5"),
  LLM_EXTRACTION_EFFORT: z.string().default("medium"),
  // Raciocínio da extração (W16/W16C): adaptativo (padrão), "disabled" ou lista de
  // categorias sem raciocínio (CSV) — ver ai/llm.ts.
  LLM_EXTRACTION_THINKING: z.string().optional(),
  // Sem raciocínio, caminho por ferramenta: "forced" (padrão) ou "auto" (W16).
  LLM_EXTRACTION_TOOL_CHOICE: z.string().optional(),
  // W16C: IG de referência ditada ("hoje com X") preenche o campo que a extração
  // deixou vazio. Ligada por padrão; "false" desliga.
  IG_REFERENCIA_DITADA: z.string().optional(),
  // W16C: índices do bloco "Doppler obstétrico:" do app preenchem o que a extração
  // deixou vazio. Ligada por padrão; "false" desliga.
  DOPPLER_BLOCO_DET: z.string().optional(),
  // W16C: conferências determinísticas da extração obstétrica (critério "sem embrião"
  // com embrião descrito). Ligada por padrão; "false" desliga.
  OBST_CONFERENCIA_DET: z.string().optional(),
  // W16C: obstétrico com Doppler com índices ditados exige o módulo doppler
  // na extração (uma correção pelo ciclo de reparo). Ligada por padrão; "false" desliga.
  EXTRACAO_DOPPLER_OBRIGATORIO: z.string().optional(),
  // Experimento W16 (desligado; reprovado na bancada — omitiu BCF): omitir nulos.
  LLM_EXTRACTION_OMIT_NULLS: z.string().optional(),
  // Escritor: writer completo, free-slots do renderer, edição incremental.
  LLM_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
  LLM_WRITER_EFFORT: z.string().default("medium"),
  // Leitura de imagem (OCR das telas do aparelho em /api/analyze-image). Era
  // gpt-4.1 / gpt-4.1-mini fixos no código (removidos). Esforço: LLM_EXTRACTION_EFFORT.
  LLM_VISION_MODEL: z.string().default("claude-haiku-5-5"),
  // Modelo do writer por categoria: CSV `CATEGORIA=modelo[:esforço]`. AUSENTE =
  // default do código (PELVE_FEMININA, DOPPLER_CAROTIDAS → claude-sonnet-5-5; o
  // MSK usa o Haiku desde 10/10); VAZIA = sem exceções. Vence o `*_WRITER_MODEL` dos
  // writers dedicados. Ver ai/llm.ts (writerModelOverrides).
  LLM_WRITER_MODEL_BY_CATEGORY: z.string().optional(),
  // Fallback de recusa do servidor nas chamadas de texto do Sonnet 5.5 (beta
  // server-side-fallback-2026-07-01). "false" desliga.
  LLM_SONNET_SERVER_FALLBACK: z.string().default("true"),
  // Sanity por IA (observacional, depois do `done`).
  LLM_SANITY_MODEL: z.string().default("claude-haiku-5-5"),
  LLM_SANITY_EFFORT: z.string().default("medium"),
  // Raciocínio da sanity: adaptativo por padrão; "disabled" desliga (W16).
  LLM_SANITY_THINKING: z.string().optional(),
  /**
   * ROTEAMENTO — categorias que saem do renderer para o WRITER COMPLETO (bundle
   * com few-shots + guards full), decisão do Luiz de 09/10. CSV.
   *
   * Subtrativo de propósito: só tira do renderer o que está listado; o resto
   * segue RENDERER_CATEGORIES e as flags dedicadas como hoje. Voltar uma
   * categoria ao renderer (+ Haiku extrator) = tirá-la daqui. Mandar outra ao
   * writer completo (ex.: PELVE_FEMININA, para a comparação do Luiz) = pô-la aqui.
   * Ignoradas, com aviso: os cinco renderers clínicos fail-closed e os writers
   * Doppler dedicados (renal, hepático, venoso de MMII), que nunca caem no
   * writer geral. Default em pipeline/generationPathResolver.ts.
   */
  FULL_WRITER_CATEGORIES: z.string().optional(),
  // W11 — léxico da casa (pipeline/lexicoDaCasa.ts), por camada. Ausente = todas as categorias;
  // "" = desligado (rollback); "A,B" = só essas. LEXICO_DESLIGADAS=id1,id2 desliga entradas.
  LEXICO_DITADO_CATEGORIES: z.string().optional(),
  LEXICO_SAIDA_CATEGORIES: z.string().optional(),
  LEXICO_DESLIGADAS: z.string().optional(),
  // "Correlacionar com dados clínicos" só quando ditado (decisão do Luiz de 10/10): ligado por padrão em
  // todos os caminhos do /api/generate; "false" desliga o guard (rollback sem deploy).
  CORRELACAO_SO_DITADA: z.string().default("true"),
  // W15 — ajuste da seção COMENTÁRIOS (pipeline/tecnicaGuard.ts): via/transdutor/contexto ditados e
  // documentação unificada. Ligado por padrão; "false" desliga (rollback).
  TECNICA_GUARD: z.string().optional(),
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
  /**
   * LAUDO LIVRE ROTEADO (default OFF). Com "true", um request cuja categoria
   * ORIGINAL é LIVRE e que traz `route_free_category: true` passa por um
   * roteador Anthropic que identifica o exame; o laudo sai com o contrato/
   * bundle da categoria detectada, escrito pelo Claude Haiku 5.5. O roteador
   * usa esforço baixo e o writer, médio. Qualquer falha do
   * roteador ou do writer é explícita — nunca cai no writer padrão nem no prompt
   * livre. Desligado = comportamento antigo intacto.
   */
  LIVRE_ROUTER_ENABLED: z.string().default("false"),
  // Vazio = jornada indisponível (erro explícito LIVRE_PROVIDER_NOT_CONFIGURED).
  ANTHROPIC_API_KEY: z.string().default(""),
  // Só para chaves não vinculadas a workspace.
  ANTHROPIC_WORKSPACE_ID: z.string().default(""),
  // Modelo único da jornada (roteador + writer). Sem fallback para outro modelo.
  LIVRE_HAIKU_MODEL: z.string().default("claude-haiku-5-5"),
  LIVRE_ROUTER_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("low"),
  LIVRE_WRITER_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  // Confiança mínima para aceitar `routed`; abaixo disso vira `ambiguous`.
  LIVRE_ROUTER_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.8),
  // CSV de categorias que o roteador nunca pode escolher, além das fixas em
  // código (LIVRE, TESTE e experimentais).
  LIVRE_ROUTER_EXCLUDED_CATEGORIES: z.string().default(""),
  OPENAI_MODEL_CONSULTANT: z.string().default("gpt-5"),
  // Era gpt-4.1 (removido em 09/10/2026).
  OPENAI_MODEL_CONSULTANT_FALLBACK: z.string().default("gpt-5.4-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  DEEPGRAM_API_KEY: z.string().min(20),
  DEEPGRAM_MODEL: z.string().default("nova-3"),
  DEEPGRAM_LANGUAGE: z.string().default("pt-BR"),
  /**
   * ⚠️ MODO DEGRADADO: entrega a API key do projeto AO APARELHO.
   *
   * Existe como saída de emergência para o caso — e só para o caso — em que a
   * key transcreve mas não pode emitir JWT temporário
   * (`/v1/auth/grant` → 403 "Insufficient permissions"). Qualquer outro erro do
   * grant NÃO cai aqui; ver `api/deepgram/token/route.ts`.
   *
   * O default era `"true"`, e foi assim que o sistema rodou meses em modo
   * inseguro sem ninguém saber: com a variável ausente, o caminho seguro nem
   * era tentado. Um default que degrada a segurança em silêncio é o pior tipo
   * de default. Agora é FAIL-SAFE: sem configuração explícita, exige o token
   * temporário.
   */
  DEEPGRAM_ALLOW_DIRECT_KEY: z.string().default("false"),
  /**
   * Pula a ida ao Deepgram e devolve a key direta na hora, economizando
   * ~0,3-0,5s no início da gravação. Mesmo raciocínio do de cima: a economia
   * não justifica um default que põe a chave do projeto no aparelho.
   */
  DEEPGRAM_SKIP_GRANT: z.string().default("false"),
  // Keyterm Prompting (boost de vocabulário médico no STT). Controlado pelo
  // servidor pra ligar/desligar/tunar SEM rebuild do app. Setar "false" desliga.
  DEEPGRAM_KEYTERMS_ENABLED: z.string().default("true"),
  // W11: ajuste dos keyterms pela grafia que o médico assina (asr/medicalGlossary.ts), por
  // categoria. Ausente/"" = nenhuma (default); "MAMARIA,MUSCULOESQUELETICO_V2" ou "*".
  DEEPGRAM_KEYTERMS_W11_CATEGORIES: z.string().optional(),
  // Estudo de 12/10: reparos de número/medida no ditado (medida partida pela pausa, "50 por 100" → 50%,
  // cm/s, ponto decimal). "true" liga; default desligado.
  ASR_REPARO_NUMEROS: z.string().default("false"),
  // Opção B: grava em asr_capturas o texto do Deepgram antes da edição + confiança por palavra.
  // Exige a migração 20261012180000_asr_capturas. Default desligado.
  ASR_GUARDAR_ORIGINAL: z.string().default("false"),
  // Opções C+D: /api/ditado/revisar — a Jev arbitra o ditado e o app mostra as trocas (as
  // automáticas já aplicadas, com desfazer; as demais como sugestão). "true" liga.
  ASR_JEV_REVISAR: z.string().default("false"),
  // Chave da TypeSafe (Jev). Sem ela, árbitro e revisão ficam inertes.
  JEV_API_KEY: z.string().optional(),
  JEV_MODEL: z.string().default("jev-1.13.0"),
  // Filtro dos falsos alarmes da sanity por IA (sanityFilter.ts). "true" liga.
  SANITY_FILTRO_IA: z.string().default("false"),

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
  // Cinco modelos clínicos já aprovados (abdome total com Doppler, Doppler
  // venoso/arterial de MMSS, tórax e quadril infantil). Ativos por padrão e
  // independentes da allowlist histórica. `false` suspende o conjunto em
  // fail-closed, sem encaminhar para o writer geral.
  CLINICAL_MODELS_V1_ENABLED: z.string().default("true"),
  // Modelos hepáticos aprovados, ativos com validação técnica versionada.
  // false desativa o endpoint como rollback explícito.
  HEPATIC_REPORTS_V1_ENABLED: z.string().default("true"),
  // Sprint Doppler v2: a categoria passa a ser o exame Doppler ISOLADO e usa o
  // renderer novo mesmo antes de a allowlist histórica ser atualizada no
  // Vercel. Rollback explícito: false volta ao writer antigo.
  DOPPLER_STANDALONE_V2: z.string().default("true"),
  // Doppler renal aprovado: o writer dedicado e auditado fica ativo por padrão,
  // sem depender da allowlist histórica. Rollback operacional explícito:
  // `DOPPLER_RENAL_WRITER_ENABLED=false` suspende a geração renal em fail-closed;
  // nunca a devolve silenciosamente ao writer geral.
  DOPPLER_RENAL_WRITER_ENABLED: z.string().default("true"),
  // Doppler venoso de MMII aprovado: as duas apresentações (padrão e medidas)
  // usam o mesmo writer dedicado e auditado. `false` suspende ambas em
  // fail-closed; nunca devolve silenciosamente ao writer geral.
  DOPPLER_VENOSO_MMII_WRITER_ENABLED: z.string().default("true"),
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
  // Modelo do Writer V2 (experimental, cliente OpenAI). Antes herdava
  // OPENAI_MODEL_WRITER, que deixou de existir com o motor Haiku.
  WRITER_V2_MODEL: z.string().default("gpt-5.4-mini"),
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
  // Modelo do MSK writer_guarded (era gpt-4.1, removido em 09/10/2026).
  // `claude-*` → Anthropic; outro → OpenAI (rollback). Esforço: LLM_WRITER_EFFORT.
  MSK_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
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
  // Modelo do PARTES_MOLES writer_guarded (mesma regra do MSK_WRITER_MODEL).
  PARTES_MOLES_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
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
  // Modelo do PELVE writer_guarded (mesma regra do MSK_WRITER_MODEL).
  PELVE_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
  // Eixo vascular Doppler: DOPPLER_RENAL escrita
  // pelo LLM (writer_guarded) — o médico dita compacto e o template rígido enche de
  // ____. Gate próprio acima fica ON por padrão. pipeline/dopplerRenalWriter.ts.
  DOPPLER_RENAL_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
  DOPPLER_HEPATICO_WRITER_ENABLED: z.string().default("true"),
  DOPPLER_HEPATICO_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
  // Eixo vascular — DOPPLER_VENOSO_MMII writer_guarded (2ª modalidade). Gate =
  // membership em RENDERER_CATEGORIES. Segurança: TVP-only não afirma superficial.
  DOPPLER_VENOSO_WRITER_MODEL: z.string().default("claude-haiku-5-5"),
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
  // W16B: andamento em etapas reais com o tempo (pipeline/andamento.ts) — "Ditado recebido" logo no início,
  // "Lendo o ditado… N s" durante a extração, "Montando o laudo…", tempos no `done`; na obstétrica o texto
  // sai antes das gravações no banco. Liga também os eventos do renderer. OFF = como antes.
  PROGRESS_ETAPAS: z.string().default("false"),
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
  /**
   * IAP — verificação de JWS com a biblioteca oficial da Apple
   * (server/iap/verifier.ts). Nenhuma destas é segredo.
   *
   * APPLE_APP_APPLE_ID: o Apple ID numérico do app no App Store Connect.
   * Obrigatório para verificar payloads de PRODUÇÃO (a biblioteca recusa sem
   * ele). Default = o id do LaudoUSG (6770609540).
   */
  APPLE_APP_APPLE_ID: z.string().default("6770609540"),
  /**
   * Ambientes aceitos, CSV. Só `Production` e `Sandbox` são permitidos —
   * `Xcode`/`LocalTesting` fazem a biblioteca PULAR a assinatura e nunca
   * podem ser aceitos por um servidor. Sandbox fica ligado em produção porque
   * é o que o revisor da Apple e o TestFlight usam; o ambiente é gravado na
   * assinatura para auditoria.
   */
  APPLE_IAP_ENVIRONMENTS: z.string().default("Production,Sandbox"),
  /**
   * Checagem online da cadeia (OCSP/revogação) a cada verificação. "false"
   * só em teste local sem rede; em produção fica ligado. Uma falha de rede no
   * OCSP vira 503 `retryable` (o app não finaliza a transação e repete).
   */
  APPLE_IAP_ONLINE_CHECKS: z.string().default("true"),
  /** Opcional: se definido, o webhook exige `?secret=` na URL (defesa extra). */
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
