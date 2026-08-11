-- 0022 — Personalização de modelos de laudo (projeto docs/projeto-modelos/)
--
-- APLICADA em 2026-08-10 pelo Luiz, no projeto Supabase `laudousgmobile`
-- (yldtkqrsbgcnwlydrrot) — que é o ÚNICO da organização: não há staging, dev e
-- prod são o mesmo banco. Verificada depois de aplicada: as duas tabelas
-- existem, os 5 índices e as 6 policies estão no lugar, 0 linhas.
--
-- Cria DUAS tabelas novas. Não altera nenhuma tabela existente, não move dado
-- e nada no sistema lê estas tabelas ainda. Impacto em dados: ZERO.
-- Rollback: o DROP no fim do arquivo (comentado).
--
-- Decisões que sustentam este schema:
--  Q3  — escopo por usuário, com a chave preparada para conta/clínica.
--  C10 — o Codex apontou que uma chave genérica (scope_type, scope_id) perderia
--        a FK para profiles. Por isso existe `report_scopes`: a indireção fica
--        numa entidade real, com FK, em vez de um uuid solto.
--  C9  — o catálogo-base fica versionado no Git. O banco guarda apenas o
--        OVERLAY do usuário e a versão/hash do base a que ele se ancora.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- report_scopes — a quem pertence uma personalização
-- -----------------------------------------------------------------------------
-- v1 aceita só scope_type = 'user'. Quando/se existir clínica, entra
-- 'organization' no CHECK e uma coluna organization_id, sem migrar nada do que
-- já estiver aqui.
create table if not exists public.report_scopes (
  id          uuid primary key default gen_random_uuid(),
  scope_type  text not null default 'user' check (scope_type in ('user')),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (scope_type, user_id)
);

comment on table public.report_scopes is
  'Dono de uma personalização de modelo. v1: um escopo por usuário. A entidade existe para que (scope_type, scope_id) tenha integridade referencial de verdade — ver docs/projeto-modelos/04-revisao-codex.md C10.';

-- -----------------------------------------------------------------------------
-- report_model_customizations — o overlay do usuário sobre o catálogo-base
-- -----------------------------------------------------------------------------
create table if not exists public.report_model_customizations (
  id              uuid primary key default gen_random_uuid(),
  scope_id        uuid not null references public.report_scopes(id) on delete cascade,
  category_code   text not null references public.categories(code) on delete restrict,
  style_code      writing_style_code not null,

  -- Vínculo EXPLÍCITO com o modelo-base e a sua versão. É o que permite
  -- detectar conflito quando o base evoluir, em vez de sobrescrever em silêncio.
  base_catalog_id text    not null,
  base_versao     integer not null check (base_versao >= 1),

  -- Versão desta personalização. Cresce a cada publicação; as anteriores viram
  -- 'archived' e continuam legíveis (histórico, diff entre versões, rollback).
  versao          integer not null check (versao >= 1),
  status          text    not null default 'draft' check (status in ('draft','published','archived')),

  -- Lista de operações ancoradas em slot.id. Validada no backend por
  -- validateOperations() ANTES de gravar; o CHECK aqui é só o piso estrutural.
  operations      jsonb   not null default '[]'::jsonb
                    check (jsonb_typeof(operations) = 'array' and jsonb_array_length(operations) <= 200),

  note            text check (note is null or char_length(note) <= 500),
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,

  unique (scope_id, category_code, style_code, versao)
);

comment on table public.report_model_customizations is
  'Personalização do modelo de laudo como conjunto de operações sobre o catálogo-base (que vive no Git). Uma linha por versão; no máximo um rascunho e um publicado por (escopo, categoria, estilo).';
comment on column public.report_model_customizations.operations is
  'Array de operações: remove_slot | replace_phrase | append_conclusion_item. Sempre validado por validateOperations() no backend antes de gravar — o CHECK da coluna não substitui essa validação.';

-- No máximo UM rascunho e UM publicado por (escopo, categoria, estilo).
-- Versões arquivadas não entram nos índices: é o histórico.
create unique index if not exists rmc_one_draft_uidx
  on public.report_model_customizations (scope_id, category_code, style_code)
  where status = 'draft';

create unique index if not exists rmc_one_published_uidx
  on public.report_model_customizations (scope_id, category_code, style_code)
  where status = 'published';

-- Hot path da geração: buscar a personalização publicada do médico.
create index if not exists rmc_lookup_idx
  on public.report_model_customizations (scope_id, category_code, style_code, status);

-- Histórico em ordem, para a tela de versões e o rollback.
create index if not exists rmc_historico_idx
  on public.report_model_customizations (scope_id, category_code, style_code, versao desc);

-- Quem ainda aponta para uma versão antiga do base (para avisar sobre conflito
-- quando o catálogo-base for atualizado).
create index if not exists rmc_base_versao_idx
  on public.report_model_customizations (base_catalog_id, base_versao);

-- -----------------------------------------------------------------------------
-- RLS — isolamento entre contas
-- -----------------------------------------------------------------------------
-- O backend acessa via service role e BYPASSA RLS (packages/db/src/client.ts):
-- o isolamento em runtime continua sendo feito em código, com WHERE explícito.
-- Estas policies protegem o acesso direto com anon key pelos clientes.
alter table public.report_scopes enable row level security;
alter table public.report_model_customizations enable row level security;

drop policy if exists rs_select_own on public.report_scopes;
create policy rs_select_own on public.report_scopes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists rs_insert_own on public.report_scopes;
create policy rs_insert_own on public.report_scopes
  for insert to authenticated with check (auth.uid() = user_id);

-- Nas customizações o dono é alcançado pelo escopo.
drop policy if exists rmc_select_own on public.report_model_customizations;
create policy rmc_select_own on public.report_model_customizations
  for select to authenticated
  using (exists (
    select 1 from public.report_scopes s
    where s.id = report_model_customizations.scope_id and s.user_id = auth.uid()
  ));

drop policy if exists rmc_insert_own on public.report_model_customizations;
create policy rmc_insert_own on public.report_model_customizations
  for insert to authenticated
  with check (exists (
    select 1 from public.report_scopes s
    where s.id = report_model_customizations.scope_id and s.user_id = auth.uid()
  ));

drop policy if exists rmc_update_own on public.report_model_customizations;
create policy rmc_update_own on public.report_model_customizations
  for update to authenticated
  using (exists (
    select 1 from public.report_scopes s
    where s.id = report_model_customizations.scope_id and s.user_id = auth.uid()
  ));

drop policy if exists rmc_delete_own on public.report_model_customizations;
create policy rmc_delete_own on public.report_model_customizations
  for delete to authenticated
  using (exists (
    select 1 from public.report_scopes s
    where s.id = report_model_customizations.scope_id and s.user_id = auth.uid()
  ));

-- updated_at automático. Reusa public.set_updated_at(), criada em
-- 0001_extensions_and_triggers.sql. Aquele arquivo aplica o trigger a todas as
-- tabelas com a coluna, mas só no momento em que roda — tabela nova precisa do
-- trigger explícito.
drop trigger if exists set_updated_at_report_model_customizations
  on public.report_model_customizations;
create trigger set_updated_at_report_model_customizations
  before update on public.report_model_customizations
  for each row execute function public.set_updated_at();

commit;

-- =============================================================================
-- ROLLBACK (executar só se precisar desfazer; nada mais depende destas tabelas)
--
-- begin;
--   drop table if exists public.report_model_customizations;  -- leva o trigger junto
--   drop table if exists public.report_scopes;
-- commit;
--
-- set_updated_at() NÃO deve ser removida: é compartilhada com as outras tabelas.
-- =============================================================================
