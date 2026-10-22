# Instagram F1 — entrega de 22/10/2026

Pronto para revisão local na branch `feat/admin-instagram`, no worktree `~/.worktrees/laudousg-admin-instagram`, criado de `origin/main` em `cb2b561f`. Escopo: [story admin-instagram-f1](../stories/2026-10-22-admin-instagram-f1.md) e o [plano aprovado](../plano-agendador-instagram-2026-10-21.md). Não houve push, deploy, env na Vercel, migração aplicada nem contato com a Meta/Instagram. O SQL rodou só em Postgres embarcado e descartável (PGlite).

## O que entrou

- **Migração** `supabase/migrations/20261022212039_admin_social.sql` (SQL completo no fim deste documento): `social_posts`, `social_media_items` (PK `(post_id, position)`), `social_accounts` vazia para a F2 e o bucket `social` (público, só `image/jpeg`, até 8 MB). RLS ligado, sem policies, `revoke all` de `PUBLIC`, `anon`, `authenticated`; grants só para `service_role`. Toda escrita passa por funções `SECURITY INVOKER` com `search_path = ''`, executáveis só pelo `service_role`, e que travam o post (`FOR UPDATE`):
  - `social_import(jsonb)`: cria o que falta, reescreve só rascunhos, preserva `approved/publishing/published/failed`; slides além do calendário saem e o caminho das imagens órfãs volta para limpeza no Storage.
  - `social_save_post`, `social_move_item`, `social_set_media`: só em rascunho.
  - `social_set_status`: `draft → approved` exige imagem em **todos** os slides (stories manuais incluídos), quantidade coerente com o formato (foto/story: 1; carrossel: 2+) e horário futuro; `approved|failed → draft` zera tentativas e erro.
- **Camada de dados** `apps/admin/src/lib/social/*`: leitura do calendário (tudo ou nada), fuso de São Paulo via `Intl`, regras do editor, validação de JPEG (tipo declarado + assinatura + dimensões lidas do marcador SOF), acesso ao Supabase pela allowlist de colunas (`colunas.ts` ganhou `social_posts` e `social_media_items`; `social_accounts` nunca é lida).
- **Rotas** `POST /admin/api/social/{importar,salvar,ordem,status,midia}` (formulário HTML → 303). O middleware já exige a sessão; cada handler confere de novo origem do POST, sessão, allowlist, MFA conforme config e `profiles.role='admin'` (`contextoPost` + `verificarSessao`). Falhou → 404, sem tocar no banco.
- **Telas** `/admin/instagram` (semana por padrão e mês; feed e stories em faixas separadas; selo de status; “Manual” nos stories com sticker; contagem de imagens por post; importação do JSON pelo próprio painel) e `/admin/instagram/<id>` (legenda, hashtags, alt do post e de cada slide, data/hora em São Paulo, ↑/↓ dos slides, upload por slide, prévia, Aprovar e Voltar para rascunho com o motivo do bloqueio). Item “Instagram” no menu. Nenhum JavaScript novo no navegador.
- **CSP**: `img-src 'self' data: https://<projeto>.supabase.co/storage/v1/object/public/social/` — só o caminho público do bucket, derivado de `SUPABASE_URL` no build. Sem URL válida, nada é liberado. As outras diretivas não mudaram.

## Mapeamento do calendário

| Calendário | Banco |
|---|---|
| `feed[].formato = foto` | `image` (mais de um slide = erro) |
| `carrossel` / `viral` com 2+ slides | `carousel` |
| `carrossel` / `viral` com 1 slide | `image` |
| `stories[]` | `story`, um slide com `texto` e `visual` |
| `publicacao: "manual"` | `manual = true`; `interacao` → `interaction` |
| `data` + `hora` | `scheduled_at` em `America/Sao_Paulo` (outro `fuso` no arquivo = erro) |
| `legenda`, `hashtags`, `alt`, `titulo`, `pilar`, `angulo`, `verificar[]` | `caption`, `hashtags`, `alt_text`, `title`, `pillar`, `angle`, `notes` |
| `quadro` (stories) | `pillar` |

O calendário real (`copy/calendario-instagram.json`, 16 posts de feed + 64 stories) passa inteiro: 8 carrosséis, 8 fotos, 36 stories automáticos e 28 manuais, 111 slides.

## Evidência de validação

```
pnpm --filter @laudousg/admin typecheck   → tsc --noEmit sem erros
pnpm --filter @laudousg/admin test        → tests 59 · pass 58 · fail 0 · skipped 1
pnpm --filter @laudousg/admin build       → Compiled successfully; rotas /instagram, /instagram/[id] e /api/social/* geradas
```

