-- Publica a categoria independente já aprovada de Doppler hepático.
-- O renderer estruturado continua fail-closed: a presença no catálogo não
-- autoriza fallback para o writer geral nem conclusão com dados incompletos.
insert into public.categories (code, label, active)
values ('DOPPLER_HEPATICO', 'Doppler hepático', true)
on conflict (code) do update
set label = excluded.label,
    active = true;
