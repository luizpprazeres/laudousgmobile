# ADMIN fase 2 — dados (E1/E2) — entrega de 21/10/2026

Implementado em `~/.worktrees/laudousg-admin-dados`, branch `feat/admin-dados`, base `3677daf3`. Pronto para revisão do G3. A migração existe somente como arquivo; nenhum banco remoto foi acessado ou alterado. Sem push, deploy ou alteração de variáveis de produção.

## O que foi entregue

`ai_usage_events` registra usuário autenticado, rota, etapa, provedor, modelo efetivo, tokens, cache de leitura/escrita, duração de áudio quando informada pelo provedor, custo estimado, versão do preço, origem e identificador gerado pelo servidor. Não recebe prompt, resposta, ditado, imagem, JWS, cabeçalhos ou mensagem de exceção.

`recordUsage()` usa `after()` do Next para manter a gravação após a resposta, inclusive SSE, sem aguardar o banco na rota. Falhas de preço não impedem guardar os contadores; falhas de gravação são absorvidas e geram apenas um código fixo no log. Consultas da telemetria têm timeout de 3 segundos por operação. O contexto assíncrono separa usuários e requisições concorrentes. Sem autenticação ou fora das rotas instrumentadas não há atribuição fictícia a um usuário.

Há coleta na extração e nos writers centrais/dedicados, sanity, interpretador de comandos, roteador Livre, plano do WriterV2, edição, visão, consultor, transcrição e concessão do Deepgram. Cada chamada física de reparo do Anthropic tem seu próprio evento; o agregado retornado ao pipeline não é cobrado novamente. Falhas sem contadores finais ficam com custo nulo.

O cabeçalho válido `x-laudousg-surface` tem prioridade. Sem ele, `LaudoUSG/... CFNetwork/... Darwin/...` identifica iOS; um navegador com `Mozilla/` identifica web. Os demais ficam como `unknown` nos eventos de IA. Isso é inferência de origem, não uma prova de plataforma. A função já usada por `product_events` ganhou a mesma inferência, preservando seu fallback anterior quando não há evidência.