O teste pulado é o do calendário real, que não está versionado neste checkout. Rodado à parte com `CALENDARIO_INSTAGRAM=<main>/copy/calendario-instagram.json`: passa. `sem-texto-clinico.test.ts` continua verde.

`apps/admin/tests/social.test.ts` cobre:
- mapeamento (formato, manual, interação, fuso, notas, alt do slide) e 11 casos de recusa “tudo ou nada”;
- conversão de fuso e intervalos de semana/mês;
- migração real no PGlite: RLS sem policies, nenhum privilégio de `anon`/`authenticated` em tabelas e funções, bucket só JPEG/8 MB, token cru recusado em `social_accounts`, colunas da allowlist existem;
- importação idempotente (duas vezes = mesmo estado), `approved` e `published` não mudam ao reimportar, rascunhos atualizam, slide excedente devolve o arquivo órfão;
- aprovação sem imagem bloqueada (carrossel parcial e story manual), horário passado bloqueado, aprovado não edita/troca imagem, troca de ordem leva imagem e texto juntos;
- upload: PNG renomeado, tipo declarado errado, JPEG sem SOF, vazio, acima de 8 MB, 1080×1920 no feed e 1080×1350 no story;
- rotas: sem admin → 404 sem chamar o banco; fluxo feliz; formato da imagem vem do banco, não do formulário;
- CSP gerado pelo `next.config.ts` com `SUPABASE_URL` definido.

## Decisões tomadas por conta própria

1. **Escrita só por funções SQL** com trava do post, como em `apple_store_batch`, em vez de vários `update` pelo PostgREST.
2. **Reimportar sobrescreve rascunhos**, inclusive edições feitas no painel (é o que a story pede); a tela de importação avisa. Imagens já enviadas ficam no slide da mesma posição. Slides além do novo total são apagados com a imagem (arquivo removido do Storage).
3. **Edição, upload e reordenação só em rascunho.** Para mexer num aprovado, “Voltar para rascunho” primeiro. `failed` também pode voltar.
4. **Dimensão exigida por formato**: feed (foto/carrossel) 1080×1350; story 1080×1920. A API do Instagram recusa 9:16 no feed.
5. **Aprovar exige horário futuro**, para a F2 não publicar na hora um post vencido.
6. **Contagem de slides**: foto e story = 1; carrossel = 2 a 20.
7. **Stories**: sem legenda; `quadro` vira `pillar`; o título no calendário cai para a primeira linha do texto.
8. **Envelope do token** em `social_accounts`: CHECK `v1.<iv>.<tag>.<cifra>` (base64url). A F2 precisa cifrar nesse formato; token cru do Instagram não entra.
9. **Caminho no Storage** `posts/<id>/<32 hex>.jpg` (nome aleatório, evita cache velho na troca); a imagem anterior é apagada depois que a nova é ligada ao slide.
10. **Fixture reduzida** `tests/fixtures/social/calendario.json` (3 posts de feed e 2 stories copiados do calendário). O calendário completo não foi versionado.
11. **Menu**: o item fica destacado também em `/instagram/<id>` (prefixo); os demais itens não mudam de comportamento.

## Pendências e riscos

- **Aplicar a migração** (orquestrador, depois do GO). Até lá a tela mostra “Tabelas do Instagram indisponíveis”.
- **`SUPABASE_URL` precisa existir no build da Vercel** para o CSP liberar as prévias; sem ela, as imagens não aparecem (falha fechada).
- **Limite de corpo da Vercel (~4,5 MB por requisição de função)**: a validação aceita até 8 MB, como pede a story, mas em produção uploads acima de ~4,5 MB devem falhar antes do handler. Artes 1080×1350 em JPEG costumam ficar abaixo de 2 MB. Se precisar de 8 MB de verdade, a saída é upload assinado direto no Storage (pede `connect-src` para o Storage).
- **Validação visual no navegador com sessão real** não foi feita (sem Supabase local nem sessão de admin neste ambiente). Os componentes foram renderizados no servidor em teste descartável e o build passou.
- O rodapé lateral do painel ainda diz “Só leitura”; não mexi por estar fora do escopo.
- Arquivos órfãos no Storage só são limpos na reimportação e na troca de imagem; não há varredura.
- F2–F4 (OAuth, publicação, cron, Insights) fora do escopo.

## SQL da migração (para revisão)

```sql
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
```
