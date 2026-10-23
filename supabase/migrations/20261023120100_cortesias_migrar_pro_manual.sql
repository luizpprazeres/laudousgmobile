-- [Story cortesias] As contas com profiles.plan='pro' marcado à mão (sem assinatura Apple vigente) viram
-- convite com 30 dias e voltam a plan='free'. Aplicar SÓ DEPOIS do deploy da API que lê public.cortesias,
-- senão elas perdem o Pro no intervalo. Idempotente: rodar de novo não acha mais ninguém com plan='pro'.
BEGIN;
WITH alvo AS (
  SELECT p.id FROM public.profiles p
  WHERE p.plan = 'pro' AND p.role = 'user'
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.id AND s.status IN ('active','grace') AND s.expires_at > now()
    )
), novas AS (
  INSERT INTO public.cortesias(user_id,tier,origem,fim)
  SELECT a.id,'pro','convite',now() + interval '30 days' FROM alvo a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cortesias c
    WHERE c.user_id = a.id AND c.revogada_em IS NULL AND (c.fim IS NULL OR c.fim > now())
  )
  RETURNING user_id
)
UPDATE public.profiles p SET plan = 'free' FROM alvo a WHERE p.id = a.id;
COMMIT;