O Whisper passa a pedir `verbose_json` para receber duração medida pelo provedor. A resposta pública continua `{ transcript, language }`, com a mesma limpeza e normalização do texto. Os modelos GPT de transcrição usam os contadores devolvidos na resposta JSON. [Formato oficial de transcrição](https://developers.openai.com/api/docs/guides/speech-to-text).

## Preços e lacunas explícitas

O seed tem 17 linhas com URL oficial, data de conferência, versão e vigência observada. Inclui GPT-5 e seu snapshot documentado, GPT-5.4/mini e seus snapshots documentados, GPT-6 Luna, Haiku/Sonnet/Opus 5.5, Whisper e GPT-4o Transcribe/mini. Contempla os patamares de contexto longo documentados para GPT-5.4, Luna e Haiku. Entrada total inclui o cache; o cálculo subtrai leitura/escrita antes de tarifar a parte sem cache.

Os preços são da API padrão, em USD, observados em 21/10. A vigência do seed não afirma quando o fornecedor mudou cada tarifa. O catálogo em código serve de seed e estimativa isolada; a gravação real consulta `ai_model_prices`. O teste SQL compara os dois para impedir divergência. Não há aproximação de modelo desconhecido nem remoção automática de sufixo: só snapshots documentados têm linhas próprias. Ausência de preço ou medição produz `NULL`, nunca custo zero inventado. Novas tarifas devem ganhar nova versão/vigência em migração revisada.

Fontes oficiais conferidas nesta execução:

| Modelos | Fonte |
| --- | --- |
| GPT-5 | [Modelo e snapshot](https://developers.openai.com/api/docs/models/gpt-5) |
| GPT-5.4 | [Preço, snapshot e contexto longo](https://developers.openai.com/api/docs/models/gpt-5.4) |
| GPT-5.4 Mini | [Preço e snapshot](https://developers.openai.com/api/docs/models/gpt-5.4-mini) |
| GPT-6 Luna | [Preço e contexto longo](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| Claude 5.5 | [Preços Anthropic e cache](https://platform.claude.com/docs/en/about-claude/pricing) |
| Whisper | [Preço por minuto](https://developers.openai.com/api/docs/models/whisper-1) |
| GPT-4o Transcribe | [Preço por tokens](https://developers.openai.com/api/docs/models/gpt-4o-transcribe) |
| GPT-4o Mini Transcribe | [Preço por tokens](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe) |

O Deepgram recebe o áudio diretamente do app. O backend conhece a concessão do token, sem saber quantos segundos foram transcritos. Seu evento é `stage=token_grant`, `measurement=unmeasured`, áudio e custo nulos. Os 60 segundos são validade do token, não consumo. Medir sessões, usar tags/API de gestão ou acrescentar relato de duração pelo app continua dependendo do G5; nada disso foi habilitado.

`generation_audit.openai_cost_usd` passa a nulo nas novas gerações: seus tokens agregam modelos/etapas e não permitem aplicar corretamente o preço do writer a tudo. A estimativa por chamada fica em `ai_usage_events`. Não houve recálculo histórico. `generation_runs.cost_usd` e o painel antigo `/api/me/analytics` não foram migrados para a nova fonte nesta entrega; o novo admin deve consumir as views abaixo. Falhas antes do último contador, modelos fora do catálogo e o fallback Sonnet 5 sem preço cadastrado continuam visivelmente sem custo calculável. A coleta é estimativa de consumo observado, não conciliação de fatura.

## Histórico Apple e integridade

O webhook mantém o verificador Apple existente. Só depois de verificar envelope e conteúdos assinados projeta os campos mínimos para `iap_notifications`, antes de alterar `subscriptions`. Não guarda os JWS. Há tratamento também para TEST, notificações ignoradas e assinaturas sem dono conhecido.

A chave `notification_uuid` deduplica os fatos com `ON CONFLICT DO NOTHING`. Uma reentrega continua passando pela operação idempotente do domínio: parar no UUID duplicado perderia uma atualização quando a primeira entrega gravasse o histórico e falhasse na assinatura. Falha do histórico impede a mutação e resulta em 503/reentrega. Falha de resultado após mutação também permite reentrega segura.

`iap_notification_attempts` guarda os resultados de cada tentativa em novas linhas (`applied`, `stale`, `rejected`, `error`, `test`, `ignored`, `unassigned`), sem editar o fato original. Não representa vendas adicionais. O papel de serviço pode inserir/ler os fatos e tentativas, mas não atualizar ou excluir. A anonimização automática do vínculo quando a conta é excluída é feita pelo FK `ON DELETE SET NULL`.

`subscriptions` ganha `auto_renew_status` e `offer_type`. O CAS, posse, prioridade temporal, reembolso e grace permanecem no domínio existente. Ausência de renewal info preserva o último estado de renovação conhecido; uma transação verificada sem oferta limpa uma oferta antiga. Metadados de notificações atrasadas não sobrescrevem a assinatura mais recente.

## Contrato para o painel

As quatro tabelas novas têm RLS ligada e nenhuma policy. `PUBLIC`, `anon` e `authenticated` não têm grants nelas nem nas views. As views usam `security_invoker=true` e SELECT restrito ao serviço. Não são endpoints públicos; o painel ainda precisa aplicar autenticação e autorização administrativa no servidor.

| View | Uso e limites |
| --- | --- |
| `admin_user_usage` | Dia UTC, usuário, rota/etapa, provedor/modelo/origem, contadores, falhas, áudio, `known_cost_usd`, `unpriced_events`. `cost_usd` só é preenchido quando todos os eventos do grupo têm preço; somas incompletas ficam explícitas. `events` conta chamadas/concessões, não laudos. |
| `admin_generation_stats` | Gerações e erros por dia/categoria; duração média, p50 e p95. Não seleciona texto clínico do audit. Depende da cobertura já existente de `generation_audit`. |
| `admin_iap_stats` | Notificações únicas por dia de recebimento, ambiente, tipo/subtipo e produto. Sem receita estimada a partir de entregas. A ausência de dono reflete o primeiro registro imutável. |
| `admin_subscription_stats` | Estado atual por ambiente, plano, período, status, renovação e oferta. Sandbox permanece separado de Production. |

## Verificação local

| Gate | Resultado |
| --- | --- |
| `pnpm validate:admin-dados` | Aprovado: 13 grupos unitários de preço/contexto; journal/reentrega e falhas; integração do helper LLM; rotas reais com provedores sintéticos; SQL local. |
| SQL em PGlite descartável | Migração completa, paridade das 17 tarifas, RLS sem policies, ACLs de tabelas/views, INSERT-only, deduplicação, soma com custo desconhecido e exclusão de conta aprovados. Sem URL/conexão externa. |
| `pnpm typecheck` | 8/8 pacotes aprovados. |
| `pnpm test` | Aprovado: 74 suítes web; o monorepo não inclui os gates manuais da API nesse script. |
| `pnpm validate:iap` | 30/30 JWS, 56/56 domínio, 19/19 notificações aprovados. |
| `llm.manual.ts` | 31/31 aprovados, com clientes falsos e variáveis sintéticas. |
| `generate-fail-closed.manual.ts` | 41/41 cenários da rota real aprovados. O harness ganhou apenas a dependência real de contexto; suas regras clínicas não foram trocadas. |
| `livreRouter.manual.ts` | 18/18 aprovados. |
| `pnpm --filter @laudousg/api lint` | Aprovado, com o aviso preexistente de `<img>` em `app/sala/[token]/page.tsx:1262`. |
| `pnpm lint` | Não concluiu: `apps/lab` não tem configuração ESLint e o Next pede escolha interativa. Nenhuma configuração do Lab foi criada para contornar o problema. |

Os testes de IA e Apple foram sintéticos. Não houve chamada real a modelos, App Store Connect, Supabase remoto ou Deepgram. Não constituem aprovação clínica nem teste de compra real. A dependência de teste `@electric-sql/pglite` foi adicionada para tornar a verificação de SQL reproduzível.

## Commits e ordem de integração

`4ad90e9a`: base privada, preços, schemas, migração e teste SQL. `1f5f8630`: coleta por usuário e integração das rotas. `09a11cf7`: journal Apple e metadados da assinatura. Todos locais, com prefixo `[Story admin-fase2]`.

A aplicação do SQL em produção permanece pendente do GO G3 separado do Luiz. Antes de qualquer futura publicação do backend, essa migração precisa estar aplicada: o repositório de assinaturas passa a consultar as novas colunas. Aplicar o arquivo no PostgreSQL embutido do teste não altera esse gate. Não foram implementados E3 (UI), E4 (relatórios financeiros Apple), E5 (landing) ou E6 (app).

## SQL integral para revisão G3

Arquivo `supabase/migrations/20261022011955_admin_fase2_dados.sql`. O timestamp é UTC; a tarefa e conferência das fontes são de 21/10 no fuso local.

```sql
-- [Story admin-fase2] REVIEW ONLY: do not apply before GO G3.
-- All rates are USD, standard API; observed 2026-10-21, no retrospective repricing.
BEGIN;
CREATE TABLE public.ai_model_prices (
  provider text NOT NULL,
  model text NOT NULL,
  version text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  min_input_tokens integer NOT NULL DEFAULT 0 CHECK (min_input_tokens >= 0),
  input_per_million numeric(16,8) CHECK (input_per_million >= 0),
  output_per_million numeric(16,8) CHECK (output_per_million >= 0),
  cached_per_million numeric(16,8) CHECK (cached_per_million >= 0),
  cache_write_per_million numeric(16,8) CHECK (cache_write_per_million >= 0),
  audio_per_minute numeric(16,8) CHECK (audio_per_minute >= 0),
  source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
  checked_on date NOT NULL,
  PRIMARY KEY (provider, model, version),
  UNIQUE (provider, model, effective_from, min_input_tokens),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE TABLE public.ai_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL,
  stage text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cached_input_tokens integer CHECK (cached_input_tokens >= 0),
  cache_write_input_tokens integer CHECK (cache_write_input_tokens >= 0),
  audio_seconds numeric CHECK (audio_seconds >= 0),
  cost_usd numeric(16,10) CHECK (cost_usd >= 0),
  price_version text,
  measurement text NOT NULL CHECK (measurement IN ('priced', 'unpriced', 'unmeasured')),
  surface text NOT NULL CHECK (surface IN ('ios', 'web', 'watch', 'unknown')),
  request_id uuid NOT NULL,
  duration_ms integer CHECK (duration_ms >= 0),
  ok boolean NOT NULL,
  error_code text CHECK (error_code IN ('provider_error', 'aborted', 'invalid_output')),
  FOREIGN KEY (provider, model, price_version) REFERENCES public.ai_model_prices(provider, model, version),
  CHECK ((measurement = 'priced') = (cost_usd IS NOT NULL AND price_version IS NOT NULL))
);
CREATE INDEX ai_usage_user_created ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX ai_usage_created_route ON public.ai_usage_events(created_at DESC, route);
CREATE INDEX ai_usage_request ON public.ai_usage_events(request_id);
CREATE TABLE public.iap_notifications (
  notification_uuid text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  signed_date timestamptz,
  notification_type text NOT NULL,
  subtype text,
  environment text NOT NULL CHECK (environment IN ('Production', 'Sandbox')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_tx_id text,
  product_id text,
  offer_type smallint,
  offer_discount_type text,
  price_milli bigint CHECK (price_milli >= 0),
  currency text,
  auto_renew_status smallint CHECK (auto_renew_status IN (0, 1)),
  expires_at timestamptz
);
CREATE INDEX iap_notifications_received ON public.iap_notifications(received_at DESC);
CREATE INDEX iap_notifications_original_tx ON public.iap_notifications(original_tx_id);
-- Separate append-only delivery outcomes: fact insertion must precede entitlement mutation;
-- retries must not be skipped when a previous delivery saved a fact but failed applying it.
CREATE TABLE public.iap_notification_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_uuid text NOT NULL REFERENCES public.iap_notifications(notification_uuid),
  received_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('test', 'ignored', 'unassigned', 'applied', 'stale', 'rejected', 'error'))
);
CREATE INDEX iap_attempts_notification ON public.iap_notification_attempts(notification_uuid);
ALTER TABLE public.subscriptions ADD COLUMN auto_renew_status integer CHECK (auto_renew_status IN (0,1));
ALTER TABLE public.subscriptions ADD COLUMN offer_type integer;
ALTER TABLE public.ai_model_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_notification_attempts ENABLE ROW LEVEL SECURITY;
-- No policies. Explicit ACLs also protect views (which otherwise may bypass source RLS).
REVOKE ALL ON public.ai_model_prices, public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ai_model_prices, public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts FROM service_role;
GRANT SELECT ON public.ai_model_prices TO service_role;
GRANT SELECT, INSERT ON public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts TO service_role;
REVOKE ALL ON SEQUENCE public.ai_usage_events_id_seq, public.iap_notification_attempts_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ai_usage_events_id_seq, public.iap_notification_attempts_id_seq TO service_role;
-- INSERT-only journal; no raw JWS, receipts, text, patient data or auth tokens.
CREATE VIEW public.admin_user_usage WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, user_id, route, stage, provider, model, surface,
  count(*) AS events, count(*) FILTER (WHERE NOT ok) AS failed_events,
  sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens,
  sum(cached_input_tokens) AS cached_input_tokens, sum(audio_seconds) AS audio_seconds,
  sum(cost_usd) AS known_cost_usd,
  count(*) FILTER (WHERE cost_usd IS NULL) AS unpriced_events,
  CASE WHEN count(*) FILTER (WHERE cost_usd IS NULL) = 0 THEN sum(cost_usd) ELSE NULL END AS cost_usd
FROM public.ai_usage_events GROUP BY 1,2,3,4,5,6,7;
CREATE VIEW public.admin_generation_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, category,
  count(*) AS generations, count(*) FILTER (WHERE error_code IS NOT NULL) AS errors,
  avg(total_duration_ms) AS avg_duration_ms,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY total_duration_ms) AS p50_duration_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95_duration_ms
FROM public.generation_audit GROUP BY 1,2;
CREATE VIEW public.admin_iap_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', received_at AT TIME ZONE 'UTC')::date AS day,
  environment, notification_type, subtype, product_id, count(*) AS notifications,
  count(*) FILTER (WHERE user_id IS NULL) AS unattributed_notifications
FROM public.iap_notifications GROUP BY 1,2,3,4,5;
CREATE VIEW public.admin_subscription_stats WITH (security_invoker = true) AS
SELECT environment, tier, period, status, auto_renew_status, offer_type, count(*) AS subscriptions
FROM public.subscriptions GROUP BY 1,2,3,4,5,6;
REVOKE ALL ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats TO service_role;
-- PRICE_SEED below is mirrored in server/usage/pricing.ts and checked locally.
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,10,0.125,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5-2025-08-07','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,10,0.125,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-4o-transcribe','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,10,NULL,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-4o-transcribe','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-4o-mini-transcribe','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,5,NULL,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','whisper-1','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,NULL,NULL,NULL,NULL,0.006,'https://developers.openai.com/api/docs/models/whisper-1','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-6-luna','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.1,0.5,0.01,0.125,NULL,'https://developers.openai.com/api/docs/models/gpt-6-luna','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-6-luna','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,0.2,0.75,0.02,0.25,NULL,'https://developers.openai.com/api/docs/models/gpt-6-luna','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-mini','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.75,4.5,0.075,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4-mini','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,15,0.25,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,5,22.5,0.5,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-haiku-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.1,0.5,0.01,0.125,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-haiku-5-5','observed-2026-10-21-100001','2026-10-21T00:00:00Z',100001,0.5,2.5,0.05,0.625,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-sonnet-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2,10,0.1,2.5,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-opus-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,4,20,0.2,5,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-2026-03-05','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,15,0.25,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-2026-03-05','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,5,22.5,0.5,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-mini-2026-03-17','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.75,4.5,0.075,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4-mini','2026-10-21');

COMMIT;

```
