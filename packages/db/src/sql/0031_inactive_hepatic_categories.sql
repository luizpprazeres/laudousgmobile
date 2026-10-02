-- Reserva as identidades persistentes dos modelos hepáticos sem publicá-las.
-- A API ainda exige HEPATIC_REPORTS_V1_ENABLED=true e categoria active=true;
-- portanto esta migração, isoladamente, não libera geração nem seleção.
insert into public.categories (code, label, active)
values
  ('AVALIACAO_MULTIPARAMETRICA_HEPATICA', 'Avaliação multiparamétrica hepática', false),
  ('ELASTOGRAFIA_HEPATICA', 'Elastografia hepática', false)
on conflict (code) do update
set label = excluded.label;

-- O conflito preserva active de propósito: reaplicar a migração nunca desfaz
-- uma ativação explícita feita em um rollout posterior.
