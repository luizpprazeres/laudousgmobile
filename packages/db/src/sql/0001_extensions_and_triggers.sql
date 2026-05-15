-- =============================================================================
-- Extensions + triggers + funções auxiliares
-- Aplicar APÓS as migrations Drizzle. (drizzle-kit não gera extensions/triggers
-- complexos — mantemos esses como SQL vivo e versionado.)
-- =============================================================================

-- Extensions
create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Trigger: ao criar usuário em auth.users, criar row em public.profiles
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', null),
    'user',
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Trigger: updated_at automático em todas tabelas com a coluna
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema='public' and column_name='updated_at'
  loop
    execute format(
      'drop trigger if exists set_updated_at_%I on public.%I; '
      'create trigger set_updated_at_%I before update on public.%I '
      'for each row execute function public.set_updated_at();',
      t, t, t, t
    );
  end loop;
end$$;
