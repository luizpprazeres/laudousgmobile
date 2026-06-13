-- DET-5 ONDA 2 (Luiz 2026-06-13) — toggles do renderer por conta × categoria.
-- Coluna JSONB genérica em account_report_preferences (recomendação dex1: não
-- criar tabela nova; a row já é por user × categoria). Hoje usada pela TIREOIDE:
--   { "show_domingos_score": bool, "show_conduct_recommendation": bool }
-- null/ausente → defaults do renderer (Domingos ON, conduta OFF).
-- Idempotente. SQL vivo, roda após as drizzle migrations.

ALTER TABLE account_report_preferences
  ADD COLUMN IF NOT EXISTS renderer_preferences jsonb;
