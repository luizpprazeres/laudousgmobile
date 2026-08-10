# Projeto Modelos & Personalização — Mapa real do sistema

- **Status:** Fase 1 (Descoberta) — em andamento
- **Data da apuração:** 2026-08-09
- **Método:** inspeção read-only de 4 repositórios, CLI da Vercel, e leitura de metadados
  + dados agregados do banco de produção via MCP Supabase. Nenhum arquivo alterado,
  nenhuma migration aplicada, nenhum dado de paciente lido.
- **Convenção deste documento:** cada afirmação é marcada como
  **[F]** fato verificado por comando/arquivo · **[I]** inferência · **[?]** não confirmado.

> ⚠️ Leia junto: `01-divergencias-e-riscos.md`, `02-arquitetura-proposta.md`,
> `03-perguntas-abertas.md`. O índice do projeto está em `README.md` desta pasta.

---

## 1. Repositórios reais

| Caminho no disco | Remote git | Branch | Estado | Papel |
|---|---|---|---|---|
| `~/laudousgmobile-def` | `luizpprazeres/laudousgmobile` | `feat/model-resolver-hard-mode` | limpo, **34 commits à frente da origin** | monorepo: backend + lab + web v2 + Android |
| `~/laudousg` | `luizpprazeres/Projeto-laudare` | `main` | **17 arquivos não commitados** | **a web que está em produção hoje** |
| `~/laudousg-swift/LaudoUSG` | `luizpprazeres/LaudoUSG-app` | `feat/hard-mode-toggle` | limpo, 2 commits à frente | app iOS SwiftUI |
| `~/laudousg-swift-companion` | `luizpprazeres/LaudoUSG-app` | `codex/ios-mobile-companion` | 5 arquivos dirty | worktree de trabalho iOS |
| `~/laudousgmobile-companion` | laudousgmobile (worktree) | `codex/mobile-companion` | limpo | worktree |
| `~/laudousgmobile-companion-api` | laudousgmobile (worktree) | `codex/mobile-companion-api` | limpo | worktree |
| `~/laudousgmobile-web-production` | laudousgmobile (worktree) | `codex/web-workspace-production` | limpo | worktree da reconciliação web |

**[F]** O `README.md` da raiz do monorepo está desatualizado: descreve 2 apps
(`api`, `mobile`), mas o workspace tem **4** (`api`, `lab`, `mobile`, `web`).
Também é auto-contraditório sobre `apps/mobile` (texto diz ATIVO, árvore ASCII diz CONGELADO).

### 1.1 Trabalho não commitado a preservar (NÃO pertence a este projeto)

**[F]** Em `~/laudousg`: `lib/deterministic/` (motor determinístico completo),
`components/laudar/` (6 componentes), `app/laudar-preview/`,
`__tests__/deterministic{Abdome,Tireoide,Vesicula}.test.ts`,
`docs/PLANO-rag-orquestracao-laudos.md`, `remotion-hero/`, 7 rascunhos de blog, `.env.prod`.

---

## 2. Infraestrutura: domínios, projetos e ambientes

### 2.1 Mapa de deploy verificado

**[F]** Via `vercel projects ls`, `vercel domains inspect laudousg.com`, `vercel project inspect`:

| Domínio | Projeto Vercel | Root | Repo de origem | Banco |
|---|---|---|---|---|
| **`laudousg.com` + `www.laudousg.com`** | `laudousg` | raiz | `~/laudousg` (Projeto-laudare) | **B** |
| **`sala.laudousg.com`** | `laudousgmobile` | `apps/api` | monorepo | **A** |
| **`lab.laudousg.com`** | `laudousg-lab` | `apps/lab` | monorepo | **A** |
| *(sem domínio custom)* | `laudousg-web` | `apps/web` | monorepo | **A** |

- **[F]** Nameservers de `laudousg.com`: `ns1/ns2.dns-parking.com` — DNS gerido **fora** da Vercel.
- **[F]** `app.laudousg.com` é referenciado em `apps/web/.env.example:14` como
  `NEXT_PUBLIC_API_URL`, mas **não existe** na lista de domínios do projeto.
