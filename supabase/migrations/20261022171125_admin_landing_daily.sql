-- [Story admin-fase2] E5. Review only: orchestrator applies after approval.
BEGIN;
CREATE TABLE public.landing_daily (
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  path text NOT NULL DEFAULT '' CHECK (path IN ('/','/privacidade','/termos','/suporte','/excluir-conta','/aviso-medico','/baixar')),
  event text NOT NULL DEFAULT '' CHECK (event IN ('view','qr_open','baixar')),
  src text NOT NULL DEFAULT '' CHECK (src = '' OR src ~ '^[a-z0-9-]{1,32}$'),
  ref_host text NOT NULL DEFAULT '' CHECK (length(ref_host) <= 253),
  utm_source text NOT NULL DEFAULT '' CHECK (utm_source = '' OR utm_source ~ '^[a-z0-9._-]{1,40}$'),
  utm_campaign text NOT NULL DEFAULT '' CHECK (utm_campaign = '' OR utm_campaign ~ '^[a-z0-9._-]{1,40}$'),
  device text NOT NULL DEFAULT '' CHECK (device IN ('iphone','ipad','android','desktop')),
  count bigint NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY(day,path,event,src,ref_host,utm_source,utm_campaign,device)
);
ALTER TABLE public.landing_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.landing_daily FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.landing_daily TO service_role;
-- Invoker, not definer. Only the service role can execute or mutate the counter.
CREATE FUNCTION public.landing_increment(p_day date,p_path text,p_event text,p_src text,p_ref_host text,p_utm_source text,p_utm_campaign text,p_device text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO public.landing_daily(day,path,event,src,ref_host,utm_source,utm_campaign,device,count)
  VALUES(p_day,p_path,p_event,p_src,p_ref_host,p_utm_source,p_utm_campaign,p_device,1)
  ON CONFLICT(day,path,event,src,ref_host,utm_source,utm_campaign,device)
  DO UPDATE SET count = public.landing_daily.count + 1;
$$;
REVOKE ALL ON FUNCTION public.landing_increment(date,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.landing_increment(date,text,text,text,text,text,text,text) TO service_role;
COMMIT;
