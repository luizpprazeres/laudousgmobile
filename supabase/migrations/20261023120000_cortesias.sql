-- [Story cortesias] Pro liberado por convite/cortesia, com prazo, fora da App Store.
-- O plano efetivo (apps/api) = maior entre profiles.plan, a assinatura Apple vigente e a cortesia vigente.
-- Review only: orchestrator applies after approval. Sem coluna de texto livre nem dado pessoal.
BEGIN;
CREATE TABLE public.cortesias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('essencial','pro')),
  origem text NOT NULL DEFAULT 'convite' CHECK (origem IN ('convite','cortesia')),
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz NULL, -- null = sem prazo
  revogada_em timestamptz NULL,
  criado_por uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fim IS NULL OR fim > inicio)
);
CREATE INDEX idx_cortesias_user_id ON public.cortesias(user_id);
ALTER TABLE public.cortesias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cortesias FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.cortesias TO service_role;

-- Escrita do painel só por estas funções (invoker; só o service_role executa).
CREATE FUNCTION public.cortesia_conceder(p_user uuid,p_dias integer,p_criado_por uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid; v_fim timestamptz;
BEGIN
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 365 THEN RETURN jsonb_build_object('resultado','dias'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN RETURN jsonb_build_object('resultado','sem_perfil'); END IF;
  INSERT INTO public.cortesias(user_id,tier,origem,fim,criado_por)
  VALUES (p_user,'pro','convite',now() + make_interval(days => p_dias),p_criado_por)
  RETURNING id,fim INTO v_id,v_fim;
  RETURN jsonb_build_object('resultado','ok','id',v_id,'fim',v_fim);
END $$;

CREATE FUNCTION public.cortesia_estender(p_id uuid,p_dias integer)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE c public.cortesias%ROWTYPE;
BEGIN
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 365 THEN RETURN 'dias'; END IF;
  SELECT * INTO c FROM public.cortesias WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF c.revogada_em IS NOT NULL THEN RETURN 'revogada'; END IF;
  IF c.fim IS NULL THEN RETURN 'sem_prazo'; END IF;
  -- vencida: conta a partir de agora; vigente: soma ao fim
  UPDATE public.cortesias SET fim = greatest(c.fim, now()) + make_interval(days => p_dias) WHERE id = p_id;
  RETURN 'ok';
END $$;

CREATE FUNCTION public.cortesia_revogar(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.cortesias SET revogada_em = now() WHERE id = p_id AND revogada_em IS NULL;
  IF FOUND THEN RETURN 'ok'; END IF;
  IF EXISTS (SELECT 1 FROM public.cortesias WHERE id = p_id) THEN RETURN 'revogada'; END IF;
  RETURN 'nao_encontrado';
END $$;

REVOKE ALL ON FUNCTION public.cortesia_conceder(uuid,integer,uuid), public.cortesia_estender(uuid,integer), public.cortesia_revogar(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.cortesia_conceder(uuid,integer,uuid), public.cortesia_estender(uuid,integer), public.cortesia_revogar(uuid) TO service_role;
COMMIT;