- **[F]** Sondagem HTTP em 2026-08-09: `lab.laudousg.com` → **401** com
  `WWW-Authenticate: Basic realm="LaudoUSG.lab"` (protegido);
  `laudousg.com` → 308; `sala.laudousg.com/api/health` → `{"ok":true,"service":"laudousg-api"}`.
- **[F]** `LAB_BASIC_AUTH_USER` e `LAB_BASIC_AUTH_PASS` **estão** setados no ambiente
  Production do projeto `laudousg-lab`. O lab **não** está exposto.

### 2.2 São DOIS bancos, não um ⚠️

**[F]** A premissa "backend e banco de dados compartilhados" **não se sustenta**:

| | Banco A | Banco B |
|---|---|---|
| Supabase ref | `yldtkqrsbgcnwlydrrot` | `gimxiyjfuaqptahssqgb` |
| Nome do projeto | `laudousgmobile` | *(inacessível pelo MCP atual)* |
| Região / versão | us-east-2 · PG 17.6.1 · ACTIVE_HEALTHY | **[?]** |
| Criado em | 2026-05-14 | **[?]** |
| Consumido por | `apps/api`, `apps/lab`, `apps/web`, iOS, Android | **`laudousg.com` (a web em produção)** |

- **[F]** O MCP Supabase autenticado enxerga **apenas o projeto A** → B está em outra organização.
- **[F]** **Não existe projeto de staging.** O projeto A é o único da organização →
  desenvolvimento e produção compartilham o mesmo banco.
- **[F]** `DATABASE_URL` do monorepo aponta para `aws-1-us-east-2.pooler.supabase.com:6543`.
- **[F]** O backend acessa o Postgres com **service role**, portanto **bypassa toda RLS**
  (`packages/db/src/client.ts:6-9`). O isolamento entre contas em runtime é feito
  **em código**, com `WHERE user_id = …` explícito. As RLS protegem apenas o acesso
  direto com anon key pelos clientes.

---

## 3. Onde vivem os modelos de laudo — há QUATRO fontes

Esta é a descoberta central da fase de descoberta.

| # | Fonte | Onde | Formato | Usada por | Estado |
|---|---|---|---|---|---|
| 1 | **Renderers programáticos** | `apps/api/src/server/renderer/categories/*.ts` | código TypeScript que monta o texto | 13 categorias em produção (banco A) | **canônica de fato para o mobile** |
| 2 | **`knowledge_blocks`** (banco A) | tabela, 1480 linhas / 1348 com embedding | markdown curado por categoria × estilo × kind | caminho *writer* (LLM), via bundle determinístico | viva; alimentada até 23/07/2026 |
| 3 | **`report_template_variants`** (banco A) | tabela, 100 linhas | `template_body` texto + `renderer_schema`/`rules` jsonb | só ABDOMEN_TOTAL clássico | **esqueleto oco** (ver §3.2) |
| 4 | **`lib/categoryDefaults.ts` + `lib/fewShots.ts`** | `~/laudousg` (web em produção) | 4835 + 1910 linhas de TypeScript | `laudousg.com` (banco B) | viva, independente |

**[I]** Não existe fonte canônica única. As fontes 1 e 4 cobrem categorias sobrepostas
com código independente — risco real de divergência clínica entre o que o app gera e
o que a web gera para o mesmo exame.

### 3.1 Estilos clássico e objetivo — **[F]**

Estão no banco A, tabela `writing_styles` (enum `writing_style_code`):

| code | nome | ativo |
|---|---|---|
| `CLASSICO_COMPLETO` | Clássico completo | ✅ |
| `OBJETIVO` | Objetivo | ✅ |
| `DIRETO_OBJETIVO` | Direto objetivo | ❌ legado |
| `DETALHADO_PROTOCOLAR` | Detalhado protocolar | ❌ legado |

