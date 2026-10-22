-- [Story admin-fase2] Aplicada em produção em 22/10/2026 (GO G3 do Luiz), versão 20261022011955.
-- All rates are USD, standard API; observed 2026-10-21, no retrospective repricing.
BEGIN;
CREATE TABLE public.ai_model_prices (
  provider text NOT NULL,
  model text NOT NULL,
  version text NOT NULL,
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  min_input_tokens integer NOT NULL DEFAULT 0 CHECK (min_input_tokens >= 0),
  input_per_million numeric(16,8) CHECK (input_per_million >= 0),
  output_per_million numeric(16,8) CHECK (output_per_million >= 0),
  cached_per_million numeric(16,8) CHECK (cached_per_million >= 0),
  cache_write_per_million numeric(16,8) CHECK (cache_write_per_million >= 0),
  audio_per_minute numeric(16,8) CHECK (audio_per_minute >= 0),
  source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
  checked_on date NOT NULL,
  PRIMARY KEY (provider, model, version),
  UNIQUE (provider, model, effective_from, min_input_tokens),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE TABLE public.ai_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL,
  stage text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cached_input_tokens integer CHECK (cached_input_tokens >= 0),
  cache_write_input_tokens integer CHECK (cache_write_input_tokens >= 0),
  audio_seconds numeric CHECK (audio_seconds >= 0),
  cost_usd numeric(16,10) CHECK (cost_usd >= 0),
  price_version text,
  measurement text NOT NULL CHECK (measurement IN ('priced', 'unpriced', 'unmeasured')),
  surface text NOT NULL CHECK (surface IN ('ios', 'web', 'watch', 'unknown')),
  request_id uuid NOT NULL,
  duration_ms integer CHECK (duration_ms >= 0),
  ok boolean NOT NULL,
  error_code text CHECK (error_code IN ('provider_error', 'aborted', 'invalid_output')),
  FOREIGN KEY (provider, model, price_version) REFERENCES public.ai_model_prices(provider, model, version),
  CHECK ((measurement = 'priced') = (cost_usd IS NOT NULL AND price_version IS NOT NULL))
);
CREATE INDEX ai_usage_user_created ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX ai_usage_created_route ON public.ai_usage_events(created_at DESC, route);
CREATE INDEX ai_usage_request ON public.ai_usage_events(request_id);
CREATE TABLE public.iap_notifications (
  notification_uuid text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  signed_date timestamptz,
  notification_type text NOT NULL,
  subtype text,
  environment text NOT NULL CHECK (environment IN ('Production', 'Sandbox')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_tx_id text,
  product_id text,
  offer_type smallint,
  offer_discount_type text,
  price_milli bigint CHECK (price_milli >= 0),
  currency text,
  auto_renew_status smallint CHECK (auto_renew_status IN (0, 1)),
  expires_at timestamptz
);
CREATE INDEX iap_notifications_received ON public.iap_notifications(received_at DESC);
CREATE INDEX iap_notifications_original_tx ON public.iap_notifications(original_tx_id);
-- Separate append-only delivery outcomes: fact insertion must precede entitlement mutation;
-- retries must not be skipped when a previous delivery saved a fact but failed applying it.
CREATE TABLE public.iap_notification_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_uuid text NOT NULL REFERENCES public.iap_notifications(notification_uuid),
  received_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('test', 'ignored', 'unassigned', 'applied', 'stale', 'rejected', 'error'))
);
CREATE INDEX iap_attempts_notification ON public.iap_notification_attempts(notification_uuid);
ALTER TABLE public.subscriptions ADD COLUMN auto_renew_status integer CHECK (auto_renew_status IN (0,1));
ALTER TABLE public.subscriptions ADD COLUMN offer_type integer;
ALTER TABLE public.ai_model_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iap_notification_attempts ENABLE ROW LEVEL SECURITY;
-- No policies. Explicit ACLs also protect views (which otherwise may bypass source RLS).
REVOKE ALL ON public.ai_model_prices, public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ai_model_prices, public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts FROM service_role;
GRANT SELECT ON public.ai_model_prices TO service_role;
GRANT SELECT, INSERT ON public.ai_usage_events, public.iap_notifications, public.iap_notification_attempts TO service_role;
REVOKE ALL ON SEQUENCE public.ai_usage_events_id_seq, public.iap_notification_attempts_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ai_usage_events_id_seq, public.iap_notification_attempts_id_seq TO service_role;
-- INSERT-only journal; no raw JWS, receipts, text, patient data or auth tokens.
CREATE VIEW public.admin_user_usage WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, user_id, route, stage, provider, model, surface,
  count(*) AS events, count(*) FILTER (WHERE NOT ok) AS failed_events,
  sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens,
  sum(cached_input_tokens) AS cached_input_tokens, sum(audio_seconds) AS audio_seconds,
  sum(cost_usd) AS known_cost_usd,
  count(*) FILTER (WHERE cost_usd IS NULL) AS unpriced_events,
  CASE WHEN count(*) FILTER (WHERE cost_usd IS NULL) = 0 THEN sum(cost_usd) ELSE NULL END AS cost_usd
