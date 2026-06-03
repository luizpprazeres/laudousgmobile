INSERT INTO writing_styles (id, code, name, description, active)
VALUES (
  '44444444-4444-4444-8444-444444444444',
  'OBJETIVO',
  'Objetivo',
  'Estrutura técnica concisa, frases curtas e preservação integral dos dados clínicos relevantes.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('web', 'ios', 'watch')),
  event_name TEXT NOT NULL,
  step TEXT,
  session_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_user_time
  ON product_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_time
  ON product_events (event_name, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_events_first_login_once
  ON product_events (user_id, event_name)
  WHERE event_name = 'user.first_login';

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_events_select_own ON product_events;
CREATE POLICY product_events_select_own
  ON product_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS product_events_insert_own ON product_events;
CREATE POLICY product_events_insert_own
  ON product_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
