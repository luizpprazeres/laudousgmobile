-- [Story admin-fase2] C3: file only, pending review/application by the orchestrator.
-- Explicit correction requested by Luiz/orchestrator: OpenAI cache writes have no separate charge.
-- Keep the verified input/cached/output rates and the two existing price versions intact.
BEGIN;
UPDATE public.ai_model_prices
SET cache_write_per_million = NULL
WHERE provider = 'openai' AND model = 'gpt-6-luna'
  AND (version, min_input_tokens) IN (
    ('observed-2026-10-21-0', 0),
    ('observed-2026-10-21-272001', 272001)
  );
COMMIT;