- O estilo OBJETIVO usa cabeçalhos **TÉCNICA / ACHADOS / IMPRESSÃO**, derivados do
  concorrente **nReport** (`app-nreport.ionic.health`), capturado em 2026-06-14 e
  documentado em `docs/nreport-modelos-objetivo.md`.
  **A grafia correta do concorrente é "nReport", não "NiPort".**
  Divergência deliberada registrada: o nReport usa `TÉCNICA / ANÁLISE / OPINIÃO`;
  o Luiz escolheu `TÉCNICA / ACHADOS / IMPRESSÃO`.
- **[F]** As 100 variantes em `report_template_variants` foram semeadas contra os
  **4** estilos, incluindo os 2 mortos.

### 3.2 A infraestrutura de personalização já existe no banco A — e está VAZIA ⭐

**[F]** Consultas de agregação em 2026-08-09:

`report_template_variants` — 100 linhas:
- **2** têm `template_body` (ambas `ABDOMEN_TOTAL`/`CLASSICO_COMPLETO`: `padrao` 1728 ch, `doppler` 2395 ch)
- **0** têm `renderer_schema` · **0** têm `rules` · **0** têm `preference_eligible = true`
- todas `version = 1`, `status = validated`

`account_report_preferences` — 2 linhas (PK `user_id + category_code`):
- **0** têm `default_variant_id` · **0** têm `renderer_preferences`

**Consequências (alta confiança):**
1. **Nenhum usuário do ecossistema mobile tem personalização real em produção.**
   Migração de dados de personalização no banco A ≈ **risco zero**.
2. O registry de modelos do banco A é um **esqueleto semeado e abandonado** (sprints DET-3/DET-4).
3. **[F]** Como `preference_eligible` é 0 em todas as linhas e o
   `GET /api/me/report-preferences` filtra por `preference_eligible = true`
   (`apps/api/src/app/api/me/report-preferences/route.ts:60-65`), a tela de variantes
   do iOS **hoje não oferece nenhuma opção** — a funcionalidade existe e está inerte.

### 3.3 Alcance real da personalização hoje no backend — **[F]**

O que um usuário do app consegue mudar hoje, no total:

| Mecanismo | Onde aplica | Alcance |
|---|---|---|
| `default_variant_id` | `loadDeterministicBundle` | escolher entre variantes curadas — **nenhuma elegível hoje** |
| `renderer_preferences.show_domingos_score` | `renderer.ts:242,245` | **só** TIREOIDE e MAMARIA |
| `renderer_preferences.show_conduct_recommendation` | idem | **só** TIREOIDE e MAMARIA |
| `profiles.default_writing_style_id` | request | clássico ↔ objetivo |
| `user_phrases` | Sala/iOS | frases de atalho do usuário (1 linha no banco) |

Nas **11 categorias com renderer programático**, o texto é montado em código TypeScript
e `template_body` é ignorado — **não há hoje nenhuma forma de o usuário alterar uma frase**.

### 3.4 A web em produção tem um modelo de personalização MUITO mais avançado ⭐

**[F]** `~/laudousg` (= `laudousg.com`, banco B) já implementa, em produção:

| Tabela / coluna | O que permite |
|---|---|
| `templates` (`user_id`, `category`, `name`, `content_text`, `is_archived`) | **o usuário cola o seu próprio modelo integral de laudo**, por categoria, com nome e arquivamento |
| `user_settings.style_preferences` jsonb | ~15 dimensões estruturadas (title_case, conclusion_format, header_completeness, section_dividers, report_verbosity, hypothesis_placement, normal_findings_handling, abbreviation_style, decimal_separator, unit_abbreviation, decimal_precision, …) |
| `user_settings.global_rules_text` | regras do usuário em texto livre, globais |
| `user_settings.global_custom_phrases` jsonb, `report_headings` text[] | frases e cabeçalhos próprios |
| `category_settings` (`rules_text`, `custom_phrases`) | regras em texto livre **por categoria** |
| `reference_reports` | "Biblioteca Clínica": marcar laudos aprovados como few-shot de estilo |
| `reports.template_id` + `template_name_snapshot` | **rastreabilidade**: qual modelo gerou cada laudo |
| `user_settings.calibration_status` | fluxo de calibração de estilo |

