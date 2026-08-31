-- O código continua valendo 10 minutos. Ao conectar, inicia um turno exato de 4 horas.
create or replace function public.set_companion_session_turn_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.connected_at is null and new.connected_at is not null then
    new.expires_at := new.connected_at + interval '4 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists companion_session_turn_expiry on public.companion_sessions;
create trigger companion_session_turn_expiry
before update of connected_at on public.companion_sessions
for each row
execute function public.set_companion_session_turn_expiry();
