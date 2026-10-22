-- [Story admin-instagram-f1] Instagram F1: posts, slides, conta (vazia, F2) e bucket `social`.
-- Só revisão: o orquestrador aplica depois do GO. Acesso só pelo service role do /admin.
BEGIN;

CREATE TABLE public.social_posts (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  scheduled_at timestamptz NOT NULL,
  format text NOT NULL CHECK (format IN ('image','carousel','story')),
  caption text NOT NULL DEFAULT '' CHECK (length(caption) <= 2200),
  hashtags text NOT NULL DEFAULT '' CHECK (length(hashtags) <= 2200),
  alt_text text NOT NULL DEFAULT '' CHECK (length(alt_text) <= 1000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','publishing','published','failed')),
  manual boolean NOT NULL DEFAULT false,
  interaction jsonb CHECK (interaction IS NULL OR jsonb_typeof(interaction) = 'object'),
  pillar text NOT NULL DEFAULT '' CHECK (length(pillar) <= 80),
  angle text NOT NULL DEFAULT '' CHECK (length(angle) <= 80),
  title text NOT NULL DEFAULT '' CHECK (length(title) <= 300),
  notes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(notes) = 'array'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text CHECK (length(last_error) <= 500),
  ig_media_id text,
  permalink text CHECK (permalink IS NULL OR permalink ~ '^https://'),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Legenda final = caption + "\n\n" + hashtags; o Instagram aceita até 2200 caracteres.
  CONSTRAINT social_posts_legenda_len CHECK (length(caption) + CASE WHEN hashtags = '' THEN 0 ELSE length(hashtags) + 2 END <= 2200)
);
CREATE INDEX social_posts_scheduled_at_idx ON public.social_posts (scheduled_at);

CREATE TABLE public.social_media_items (
  post_id text NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 20),
  storage_path text CHECK (storage_path IS NULL OR storage_path ~ '^posts/[a-z0-9-]+/[0-9a-f]{32}\.jpg$'),
  public_url text CHECK (public_url IS NULL OR public_url ~ '^https?://'),
  slide_text text NOT NULL DEFAULT '' CHECK (length(slide_text) <= 2200),
  visual_brief text NOT NULL DEFAULT '' CHECK (length(visual_brief) <= 4000),
  alt_text text NOT NULL DEFAULT '' CHECK (length(alt_text) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, position),
  CONSTRAINT social_media_items_imagem_par CHECK ((storage_path IS NULL) = (public_url IS NULL))
);

