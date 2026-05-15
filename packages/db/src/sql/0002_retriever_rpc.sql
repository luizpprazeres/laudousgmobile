-- =============================================================================
-- match_knowledge_blocks(...) — função RPC de retrieval RAG.
--
-- Combina filtros estruturais (categoria, estilo, status, kind) com busca
-- semântica via cosine distance no embedding. O codex destacou que filtros
-- sobre busca vetorial podem matar recall — por isso filtramos PRIMEIRO,
-- depois ordenamos por priority + similaridade.
--
-- Chamada via supabase-js / postgres direto:
--   select * from match_knowledge_blocks(
--     p_query_embedding := $1,
--     p_category_code   := $2,
--     p_writing_style_id:= $3,
--     p_kinds           := array['modelo','regra','frase'],
--     p_limit_per_kind  := 8
--   );
--
-- Estratégia anti-recall-loss:
--  - Para cada `kind` em p_kinds, fazemos uma sub-query separada com LIMIT.
--  - Isso garante diversidade (não vem só "modelo" porque ele tem priority alta).
--  - Ordenação por (priority DESC, similarity ASC).
-- =============================================================================

create or replace function public.match_knowledge_blocks(
  p_query_embedding vector(1536),
  p_category_code text,
  p_writing_style_id uuid,
  p_kinds text[],
  p_limit_per_kind int default 5,
  p_min_similarity float default 0.0
)
returns table (
  id uuid,
  category_code text,
  writing_style_id uuid,
  kind rag_block_kind,
  title text,
  content text,
  priority int,
  similarity float,
  tags text[]
)
language sql
stable
security invoker
as $$
  with per_kind as (
    select
      kb.id,
      kb.category_code,
      kb.writing_style_id,
      kb.kind,
      kb.title,
      kb.content,
      kb.priority,
      kb.tags,
      1 - (kb.embedding <=> p_query_embedding) as similarity,
      row_number() over (
        partition by kb.kind
        order by kb.priority desc, kb.embedding <=> p_query_embedding asc
      ) as rn
    from public.knowledge_blocks kb
    where kb.status = 'validated'
      and kb.category_code = p_category_code
      and kb.writing_style_id = p_writing_style_id
      and kb.kind = any(p_kinds::rag_block_kind[])
      and kb.embedding is not null
      and (1 - (kb.embedding <=> p_query_embedding)) >= p_min_similarity
  )
  select id, category_code, writing_style_id, kind, title, content,
         priority, similarity, tags
  from per_kind
  where rn <= p_limit_per_kind
  order by kind, priority desc, similarity desc;
$$;

-- Permitir chamada por authenticated (RLS de knowledge_blocks ainda se aplica
-- via security invoker — só retorna o que o user tem permissão de ver, ou seja,
-- status='validated', que é justamente o filtro hard-coded acima).
grant execute on function public.match_knowledge_blocks to authenticated;
grant execute on function public.match_knowledge_blocks to service_role;