Telas correspondentes: `app/app/templates/page.tsx` (627 linhas, com importação em massa
e adivinhação de categoria), `app/app/biblioteca/page.tsx` (222 linhas),
`app/app/generate-rules/page.tsx`.

Ordem de composição do prompt na web (`lib/promptBuilder.ts:124-184`):
instrução base → REGRAS GLOBAIS → **stylePreferences** → REGRAS DA CATEGORIA →
**TEMPLATE (seguir estrutura)** → **referenceExamples** → ACHADOS → fecho.

**[I]** Portanto o projeto **não** é "construir personalização do zero". É
**reconciliar duas filosofias de personalização já existentes**, em dois bancos,
e eleger a canônica.

---

## 4. Pipeline de geração (backend `apps/api`) — três motores

**[F]** `apps/api/src/app/api/generate/route.ts` (~1400 linhas), SSE, `maxDuration=300`.

Etapas: JWT → validação Zod → normalização de ASR → resolução de caminho →
**[fast-path pula o structurer]** → structurer (LLM, opcional) → validator (TS puro) →
model resolver → **bundle determinístico** (substituiu o RAG vetorial) →
**renderer OU writer** → 16 pós-processadores determinísticos → sanity determinístico →
persistência → `done` → sanity IA (após o done).

### 4.1 Os três motores

| | Renderer | Writer V1 | Writer V2 |
|---|---|---|---|
| Arquivo | `pipeline/renderer.ts:180` | `pipeline/writer.ts:30` | `pipeline/writerV2/runWriterV2.ts:12` |
| LLM produz | dados tipados; **código monta o texto** | **o laudo inteiro** | um `EditPlan` JSON; código monta |
| Guards pós-writer | só comandos + sanitização | 16 guards | **nenhum** |
| Personalizável por texto? | **não** (é código) | sim (prompt) | sim (`omitSlots`, spec) |

**[F]** Comportamento **efetivo em produção**, medido em `generation_runs` (30 dias, 573 laudos):

- **Via renderer (13 categorias):** OBSTETRICA, DOPPLER_OBSTETRICO, PELVE_FEMININA,
  ABDOMEN_TOTAL, MUSCULOESQUELETICO_V2, MORFOLOGICO, TIREOIDE, VIAS_URINARIAS, MAMARIA,
  PROSTATA_SUPRAPUBICA, CERVICAL, PARTES_MOLES, ABDOMEN_SUPERIOR
- **Via writer LLM:** PAREDE_ABDOMINAL, DOPPLER_VENOSO_MMII, REGIAO_INGUINAL,
  DOPPLER_CAROTIDAS, LIVRE, TESTE, PARATIREOIDE, ESCROTAL, OCULAR, TRANSFONTANELA,
  DOPPLER_FISTULA_AV, PROSTATA_TRANSRETAL
- **Modelos em uso:** `gpt-5.4-mini` (dominante), `gpt-4.1-mini` (resíduo),
  `gpt-5.4` (modo difícil, em ABDOMEN_TOTAL e MSK), `deepseek-v4-flash` (categoria TESTE),
  `renderer/v1`, `writerV2`
- **`writerV2` rodou em produção** em 26–27/07/2026 (14 execuções) e **não voltou a rodar**.

**[F]** Divergência de configuração: o código lê `WRITER_V2_USER_ID`
(`env.ts:73`, `route.ts:480`), mas o ambiente Production da Vercel tem
`WRITER_V2_ABDOME_USER_ID`. Como o gate é fail-closed (`!== ""`), o Writer V2 está
**desligado em produção** — coerente com a decisão registrada de reverter ao writer anterior,
mas o nome divergente é uma inconsistência a resolver.

### 4.2 Ordem real de composição do prompt (caminho writer)

**[F]** `apps/api/src/server/prompts/buildSystemMessage.ts:41-127`, junção em `:126`:

