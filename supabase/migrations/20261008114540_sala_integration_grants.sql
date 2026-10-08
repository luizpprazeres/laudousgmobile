-- Credenciais efemeras e somente leitura para integracoes server-to-server da Sala.
-- O segredo em claro e devolvido uma unica vez; somente seu SHA-256 e persistido.
create table public.sala_integration_grants (
  id uuid primary key default gen_random_uuid(),
  room_token_id uuid not null references public.room_tokens(id) on delete cascade,
  grant_hash text not null unique
    check (grant_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '12 hours')
);

create index sala_integration_grants_room_token_id_idx
  on public.sala_integration_grants (room_token_id);

create index sala_integration_grants_expires_at_idx
  on public.sala_integration_grants (expires_at);

alter table public.sala_integration_grants enable row level security;
revoke all on table public.sala_integration_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.sala_integration_grants to service_role;

-- Um bucket por identificador anonimizado. O upsert mantem incremento e virada de
-- janela atomicos, inclusive quando varias instancias serverless recebem o burst.
create table public.sala_integration_rate_limits (
  key_hash text primary key
    check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  attempts integer not null check (attempts > 0),
  updated_at timestamptz not null default now()
);

create index sala_integration_rate_limits_updated_at_idx
  on public.sala_integration_rate_limits (updated_at);

alter table public.sala_integration_rate_limits enable row level security;
revoke all on table public.sala_integration_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.sala_integration_rate_limits to service_role;

create or replace function public.consume_sala_integration_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_attempts integer;
  v_window_started_at timestamptz;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.sala_integration_rate_limits as rate_limit (
    key_hash,
    window_started_at,
    window_seconds,
    attempts,
    updated_at
  ) values (
    p_key_hash,
    v_now,
    p_window_seconds,
    1,
    v_now
  )
  on conflict (key_hash) do update set
    window_started_at = case
      when rate_limit.window_started_at <= v_now - v_window then v_now
      else rate_limit.window_started_at
    end,
    window_seconds = p_window_seconds,
    attempts = case
      when rate_limit.window_started_at <= v_now - v_window then 1
      else rate_limit.attempts + 1
    end,
    updated_at = v_now
  returning attempts, window_started_at
    into v_attempts, v_window_started_at;

  allowed := v_attempts <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (v_window_started_at + v_window - v_now)))::integer
    )
  end;

  -- Limpeza oportunista e limitada. A condicao usa a duracao registrada em
  -- cada bucket, portanto nunca remove uma janela ativa, mesmo se outra rota
  -- vier a usar um prazo maior. A folga de uma hora evita disputa com chamadas
  -- que acabaram de atravessar a virada da janela.
  with stale as (
    select candidate.key_hash
    from public.sala_integration_rate_limits as candidate
    where candidate.updated_at < v_now - interval '1 hour'
      and candidate.window_started_at
        + make_interval(secs => candidate.window_seconds) < v_now - interval '1 hour'
    order by candidate.updated_at
    limit 100
    for update skip locked
  )
  delete from public.sala_integration_rate_limits as expired
  using stale
  where expired.key_hash = stale.key_hash;

  return next;
end;
$$;

revoke execute on function public.consume_sala_integration_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_sala_integration_rate_limit(text, integer, integer)
  to service_role;

-- A rota autenticada continua gerando codigos com service_role. Clientes do
-- Data API deixam de poder chamar diretamente a funcao SECURITY DEFINER legada.
revoke execute on function public.generate_pairing_code()
  from public, anon, authenticated;
grant execute on function public.generate_pairing_code()
  to service_role;
