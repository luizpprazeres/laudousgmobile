-- Story 2.12 (Laudo Alinhado) — a conexão com o Laudo Alinhado passa a durar até
-- a sala expirar (decisão de Luiz em 2026-10-11), sem o teto de 12 h da 2.7.
-- O código já calcula expires_at = validade da sala (integrationGrantExpiry);
-- a restrição antiga de 12 h fazia a gravação do grant falhar e o connect
-- responder 503 "integration_unavailable".
-- Mantém um limite de sanidade: códigos de sala duram até 365 dias.
alter table public.sala_integration_grants drop constraint if exists sala_integration_grants_check1;
alter table public.sala_integration_grants
  add constraint sala_integration_grants_validade_maxima
  check (expires_at <= created_at + interval '400 days');