| # | Camada | Origem |
|---|---|---|
| 1 | Contrato da categoria (ou `DEFAULT_SYSTEM_MESSAGE`) | `prompts/contracts/index.ts` — só 5 categorias |
| 2 | Blocos condicionais por patologia (gatilho regex no ditado) | `prompts/conditionalBlocks.ts:12-39` |
| 3 | *(subspecialty — TODO, não implementado)* | — |
| 4 | `GLOBAL_RULES_BLOCK` | `prompts/global.ts:18-209` |
| 5 | `WRITER_HARDENING_BLOCK` (opt-in) | `global.ts:229-255` |
| 6 | Style overlay (OBJETIVO etc.; CLÁSSICO = null) | `prompts/styles.ts:73-84` |
| 7 | Blocos do bundle ("BIBLIOTECA RAG VALIDADA"), ordem `modelo→regra→frase→conclusao→excecao→comentario_tecnico` | `knowledge_blocks` |
| 8 | Few-shots (`kind='exemplo'`) | idem |
| 9 | `GLOBAL_PROHIBITIONS` | `global.ts:215-223` |
| 10 | Instrução de cadeia de raciocínio | `global.ts:261-280` |

User message: `=== INSTRUÇÕES DE EDIÇÃO ===` (comandos) → `=== ACHADOS CLÍNICOS ===` (JSON).

**Nota crítica [F]:** *não existe camada de personalização do usuário nesta composição.*
A única influência do usuário é indireta: qual variante do bundle é carregada.

### 4.3 O RAG vetorial já foi aposentado

**[F]** `route.ts:713-718` declara explicitamente a aposentadoria; `queryText` é o literal
`"[deterministic_bundle]"`; `rag_blocks_skipped` é sempre `[]`; o evento SSE `rag` sempre
emite `source: "deterministic_bundle"`; não existe `retriever.ts`; a RPC
`match_knowledge_blocks` (`packages/db/src/sql/0002_retriever_rpc.sql`) não é chamada
por nenhum código de `apps/api/src`.
Embeddings ainda são **gerados** na ingestão admin (`server/admin/knowledgeIngest.ts`)
mas **nunca consultados** na geração. Decisão registrada em `docs/adr/0004`.

---

## 5. Clientes iOS e Android

**[F]** Comparativo:

| | iOS (SwiftUI) | Android (RN/Expo) |
|---|---|---|
| Modelos de laudo embarcados | não | não |
| Categorias | **30 hardcoded** (`Models/Category.swift:3-38`) | **14 hardcoded** (`src/ui/tokens.ts:129-144`) |
| Chama `/api/categories`? | **não** | **não** |
| Estilos | lê `writing_styles` do Supabase + fallback hardcoded | **3 UUIDs literais** (`app/preferencias.tsx:20-33`) |
| Variantes de máscara (UI) | **sim, funciona** (`SettingsView.swift:268-320`) | **não existe** |
| Tela "Biblioteca" | placeholder vazio | placeholder "Em breve" |
| Sanity local | `SanityChecker.swift` (4 checks) | nenhum — exibe o do servidor |
| Cache/versão de modelos | nenhum | nenhum |
| OTA | — | **sem `expo-updates`** |

**[F]** O backend tem ~40 categorias no seed; iOS conhece 30; Android conhece 14.
Nenhum dos dois consome o endpoint `/api/categories`, **que já existe**.

**[F]** Conteúdo clínico duplicado (mesmo texto em 3 lugares):
frases de atalho (`GenerateViewModel.swift:22-63` ≡ `apps/mobile/app/generate.tsx:963-983`,
byte-a-byte idênticas), lista de categorias, UUIDs de estilo,
14 calculadoras Swift ≡ 12 calculadoras TS no mobile ≡ 4 em `packages/shared`.

**[F]** `apps/mobile/src/shared/` é uma **cópia vendorizada e já divergente** de
`packages/shared/src/` — não é symlink nem import de workspace.

**[F]** Dá para atualizar modelos sem republicar os apps? **Parcialmente.**
O conteúdo do laudo é 100% servidor (sim). Mas **categoria nova não aparece em nenhum
dos dois apps**, estilo novo não aparece no Android, e variantes não existem no Android.

---

## 6. Estado do `lab.laudousg.com`

**[F]** `apps/lab`, 7.632 linhas, último commit tocando o app: **2026-06-14** (≈2 meses).
Projeto Vercel `laudousg-lab`, no ar, protegido por Basic auth.

