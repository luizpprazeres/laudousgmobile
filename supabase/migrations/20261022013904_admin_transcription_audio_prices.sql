-- [Story admin-fase2] C2 aplicada em produção em 22/10/2026 (GO G3), versão 20261022013904; eventos antigos não reescritos.
-- Audio and text input tokens must be measured separately, not charged as all-text input.
-- Official full-model example: https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription
-- Text rates: https://developers.openai.com/api/docs/pricing ; checked 2026-10-21.
-- Mini audio price stays NULL until verified in an official source (not inferred from estimated USD/min).
BEGIN;
ALTER TABLE public.ai_model_prices ADD COLUMN audio_input_per_million numeric(16,8) CHECK (audio_input_per_million >= 0);
ALTER TABLE public.ai_usage_events ADD COLUMN audio_input_tokens integer CHECK (audio_input_tokens >= 0);
ALTER TABLE public.ai_usage_events ADD COLUMN text_input_tokens integer CHECK (text_input_tokens >= 0);
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_input_modalities_check
  CHECK (audio_input_tokens + text_input_tokens = input_tokens);
UPDATE public.ai_model_prices
SET audio_input_per_million = 6,
    source_url = 'https://developers.openai.com/cookbook/examples/realtime_out_of_band_transcription'
WHERE provider = 'openai' AND model = 'gpt-4o-transcribe'
  AND version = 'observed-2026-10-21-0' AND min_input_tokens = 0;
COMMIT;
