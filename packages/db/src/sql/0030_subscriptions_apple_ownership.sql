-- 0030_subscriptions_apple_ownership.sql
--
-- ASSINATURAS DA APP STORE — tabela `subscriptions` com posse e ambiente.
--
-- A 0005 declarou esta tabela, mas nunca entrou na lista do migrate.ts e a
-- tabela NÃO existe em produção (descoberto em 21/08; /api/me/profile tolera
-- a ausência). Esta migração é autossuficiente e idempotente: cria a tabela se
-- faltar (mesma DDL da 0005) e acrescenta as duas colunas do modelo de posse.
--
--   app_account_token  o `appAccountToken` fixado pelo app na compra = id do
--                      usuário Supabase. É a prova de posse: uma transação só
--                      é aceita para o usuário cujo id é igual ao token, e uma
--                      linha nunca troca de user_id.
--   environment        'Production' | 'Sandbox' — de onde veio o JWS
--                      verificado (Sandbox é o que o revisor da Apple usa).
--
-- Quem escreve é SÓ a API (service_role, via DATABASE_URL). O cliente
-- autenticado só lê a própria linha (RLS). Segue a regra da 0024/0028: tabela
-- nova declara os próprios grants, nada herdado do padrão do Supabase.
--
-- Requer 0029 (valor 'essencial' no enum) aplicada ANTES, em transação própria.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  tier public.profile_plan not null,
  period text not null,
  apple_original_tx_id text not null unique,
  apple_latest_tx_id text not null,
  expires_at timestamp with time zone not null,
  is_trial boolean not null default false,
  status text not null default 'active',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint subscriptions_tier_check check (tier in ('essencial', 'pro')),
  constraint subscriptions_period_check check (period in ('monthly', 'yearly')),
  constraint subscriptions_status_check check (status in ('active', 'expired', 'grace', 'cancelled', 'refunded'))
);

alter table public.subscriptions
  add column if not exists app_account_token uuid;

alter table public.subscriptions
  add column if not exists environment text not null default 'Production';

alter table public.subscriptions
  add column if not exists apple_purchase_date timestamptz,
  add column if not exists apple_signed_date timestamptz,
  add column if not exists revision integer not null default 0;

create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);

create index if not exists idx_subscriptions_active
  on public.subscriptions(user_id, status)
  where status = 'active';

create index if not exists idx_subscriptions_app_account_token
  on public.subscriptions(app_account_token);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Grants explícitos (0024/0028): anon nada; authenticated só SELECT (a RLS
-- restringe à própria linha); service_role escreve.
revoke all on public.subscriptions from anon;
revoke all on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