-- F2 preenche. O token chega cifrado pela aplicação (envelope v1.<iv>.<tag>.<cifra>, base64url);
-- um token cru do Instagram não passa no CHECK.
CREATE TABLE public.social_accounts (
  ig_user_id text PRIMARY KEY CHECK (ig_user_id ~ '^[0-9A-Za-z_-]{1,64}$'),
  username text NOT NULL DEFAULT '' CHECK (username ~ '^[A-Za-z0-9._]{0,30}$'),
  token_ciphertext text NOT NULL CHECK (token_ciphertext ~ '^v1\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}$'),
  token_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.social_touch() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER social_posts_touch BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.social_touch();
CREATE TRIGGER social_media_items_touch BEFORE UPDATE ON public.social_media_items FOR EACH ROW EXECUTE FUNCTION public.social_touch();

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_posts, public.social_media_items, public.social_accounts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.social_posts TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_media_items TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_accounts TO service_role;

-- Importação idempotente por id. Cria o que falta, reescreve só rascunhos e nunca mexe em
-- approved/publishing/published/failed. Slides além do calendário saem; devolve os arquivos órfãos.
CREATE FUNCTION public.social_import(p_posts jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  p jsonb;
  v_id text;
  v_status text;
  v_n integer;
  v_criados integer := 0;
  v_atualizados integer := 0;
  v_preservados integer := 0;
  v_orfaos text[] := '{}';
BEGIN
  IF jsonb_typeof(p_posts) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'social_import: esperado array'; END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(p_posts) LOOP
    v_id := p->>'id';
    v_n := jsonb_array_length(p->'slides');
    IF v_n < 1 THEN RAISE EXCEPTION 'social_import: % sem slides', v_id; END IF;
    SELECT s.status INTO v_status FROM public.social_posts s WHERE s.id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.social_posts(id,scheduled_at,format,caption,hashtags,alt_text,manual,interaction,pillar,angle,title,notes)
      VALUES (v_id,(p->>'scheduled_at')::timestamptz,p->>'format',coalesce(p->>'caption',''),coalesce(p->>'hashtags',''),
        coalesce(p->>'alt_text',''),coalesce((p->>'manual')::boolean,false),nullif(p->'interaction','null'::jsonb),
        coalesce(p->>'pillar',''),coalesce(p->>'angle',''),coalesce(p->>'title',''),coalesce(p->'notes','[]'::jsonb));
      v_criados := v_criados + 1;
    ELSIF v_status <> 'draft' THEN
      v_preservados := v_preservados + 1;
      CONTINUE;
    ELSE
      UPDATE public.social_posts SET scheduled_at = (p->>'scheduled_at')::timestamptz, format = p->>'format',
        caption = coalesce(p->>'caption',''), hashtags = coalesce(p->>'hashtags',''), alt_text = coalesce(p->>'alt_text',''),
        manual = coalesce((p->>'manual')::boolean,false), interaction = nullif(p->'interaction','null'::jsonb),
        pillar = coalesce(p->>'pillar',''), angle = coalesce(p->>'angle',''), title = coalesce(p->>'title',''),
        notes = coalesce(p->'notes','[]'::jsonb)
      WHERE id = v_id;
      v_atualizados := v_atualizados + 1;
    END IF;
    WITH fora AS (DELETE FROM public.social_media_items WHERE post_id = v_id AND position > v_n RETURNING storage_path)
    SELECT v_orfaos || coalesce(array_agg(storage_path) FILTER (WHERE storage_path IS NOT NULL), '{}') INTO v_orfaos FROM fora;
    INSERT INTO public.social_media_items(post_id,position,slide_text,visual_brief,alt_text)
    SELECT v_id, x.position, coalesce(x.slide_text,''), coalesce(x.visual_brief,''), coalesce(x.alt_text,'')
    FROM jsonb_to_recordset(p->'slides') AS x(position integer, slide_text text, visual_brief text, alt_text text)
    ON CONFLICT (post_id,position) DO UPDATE SET slide_text = EXCLUDED.slide_text, visual_brief = EXCLUDED.visual_brief, alt_text = EXCLUDED.alt_text;
  END LOOP;
  RETURN jsonb_build_object('criados',v_criados,'atualizados',v_atualizados,'preservados',v_preservados,'orfaos',to_jsonb(v_orfaos));
END $$;

-- Edição do editor: só rascunho.
CREATE FUNCTION public.social_save_post(p_id text,p_scheduled_at timestamptz,p_caption text,p_hashtags text,p_alt_text text,p_slide_alts jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  UPDATE public.social_posts SET scheduled_at = p_scheduled_at, caption = p_caption, hashtags = p_hashtags, alt_text = p_alt_text WHERE id = p_id;
  UPDATE public.social_media_items i SET alt_text = coalesce(x.alt_text,'')
  FROM jsonb_to_recordset(coalesce(p_slide_alts,'[]'::jsonb)) AS x(position integer, alt_text text)
  WHERE i.post_id = p_id AND i.position = x.position;
  RETURN 'ok';
END $$;

-- Troca o conteúdo de dois slides vizinhos (a chave (post_id, position) não muda).
CREATE FUNCTION public.social_move_item(p_id text,p_position integer,p_delta integer)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_alvo integer := p_position + p_delta; v_n integer;
BEGIN
  IF p_delta NOT IN (-1,1) THEN RETURN 'limite'; END IF;
  SELECT status INTO v_status FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  SELECT count(*) INTO v_n FROM public.social_media_items WHERE post_id = p_id AND position IN (p_position, v_alvo);
  IF v_n <> 2 THEN RETURN 'limite'; END IF;
  UPDATE public.social_media_items a SET storage_path = b.storage_path, public_url = b.public_url, slide_text = b.slide_text,
    visual_brief = b.visual_brief, alt_text = b.alt_text
  FROM public.social_media_items b
  WHERE a.post_id = p_id AND b.post_id = p_id
    AND ((a.position = p_position AND b.position = v_alvo) OR (a.position = v_alvo AND b.position = p_position));
  RETURN 'ok';
END $$;

-- Grava a imagem de um slide (só rascunho) e devolve o caminho anterior para limpeza do Storage.
CREATE FUNCTION public.social_set_media(p_id text,p_position integer,p_storage_path text,p_public_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_anterior text;
BEGIN
  SELECT status INTO v_status FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('resultado','nao_encontrado'); END IF;
  IF v_status <> 'draft' THEN RETURN jsonb_build_object('resultado','status'); END IF;
  SELECT storage_path INTO v_anterior FROM public.social_media_items WHERE post_id = p_id AND position = p_position FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('resultado','slide'); END IF;
  UPDATE public.social_media_items SET storage_path = p_storage_path, public_url = p_public_url WHERE post_id = p_id AND position = p_position;
  RETURN jsonb_build_object('resultado','ok','anterior',v_anterior);
END $$;

-- Aprovar (draft → approved, exige imagem em todos os slides e horário futuro) e voltar para rascunho.
CREATE FUNCTION public.social_set_status(p_id text,p_status text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_format text; v_quando timestamptz; v_total integer; v_com_imagem integer;
BEGIN
  SELECT status, format, scheduled_at INTO v_status, v_format, v_quando FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF p_status = 'approved' THEN
    IF v_status <> 'draft' THEN RETURN 'status'; END IF;
    SELECT count(*), count(storage_path) INTO v_total, v_com_imagem FROM public.social_media_items WHERE post_id = p_id;
    IF v_total = 0 OR v_com_imagem < v_total THEN RETURN 'sem_imagem'; END IF;
    IF (v_format IN ('image','story') AND v_total <> 1) OR (v_format = 'carousel' AND v_total < 2) THEN RETURN 'slides'; END IF;
    IF v_quando <= now() THEN RETURN 'passado'; END IF;
    UPDATE public.social_posts SET status = 'approved' WHERE id = p_id;
  ELSIF p_status = 'draft' THEN
    IF v_status NOT IN ('approved','failed') THEN RETURN 'status'; END IF;
    UPDATE public.social_posts SET status = 'draft', attempts = 0, last_error = NULL WHERE id = p_id;
  ELSE
    RETURN 'status';
  END IF;
  RETURN 'ok';
END $$;

REVOKE ALL ON FUNCTION public.social_touch() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_import(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_save_post(text,timestamptz,text,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_move_item(text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_set_media(text,integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_set_status(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.social_import(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_save_post(text,timestamptz,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_move_item(text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_set_media(text,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_set_status(text,text) TO service_role;

-- Bucket público só com imagens de marketing (JPEG até 8 MB). Sem policies em storage.objects:
-- leitura pela URL pública; envio e listagem só com o service role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('social', 'social', true, 8388608, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
