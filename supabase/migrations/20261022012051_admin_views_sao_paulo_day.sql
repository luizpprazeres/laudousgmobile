-- [Story admin-fase2] Review only: new migration, not applied by Codex.
-- Daily buckets use Sao Paulo civil dates, independent of the database session timezone.
-- admin_subscription_stats is a current-state snapshot without a daily bucket; preserve its contract.
BEGIN;
CREATE OR REPLACE VIEW public.admin_user_usage WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, user_id, route, stage, provider, model, surface,
  count(*) AS events, count(*) FILTER (WHERE NOT ok) AS failed_events,
  sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens,
  sum(cached_input_tokens) AS cached_input_tokens, sum(audio_seconds) AS audio_seconds,
  sum(cost_usd) AS known_cost_usd,
  count(*) FILTER (WHERE cost_usd IS NULL) AS unpriced_events,
  CASE WHEN count(*) FILTER (WHERE cost_usd IS NULL) = 0 THEN sum(cost_usd) ELSE NULL END AS cost_usd
FROM public.ai_usage_events GROUP BY 1,2,3,4,5,6,7;
CREATE OR REPLACE VIEW public.admin_generation_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, category,
  count(*) AS generations, count(*) FILTER (WHERE error_code IS NOT NULL) AS errors,
  avg(total_duration_ms) AS avg_duration_ms,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY total_duration_ms) AS p50_duration_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_ms) AS p95_duration_ms
FROM public.generation_audit GROUP BY 1,2;
CREATE OR REPLACE VIEW public.admin_iap_stats WITH (security_invoker = true) AS
SELECT date_trunc('day', received_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
  environment, notification_type, subtype, product_id, count(*) AS notifications,
  count(*) FILTER (WHERE user_id IS NULL) AS unattributed_notifications
FROM public.iap_notifications GROUP BY 1,2,3,4,5;
CREATE OR REPLACE VIEW public.admin_subscription_stats WITH (security_invoker = true) AS
SELECT environment, tier, period, status, auto_renew_status, offer_type, count(*) AS subscriptions
FROM public.subscriptions GROUP BY 1,2,3,4,5,6;
REVOKE ALL ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_user_usage, public.admin_generation_stats, public.admin_iap_stats, public.admin_subscription_stats TO service_role;
COMMIT;
