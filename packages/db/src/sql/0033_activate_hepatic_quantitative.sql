-- Modelos aprovados: formulário estruturado, registro técnico versionado e renderer dedicado.
insert into public.categories (code, label, active)
values
  ('AVALIACAO_MULTIPARAMETRICA_HEPATICA', 'Avaliação multiparamétrica hepática', true),
  ('ELASTOGRAFIA_HEPATICA', 'Elastografia hepática', true)
on conflict (code) do update set label = excluded.label, active = excluded.active;
