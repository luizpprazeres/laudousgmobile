-- Celular como dispositivo de entrada da web.
-- Separado de room_tokens/Sala do Auxiliar: código curto de uso único e turno de 10h.

create table if not exists public.companion_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pairing_code text unique,
  pairing_expires_at timestamptz not null,
  connected_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companion_pairing_code_format check (
    pairing_code is null or pairing_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$'
  ),
  constraint companion_session_expiry_order check (expires_at > pairing_expires_at)
);

create table if not exists public.companion_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.companion_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint companion_event_kind check (kind in ('text', 'transcript', 'image_findings', 'structured_findings')),
  constraint companion_event_status check (status in ('pending', 'applied', 'dismissed')),
  constraint companion_event_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists companion_sessions_user_active_idx
  on public.companion_sessions (user_id, expires_at desc)
  where revoked_at is null;

create index if not exists companion_events_session_pending_idx
  on public.companion_events (session_id, created_at)
  where status = 'pending';

create index if not exists companion_events_user_idx
  on public.companion_events (user_id);

alter table public.companion_sessions enable row level security;
alter table public.companion_events enable row level security;

drop policy if exists companion_sessions_select_own on public.companion_sessions;
create policy companion_sessions_select_own on public.companion_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists companion_sessions_insert_own on public.companion_sessions;
create policy companion_sessions_insert_own on public.companion_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists companion_sessions_update_own on public.companion_sessions;
create policy companion_sessions_update_own on public.companion_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists companion_events_select_own on public.companion_events;
create policy companion_events_select_own on public.companion_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists companion_events_insert_own on public.companion_events;
create policy companion_events_insert_own on public.companion_events
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.companion_sessions s
      where s.id = session_id
        and s.user_id = (select auth.uid())
        and s.connected_at is not null
        and s.revoked_at is null
        and s.expires_at > now()
    )
  );

drop policy if exists companion_events_update_own on public.companion_events;
create policy companion_events_update_own on public.companion_events
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.companion_sessions from anon;
revoke all on public.companion_events from anon;
grant select, insert, update on public.companion_sessions to authenticated;
grant select, insert, update on public.companion_events to authenticated;
