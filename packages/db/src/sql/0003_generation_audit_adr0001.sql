-- =============================================================================
-- generation_audit (ADR-0001 §2.3) — Observabilidade Fase 0.5
-- =============================================================================
--
-- Propósito:
--   Materializa a tabela de audit log descrita em ADR-0001 §2.3
--   (`docs/adr/0001-camada-geracao-laudos.md` do repo laudousg-swift).
--   Rastreabilidade total da nova pipeline de geração (Normalizer → Parser →
--   RAG → Writer → Sanity), pré-requisito da Fase 0.5 (Observabilidade real).
--
-- Referência:
--   /Users/luizprazeres/laudousg-swift/LaudoUSG/docs/adr/0001-camada-geracao-laudos.md
--   Seção 2.3 "Decisões técnicas concretas" + Seção 5 "Cronograma" (Fase 0.5).
--
-- Status:
--   ⚠️  NÃO APLICADA EM PRODUÇÃO.
--   Este arquivo é DDL de referência, criado durante desenho da Fase 0.5.
--   Aplicação manual via MCP Supabase (`mcp__plugin_supabase_supabase__apply_migration`)
--   ou `supabase db push` quando a Fase 0.5 iniciar. Luiz revisa antes.
--
-- Compatibilidade com Drizzle:
--   A tabela `generation_audit` JÁ EXISTE no schema Drizzle
--   (`packages/db/src/schema/generationAudit.ts`) com um superset de colunas
--   focado em métricas de pipeline (durations, tokens, custo OpenAI).
--   Esta migration é ADITIVA: adiciona as colunas ADR-0001-específicas
--   (`rag_block_ids`, `normalizer_diffs`, `input_normalized`,
--   `medical_feedback`, `metadata`) sem remover nada. Os `CREATE ... IF NOT EXISTS`
--   garantem idempotência caso ainda não exista (dev/staging zerados).
--
-- TODO antes de aplicar:
--   1. Decidir: refletir as novas colunas no schema Drizzle
--      (`packages/db/src/schema/generationAudit.ts`) e rodar `drizzle-kit generate`?
--   2. Confirmar mapeamento input_raw ↔ raw_input e output_raw ↔ output_text
--      (nomes diferem entre ADR e schema atual).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela base (idempotente — só cria se não existir)
-- -----------------------------------------------------------------------------
create table if not exists public.generation_audit (
  id                  uuid          primary key default gen_random_uuid(),
  created_at          timestamptz   not null default now(),
  user_id             uuid          references auth.users(id) on delete set null,
  category            text          not null,
  prompt_version      text,
  contract_hash       text,
  rag_block_ids       text[]        not null default '{}',
  normalizer_diffs    jsonb         not null default '[]'::jsonb,
  input_raw           text          not null,
  input_normalized    text,
  output_raw          text,
  pipeline_version    text          not null,
  generation_ms       integer,
  medical_feedback    jsonb,
  report_id           uuid          references public.reports(id) on delete set null,
  metadata            jsonb         not null default '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 2. Colunas ADR-0001-específicas (idempotente — adiciona se faltar)
--    Usado quando a tabela já existe via Drizzle migration 0000.
-- -----------------------------------------------------------------------------
alter table public.generation_audit
  add column if not exists rag_block_ids     text[]  not null default '{}',
  add column if not exists normalizer_diffs  jsonb   not null default '[]'::jsonb,
  add column if not exists input_normalized  text,
  add column if not exists medical_feedback  jsonb,
  add column if not exists metadata          jsonb   not null default '{}'::jsonb;

-- Nota: `input_raw` e `output_raw` (nomes do ADR) podem já existir como
-- `raw_input` e `output_text` (nomes do schema Drizzle atual). Por isso
-- NÃO criamos aliases nem fazemos rename aqui — deixar a unificação como
-- decisão consciente do Luiz quando aplicar.

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.generation_audit enable row level security;

-- Drop existing policies (caso re-aplicação) — service_role bypassa RLS
-- automaticamente, mas mantemos policy explícita pra clareza.
drop policy if exists "generation_audit_select_own"        on public.generation_audit;
drop policy if exists "generation_audit_service_role_all"  on public.generation_audit;

-- SELECT: usuário lê seu próprio audit OU service_role lê tudo
create policy "generation_audit_select_own"
  on public.generation_audit
  for select
  using (
    auth.uid() = user_id
    or (select auth.jwt() ->> 'role') = 'service_role'
  );

-- INSERT/UPDATE/DELETE: SOMENTE service_role (backend usa service key).
-- Cliente nunca insere direto — backend é a única fonte de verdade.
create policy "generation_audit_service_role_all"
  on public.generation_audit
  for all
  using ((select auth.jwt() ->> 'role') = 'service_role')
  with check ((select auth.jwt() ->> 'role') = 'service_role');

-- -----------------------------------------------------------------------------
-- 4. Índices
-- -----------------------------------------------------------------------------

-- Dashboard do usuário: laudos por user, mais recentes primeiro
create index if not exists idx_gen_audit_user_created
  on public.generation_audit (user_id, created_at desc);

-- Análise A/B por categoria × versão de pipeline (v1 legacy vs v2 nova arquitetura)
create index if not exists idx_gen_audit_category_pipeline_created
  on public.generation_audit (category, pipeline_version, created_at desc);

-- Métricas globais por versão de pipeline (rollout/rollback)
create index if not exists idx_gen_audit_pipeline_created
  on public.generation_audit (pipeline_version, created_at desc);

-- GIN para queries em normalizer_diffs (ex: "quantas vezes 'oito' → '8' rodou?")
create index if not exists idx_gen_audit_normalizer_diffs_gin
  on public.generation_audit using gin (normalizer_diffs);

-- GIN para queries flexíveis em metadata
create index if not exists idx_gen_audit_metadata_gin
  on public.generation_audit using gin (metadata);

-- -----------------------------------------------------------------------------
-- 5. Comentários (auto-documentação no banco)
-- -----------------------------------------------------------------------------
comment on table public.generation_audit is
  'Audit log de geração de laudos. ADR-0001 §2.3 (Fase 0.5 — Observabilidade). '
  'Insert exclusivo via service_role (backend). RLS: user lê o seu, admin/service lê tudo.';

comment on column public.generation_audit.pipeline_version is
  'v1 = pipeline legacy (one-shot); v2 = nova arquitetura (Normalizer → Parser → RAG → Writer → Sanity)';

comment on column public.generation_audit.normalizer_diffs is
  'Array JSON de {from, to, reason} aplicados pelo Normalizer (etapa 0) — vazio quando sem mudanças';

comment on column public.generation_audit.rag_block_ids is
  'IDs dos knowledge_blocks retornados pelo retriever — vazio quando geração sem RAG';

comment on column public.generation_audit.medical_feedback is
  'Feedback estruturado do médico (nullable, preenchido posteriormente via UI de review)';

comment on column public.generation_audit.metadata is
  'Contexto livre: estilo de escrita, frases customizadas usadas, flags de experimento, etc.';
