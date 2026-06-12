-- DET-4 follow-up (decisão Luiz 2026-06-12) — preference_eligible:
-- variantes contextuais (1t/2t/3t, ta/tv, doppler, pos-abortamento, tvp-only…)
-- NÃO aparecem no picker de preferências do app; o contexto do ditado é
-- soberano. Só variantes de ESTILO (opt-in explícito) são elegíveis.
-- Idempotente. SQL vivo, roda após drizzle migrations.

ALTER TABLE report_template_variants
  ADD COLUMN IF NOT EXISTS preference_eligible boolean NOT NULL DEFAULT false;

-- Elegíveis hoje: apenas as variantes de estilo de MAMARIA (padrao + enxuta demo).
-- Novas variantes de estilo entram com o flag via admin API / lab.
UPDATE report_template_variants
SET preference_eligible = true
WHERE category_code = 'MAMARIA'
  AND variant_key IN ('padrao', 'enxuta');