FROM public.ai_usage_events GROUP BY 1,2,3,4,5,6,7;
CREATE VIEW public.admin_generation_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day, category,
  count(*) AS generations, count(*) FILTER (WHERE error_code IS NOT NULL) AS errors,
  avg(total_duration_ms) AS avg_duration_ms,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY total_duration_ms) AS p50_duration_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95_duration_ms
FROM public.generation_audit GROUP BY 1,2;
CREATE VIEW public.admin_iap_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', received_at AT TIME ZONE 'UTC')::date AS day,
  environment, notification_type, subtype, product_id, count(*) AS notifications,
  count(*) FILTER (WHERE user_id IS NULL) AS unattributed_notifications
FROM public.iap_notifications GROUP BY 1,2,3,4,5;
CREATE VIEW public.admin_subscription_stats WITH (security_invoker = true) AS
SELECT environment, tier, period, status, auto_renew_status, offer_type, count(*) AS subscriptions
FROM public.subscriptions GROUP BY 1,2,3,4,5,6;
REVOKE ALL ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats TO service_role;
-- PRICE_SEED below is mirrored in server/usage/pricing.ts and checked locally.
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,10,0.125,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5-2025-08-07','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,10,0.125,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-4o-transcribe','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,10,NULL,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-4o-transcribe','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-4o-mini-transcribe','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,1.25,5,NULL,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','whisper-1','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,NULL,NULL,NULL,NULL,0.006,'https://developers.openai.com/api/docs/models/whisper-1','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-6-luna','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.1,0.5,0.01,0.125,NULL,'https://developers.openai.com/api/docs/models/gpt-6-luna','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-6-luna','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,0.2,0.75,0.02,0.25,NULL,'https://developers.openai.com/api/docs/models/gpt-6-luna','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-mini','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.75,4.5,0.075,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4-mini','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,15,0.25,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,5,22.5,0.5,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-haiku-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.1,0.5,0.01,0.125,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-haiku-5-5','observed-2026-10-21-100001','2026-10-21T00:00:00Z',100001,0.5,2.5,0.05,0.625,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-sonnet-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2,10,0.1,2.5,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('anthropic','claude-opus-5-5','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,4,20,0.2,5,NULL,'https://platform.claude.com/docs/en/about-claude/pricing','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-2026-03-05','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,2.5,15,0.25,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-2026-03-05','observed-2026-10-21-272001','2026-10-21T00:00:00Z',272001,5,22.5,0.5,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4','2026-10-21');
INSERT INTO public.ai_model_prices (provider,model,version,effective_from,min_input_tokens,input_per_million,output_per_million,cached_per_million,cache_write_per_million,audio_per_minute,source_url,checked_on) VALUES ('openai','gpt-5.4-mini-2026-03-17','observed-2026-10-21-0','2026-10-21T00:00:00Z',0,0.75,4.5,0.075,NULL,NULL,'https://developers.openai.com/api/docs/models/gpt-5.4-mini','2026-10-21');

COMMIT;