| Rota | Estado | Depende de RAG? |
|---|---|---|
| `/` dashboard | real (Supabase), com métricas decorativas hardcoded | conta `knowledge_blocks`; título "painel de calibração rag" |
| `/testbench` | real (SSE contra prod) | quota/similaridade/tiers são vestígios do retriever |
| `/audit` | real (`generation_audit`) | colunas `rag_blocks_*` |
| `/reviewer/[id]` | real | modelo mental inteiro é RAG (tiers, cobertura, embedding) |
| `/blocks` | **dev-local-only** em prod (`outputFileTracingIncludes` vazio) | edita os snippets que viram `knowledge_blocks` |
| `/showcase`, `/changelog` | real | não |
| `/settings` | real parcial (só o toggle DET-5) | não |
| `/login` | **stub morto** (botão disabled) | não |

**[F]** `apps/lab` **pode ser arquivado sem quebrar produção**:
- nenhum app declara `@laudousg/lab` como dependência
- a única importação cross-app é `tests/showcase/generate-samples.ts:12` → um script de seed
- projeto Vercel isolado; o `vercel.json` da raiz builda só `@laudousg/api`
- as duas escritas com efeito real (commit de snippet via GitHub PAT; toggle de preferências)
  são substituíveis por `git commit` manual e pela própria API

Ressalvas: mover `apps/lab/src/lib/showcase/samples.ts` antes; reavaliar/revogar o
`GITHUB_TOKEN` (escopo `repo`, commita no `main`) se o projeto for deletado.

---

## 7. Testes, CI e observabilidade

- **[F] Não existe CI.** Sem `.github/workflows`. O único gate automático é o build
  da Vercel do `apps/api`.
- **[F] Não existe framework de teste.** Zero vitest/jest. O padrão são **83 arquivos
  `*.manual.ts`** rodados um a um com `tsx`. **`pnpm test` é um no-op silencioso** —
  qualquer CI futuro que o invoque terá falso-verde.
- **[F] Golden tests existem e são bons:** `tests/golden-deterministico/` (52 casos)
  e `tests/golden-objetivo/` (20 casos), com gate anti-falso-verde. Mas batem contra a
  **API HTTP real de produção**, consomem tokens e exigem `GOLDEN_AUTH_TOKEN`.
- **[F]** A tabela `golden_cases` existe no banco e está **vazia (0 linhas)**; não achei runner que a consuma.
- **[F] Zero testes** em `packages/db`, `apps/web`, `apps/lab`, `apps/mobile`, e nas 36 rotas de API.
- **[F] Auditoria rica já existe:** `generation_audit` (1518 linhas, ativa até hoje) grava
  `system_message_full` (o prompt inteiro), `structured_output`, `validator_result`,
  `sanity_result`, `prompt_version`, `pipeline_version`, `contract_hash`, latências por
  etapa, tokens e custo. **É a base pronta para o dissecador do Lab novo.**
- **[F]** `product_events.surface` tem CHECK `IN ('web','ios','watch')` →
  **o Android não consegue gravar telemetria**.
- **[F]** `product_events.metadata` é `z.record(z.unknown())` — jsonb aberto, sem allowlist.

### 7.1 Onde a personalização mais importa — dados reais ⭐

**[F]** `reports`, últimos 60 dias, categorias com ≥5 laudos:

| Categoria | Laudos | % editado à mão | Δ médio de caracteres |
|---|---|---|---|
| **OBSTETRICA** | 378 | **41,8 %** | **93** |
| MUSCULOESQUELETICO_V2 | 104 | 40,4 % | 263 |
| DOPPLER_OBSTETRICO | 186 | 40,3 % | 203 |
| PELVE_FEMININA | 155 | 36,8 % | 164 |
| MORFOLOGICO | 148 | 35,1 % | 181 |
| MAMARIA | 60 | 30,0 % | 142 |
| TIREOIDE | 69 | 18,8 % | 96 |
| ABDOMEN_TOTAL | 663 | 5,7 % | 220 |

