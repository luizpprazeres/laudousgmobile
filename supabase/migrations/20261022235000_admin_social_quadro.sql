-- [Story admin-instagram-quadro] Quadro do Instagram: reagendar (arrastar para outro dia / trocar a hora)
-- e reordenar todos os slides de um carrossel de uma vez. Só revisão: o orquestrador aplica depois do GO
-- (depois das migrações admin_social e admin_social_f3). Acesso só pelo service role do /admin.
BEGIN;

-- Reagendar pelo Quadro. Só rascunho, só horário futuro, e só se o horário atual ainda for o que o
-- painel mostrou (p_de): duas abas abertas não se atropelam (a segunda recebe 'mudou').
CREATE FUNCTION public.social_reschedule(p_id text, p_de timestamptz, p_para timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_quando timestamptz;
BEGIN
  SELECT status, scheduled_at INTO v_status, v_quando FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  IF p_de IS NULL OR v_quando IS DISTINCT FROM p_de THEN RETURN 'mudou'; END IF;
  IF p_para IS NULL OR p_para <= now() THEN RETURN 'passado'; END IF;
  UPDATE public.social_posts SET scheduled_at = p_para WHERE id = p_id;
  RETURN 'ok';
END $$;

-- Reordenação completa (atômica) dos slides de um rascunho. p_ordem[i] = posição ATUAL do slide que passa
-- a ser o i-ésimo; precisa ser uma permutação de 1..n (n = slides do post). Como em social_move_item, a
-- chave (post_id, position) não muda: o conteúdo (imagem, texto, briefing, alt) troca de linha. O FROM
-- lê a foto anterior ao UPDATE, então todas as trocas acontecem "ao mesmo tempo".
CREATE FUNCTION public.social_reorder_items(p_id text, p_ordem integer[])
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_n integer; v_max integer; v_distintas integer;
BEGIN
  SELECT status INTO v_status FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  -- Posições são únicas e >= 1 (PK + CHECK): contíguas de 1 a n quando o maior número é n.
  SELECT count(*), coalesce(max(position), 0) INTO v_n, v_max FROM public.social_media_items WHERE post_id = p_id;
  IF v_n = 0 OR v_max <> v_n THEN RETURN 'ordem'; END IF;
  IF p_ordem IS NULL OR coalesce(array_ndims(p_ordem), 1) <> 1 OR cardinality(p_ordem) <> v_n THEN RETURN 'ordem'; END IF;
  SELECT count(DISTINCT x) INTO v_distintas FROM unnest(p_ordem) AS x WHERE x BETWEEN 1 AND v_n;
  IF v_distintas <> v_n THEN RETURN 'ordem'; END IF;
  UPDATE public.social_media_items a
     SET storage_path = b.storage_path, public_url = b.public_url, slide_text = b.slide_text,
         visual_brief = b.visual_brief, alt_text = b.alt_text
    FROM unnest(p_ordem) WITH ORDINALITY AS o(antiga, nova)
    JOIN public.social_media_items b ON b.post_id = p_id AND b.position = o.antiga
   WHERE a.post_id = p_id AND a.position = o.nova AND o.antiga <> o.nova;
  RETURN 'ok';
END $$;

-- As tabelas são da F1 (RLS já ligado, sem policies); repetido aqui para a migração valer sozinha.
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.social_reschedule(text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_reorder_items(text,integer[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.social_reschedule(text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_reorder_items(text,integer[]) TO service_role;

COMMIT;
