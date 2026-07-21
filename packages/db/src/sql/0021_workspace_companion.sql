-- 0021_workspace_companion.sql
-- Sessao de turno entre o Workspace web e o celular do mesmo medico.
-- Separada de room_tokens: a Sala continua sendo um fluxo independente.

create table if not exists public.workspace_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  pairing_code  text not null unique,
  expires_at    timestamptz not null,
  paired_at     timestamptz,
  device_label  text,
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint workspace_sessions_pairing_code_format
    check (pairing_code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$')
);

create index if not exists workspace_sessions_user_created_idx
  on public.workspace_sessions (user_id, created_at desc);

create index if not exists workspace_sessions_active_code_idx
  on public.workspace_sessions (pairing_code, expires_at)
  where ended_at is null;

create table if not exists public.workspace_inputs (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.workspace_sessions (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  client_event_id  text not null,
  kind             text not null,
  category_code    text,
  payload          jsonb not null,
  status           text not null default 'pending',
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  constraint workspace_inputs_kind_check
    check (kind in ('text', 'measurements')),
  constraint workspace_inputs_status_check
    check (status in ('pending', 'applied', 'dismissed')),
  constraint workspace_inputs_event_unique
    unique (session_id, client_event_id)
);

create index if not exists workspace_inputs_session_pending_idx
  on public.workspace_inputs (session_id, created_at asc)
  where status = 'pending';

alter table public.workspace_sessions enable row level security;
alter table public.workspace_inputs enable row level security;

drop policy if exists workspace_sessions_own on public.workspace_sessions;
drop policy if exists workspace_inputs_own on public.workspace_inputs;

drop policy if exists workspace_sessions_select_own on public.workspace_sessions;
create policy workspace_sessions_select_own on public.workspace_sessions
  for select using (auth.uid() = user_id);

drop policy if exists workspace_sessions_insert_own on public.workspace_sessions;
create policy workspace_sessions_insert_own on public.workspace_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists workspace_sessions_update_own on public.workspace_sessions;
create policy workspace_sessions_update_own on public.workspace_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workspace_sessions_delete_own on public.workspace_sessions;
create policy workspace_sessions_delete_own on public.workspace_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists workspace_inputs_select_own on public.workspace_inputs;
create policy workspace_inputs_select_own on public.workspace_inputs
  for select using (auth.uid() = user_id);

drop policy if exists workspace_inputs_insert_own_session on public.workspace_inputs;
create policy workspace_inputs_insert_own_session on public.workspace_inputs
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspace_sessions session
      where session.id = session_id and session.user_id = auth.uid()
    )
  );

drop policy if exists workspace_inputs_update_own on public.workspace_inputs;
create policy workspace_inputs_update_own on public.workspace_inputs
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspace_sessions session
      where session.id = session_id and session.user_id = auth.uid()
    )
  );

drop policy if exists workspace_inputs_delete_own on public.workspace_inputs;
create policy workspace_inputs_delete_own on public.workspace_inputs
  for delete using (auth.uid() = user_id);
