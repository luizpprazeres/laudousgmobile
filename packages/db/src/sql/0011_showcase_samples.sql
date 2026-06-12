-- Showcase (lab) — amostras de laudo fictícias por categoria/variante para
-- inspeção visual rápida no lab.laudousg.com/showcase. Idempotente.
CREATE TABLE IF NOT EXISTS category_showcase_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_key text NOT NULL UNIQUE,
  category_code text NOT NULL REFERENCES categories(code) ON DELETE restrict,
  variant_label text NOT NULL DEFAULT '',
  writing_style_id uuid NOT NULL,
  raw_input text NOT NULL,
  laudo text NOT NULL,
  model_writer text,
  latency_ms integer,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE category_showcase_samples ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só via service role (lab server-side).