**[I]** OBSTETRICA combina alto volume, **a maior taxa de edição manual** e o **menor
delta de caracteres** — ou seja, o médico faz pequenos ajustes repetitivos, exatamente
o que uma personalização de modelo elimina. Isso **valida empiricamente** a escolha de
obstétrico para a primeira implementação vertical.

**Ressalva [F]:** o banco A tem apenas **6 perfis**, **4 usuários geraram laudo em 60 dias**
e **2 editam**. Os percentuais acima refletem essencialmente um único médico.

---

## 8. Migrations e drift

**[F]** Duas trilhas paralelas:
- `packages/db/drizzle/` — 2 arquivos (baseline parcial: só `generation_audit`,
  `report_template_variants`, `account_report_preferences`)
- `packages/db/src/sql/` — 21 arquivos manuais `0001`–`0021`

**[F]** `packages/db/src/migrate.ts:20-35` lista apenas parte deles: **0003, 0004, 0005,
0018, 0019, 0020 e 0021 estão fora da lista**. Rodar `pnpm db:migrate` não os aplica.

**[F]** As tabelas `room_tokens`, `sala_schemas`, `sala_annotations`, `user_phrases`
existem no banco mas **não têm DDL em lugar nenhum do repositório**.

**[I]** O banco A é a fonte de verdade do schema; o repositório é uma documentação
parcial e defasada dele.

---

## 9. Respostas diretas às 12 perguntas da investigação

1. **A personalização pertence a conta, organização ou usuário?**
   **[F]** Hoje: **usuário individual**. Não existe tabela de organização/clínica/equipe
   em nenhum dos dois bancos. `profiles.plan` tem o valor `clinic`, mas é só um rótulo de
   plano. Introduzir conta/organização exige criar a entidade do zero.
2. **Qual é a fonte real dos modelos em produção?**
   **[F]** Depende da plataforma: mobile/iOS → renderers em **código TS** (13 categorias)
   + `knowledge_blocks` (resto); web em produção → `lib/categoryDefaults.ts` + `templates`
   do usuário. **Não há fonte única.**
3. **Os apps carregam modelos locais?**
   **[F]** Não carregam modelos, **mas** carregam listas de categorias, UUIDs de estilo e
   frases clínicas hardcoded no binário.
4. **Como são representadas as modificações por patologia?**
   **[F]** Por **quatro mecanismos distintos**, sem denominador comum:
   (a) `prompts/conditionalBlocks.ts:12-39` — 4 blocos com gatilho regex no ditado
   (PELVE anexial, TIREOIDE Hashimoto, ABDOMEN pólipo, OBSTETRICA/DOPPLER placenta),
   definidos *inline* dentro dos arquivos de contrato;
   (b) `pipeline/bundleLoader.ts:76-168` — `MODEL_VARIANT_SELECTORS`, gatilho regex que
   **troca o modelo inteiro**;
   (c) guards determinísticos pós-writer (§4.1);
   (d) ramos condicionais dentro dos renderers, sobre **dado estruturado**
   (ex.: `renderer/categories/OBSTETRICA.ts:554-567`, `gemelar = numero_fetos >= 2`).
   **[F] Assimetria crítica:** `resolveConditionalPromptBlocks` é chamado **apenas** em
   `pipeline/writer.ts:77`. Não é chamado no renderer nem no writerV2 → ditar "placenta prévia"
   em OBSTETRICA (que está no renderer) **não dispara** o `PLACENTA_BLOCK`.
5. **Quais regras são invariantes clínicas e quais são preferência de redação?**
   **[F]** Não há separação formal — `GLOBAL_RULES_BLOCK` (`prompts/global.ts:18-209`)
   mistura as duas. Dos 16 guards pós-writer, classificam-se como **segurança clínica**:
   `enforceStatedAmnioticClass`, `applyVolumePolicy`, `applyDsmPolicy`,
   `applyConfiguredCommands`, `ensurePesoFetalConclusion`, `applyDopplerOverlay`,
   `stripInvalidDumLines`, `flagImplausibleMeasures`. São **estilo/formatação**:
   `formatObjectiveEnumerations`, `stripObservationNarration`, `normalizeSectionSpacing`,
   `removeEmptyConclusionItems`, `normalizeMeasures`, `stripSpuriousMagnitudeFlags`.
   **[F]** Não existe guard bloqueante de Doppler umbilical — só `warning`
   (`deterministicSanity/dopplerObstetrico.ts:65-94`). Gemelar não tem guard de código:
   é regra de prompt em `contracts/DOPPLER_OBSTETRICO.ts`, **contrato que está fora do
   mapa ativo** (`contracts/index.ts:28-37`) — no renderer é tratado por dado estruturado.
