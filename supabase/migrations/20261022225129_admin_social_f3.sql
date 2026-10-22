-- [Story admin-instagram-f3] Instagram F3: controle do cron de publicação e da renovação do token.
-- Só revisão: o orquestrador aplica depois do GO, ANTES do deploy da F3 (as telas leem as colunas novas).
-- Só colunas novas em tabelas da F1 (RLS já ligado, sem policies). Acesso continua só pelo service role.
BEGIN;

-- Gravada (UPDATE condicional, status = 'publishing') imediatamente ANTES de chamar o media_publish.
-- NULL = o media_publish não foi chamado nesta tentativa: o post preso em "Publicando" pode voltar
-- para aprovado sem risco de sair duas vezes. A trava (approved → publishing) zera a coluna.
ALTER TABLE public.social_posts ADD COLUMN publish_requested_at timestamptz;

-- Fila do cron: aprovados automáticos por horário.
CREATE INDEX social_posts_fila_idx ON public.social_posts (scheduled_at) WHERE status = 'approved' AND manual = false;

-- Renovação do token longo (GET graph.instagram.com/refresh_access_token): só com 24 h ou mais de idade.
--  token_issued_at          quando o token atual foi emitido (conexão ou última renovação)
--  token_refreshed_at       última renovação bem-sucedida
--  token_refresh_failed_at  última falha da renovação (NULL depois de um sucesso ou de reconectar)
--  token_refresh_error      motivo curto da falha, sem token (a aplicação limpa antes de gravar)
ALTER TABLE public.social_accounts
  ADD COLUMN token_issued_at timestamptz,
  ADD COLUMN token_refreshed_at timestamptz,
  ADD COLUMN token_refresh_failed_at timestamptz,
  ADD COLUMN token_refresh_error text CHECK (token_refresh_error IS NULL OR length(token_refresh_error) <= 300);
-- A conta já conectada recebeu o token na conexão.
UPDATE public.social_accounts SET token_issued_at = connected_at WHERE token_issued_at IS NULL;

-- Reafirma o modelo da F1: RLS ligado, nada para anon/authenticated, só o service role.
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_posts, public.social_accounts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.social_posts TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_accounts TO service_role;

COMMIT;
