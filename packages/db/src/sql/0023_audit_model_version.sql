-- 0023 — Qual MODELO gerou este laudo (projeto docs/projeto-modelos/, item 8)
--
-- APLICADA em 2026-08-11 pelo Luiz, no projeto Supabase `laudousgmobile`
-- (yldtkqrsbgcnwlydrrot) — que é o ÚNICO da organização: não há staging, dev e
-- prod são o mesmo banco. Verificada depois de aplicada: o insert com as três
-- colunas passa a funcionar (auditModelo.manual.ts), e a linha de teste que
-- ele grava é removida no próprio script.
--
-- O que faz: acrescenta TRÊS COLUNAS NULLABLE a `generation_audit`.
-- O que NÃO faz: não altera coluna existente, não apaga nada, não move dado,
-- não muda tipo. Nenhuma linha é reescrita.
--
-- Impacto em dados: ZERO. As 1.5k linhas existentes ficam com NULL nas três,
-- que é a leitura correta — elas foram geradas antes de o catálogo existir.
--
-- Custo do ALTER: instantâneo. `ADD COLUMN` nullable sem default não reescreve
-- a tabela no PostgreSQL 11+ (aqui é 17.6.1) — é só metadado.
--
-- Rollback: o DROP no fim do arquivo (comentado).
--
-- POR QUE: hoje a auditoria versiona o PROMPT (prompt_version, contract_hash,
-- pipeline_version) mas não o MODELO. Diante de um laudo estranho, a primeira
-- pergunta é "isto saiu do modelo padrão ou da personalização dele?", e hoje a
-- resposta só existe concatenada dentro de `system_message_full`, em texto
-- livre — impossível de filtrar ou agrupar.
-- =============================================================================

begin;

alter table public.generation_audit
  -- Qual catálogo montou o laudo, ex. 'OBSTETRICA/CLASSICO_COMPLETO'.
  -- NULL = não passou pelo catálogo (renderer antigo, writer, ou geração
  -- anterior ao catálogo existir).
  add column if not exists model_catalog_id text,
  -- Versão do catálogo-base no momento da geração. É o que permite dizer
  -- "estes laudos saíram da v1 do modelo" depois de o modelo evoluir.
  add column if not exists model_catalog_versao integer,
  -- Versão da personalização DO MÉDICO aplicada. NULL = saiu no modelo padrão.
  add column if not exists model_customization_versao integer;

comment on column public.generation_audit.model_catalog_id is
  'Catálogo que montou o laudo (categoria/estilo). NULL = não passou pelo catálogo.';
comment on column public.generation_audit.model_catalog_versao is
  'Versão do catálogo-base no momento da geração — o modelo pode ter evoluído desde então.';
comment on column public.generation_audit.model_customization_versao is
  'Versão da personalização do médico aplicada. NULL = laudo saiu no modelo padrão.';

-- Índice PARCIAL: só as linhas personalizadas entram. São a minoria (hoje,
-- zero), e são exatamente as que se quer achar — um índice cheio custaria
-- espaço para indexar milhares de NULLs que ninguém procura.
create index if not exists ga_personalizado_idx
  on public.generation_audit (model_customization_versao, created_at desc)
  where model_customization_versao is not null;

-- Para agrupar por modelo/versão nas métricas do Lab.
create index if not exists ga_catalogo_idx
  on public.generation_audit (model_catalog_id, model_catalog_versao)
  where model_catalog_id is not null;

commit;

-- =============================================================================
-- ROLLBACK (nada mais depende destas colunas; o código tolera a ausência delas)
--
-- begin;
--   drop index if exists public.ga_personalizado_idx;
--   drop index if exists public.ga_catalogo_idx;
--   alter table public.generation_audit
--     drop column if exists model_catalog_id,
--     drop column if exists model_catalog_versao,
--     drop column if exists model_customization_versao;
-- commit;
-- =============================================================================