6. **Quais sanity checks dependem de frases específicas?**
   **[F] iOS:** dos 4 checks de `SanityChecker.swift`, **3 dependem de texto literal**
   (`placeholder_vazado` acoplado à sintaxe `____`/`{LINHA_*}` do backend;
   `medida_magnitude_estranha` por regex sobre o texto; `lateralidade_inconsistente`
   por heurística lexical). O check de lateralidade tem um **bug**: o guard de supressão
   (`SanityChecker.swift:80`) testa o documento inteiro em vez da janela, e como quase todo
   laudo contém `\n\n`, ele **nunca dispara**.
   **[F]** O iOS **descarta** os eventos SSE `structured` e `sanity` do backend
   (`GenerateViewModel.swift:503-504, 522-523`) e substitui o sanity rico do servidor
   por essas 4 regexes locais.
   **[F] Servidor:** foram catalogados **28 pontos** que dependem de frase literal
   (regex sobre prosa em português) — lista completa em `02-riscos.md §2`. O Android não
   tem sanity local; só o regex `/\[REVISAR\b[^\]]*\]/g` para pintar marcadores
   (`apps/mobile/src/features/generate/reviewMarkers.tsx:6`).
   **[F] O acoplamento mais grave** é `pipeline/conclusionUtils.ts:27` — ver `02-riscos.md §1`.
7. **Como o prompt final é montado e qual a precedência?** Ver §4.2.
   **[F]** Não há camada de personalização do usuário na composição atual.
8. **Há versionamento ou cache de modelos nos apps?** **[F]** Nenhum dos dois.
9. **Dá para atualizar modelos sem publicar novas versões?** **[F]** Conteúdo do laudo,
   sim. Categorias e estilos novos, **não**.
10. **O lab tem dependências legítimas?** **[F]** Não. Pode ser arquivado (ver §6).
11. **Que informações alimentam métricas sem expor paciente?**
    **[F]** `generation_runs` (latência, tokens, custo, modelos, outcome),
    `product_events`, `user_feedback`, `quality_bulletins`, e contagens agregadas de
    `reports`. Os campos de risco são de texto livre — `reports.raw_input`,
    `generation_audit.raw_input`/`output_text`/`system_message_full` — que devem ficar
    fora de qualquer painel agregado.
12. **A Biblioteca tem backend?**
    **[F]** Em `apps/web` (monorepo): **não** — é um item de menu `disabled` com badge
    "em breve" (`LaudarRail.tsx:28`), sem rota e sem backend.
    Na web em produção (`~/laudousg`): **sim** — `templates` + `reference_reports` +
    telas funcionais.
    Nos apps iOS/Android: placeholder vazio nos dois.

---

## 10. Comandos de validação disponíveis hoje

```bash
pnpm --filter @laudousg/api typecheck     # tsc --noEmit — a verificação real que existe
pnpm --filter @laudousg/api build         # o mesmo build que a Vercel roda
pnpm typecheck                            # turbo, todos os packages
pnpm test                                 # ⚠️ NO-OP — nenhum package define "test"

GOLDEN_AUTH_TOKEN=<jwt> pnpm validate:golden:deterministico   # 52 casos, bate em prod
GOLDEN_AUTH_TOKEN=<jwt> pnpm validate:golden:objetivo         # 20 casos

pnpm exec tsx <arquivo>.manual.ts         # testes individuais (83 arquivos)
for f in $(git ls-files '*.manual.ts'); do pnpm exec tsx "$f" || echo "FAIL $f"; done
```
