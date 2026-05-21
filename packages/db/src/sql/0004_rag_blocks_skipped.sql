-- =============================================================================
-- 0004_rag_blocks_skipped.sql
--
-- Adiciona generation_audit.rag_blocks_skipped pra suportar o Painel
-- Dissecador (Fase 3 do ADR-0001).
--
-- Ref: ADR-0001 §6.11 — trilha forense de RAG
--
-- Idempotente. Aplicar via:
--   supabase db push  OU  mcp__plugin_supabase_supabase__apply_migration
-- =============================================================================

alter table public.generation_audit
  add column if not exists rag_blocks_skipped jsonb default '[]'::jsonb;

comment on column public.generation_audit.rag_blocks_skipped is
  'Blocos RAG que match na busca semântica mas foram cortados por quota_por_kind. Permite UI dissecadora mostrar "quase entrou, mas saiu por quota". Cada item segue o mesmo shape de rag_blocks_retrieved (id, kind, title, content, priority, similarity).';
