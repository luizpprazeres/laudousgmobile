-- =============================================================================
-- 0005_subscriptions.sql
--
-- Adiciona plano essencial e tabela de assinaturas StoreKit 2.
--
-- Idempotente. Aplicar via:
--   supabase db push  OU  mcp__plugin_supabase_supabase__apply_migration
-- =============================================================================

alter type public.profile_plan
  add value if not exists 'essencial' after 'free';

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

create index if not exists idx_subscriptions_user_id
  on public.subscriptions(user_id);

create index if not exists idx_subscriptions_active
  on public.subscriptions(user_id, status)
  where status = 'active';

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);
