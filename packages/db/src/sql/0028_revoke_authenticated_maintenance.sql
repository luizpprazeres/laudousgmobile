-- T5 — complemento de menor privilégio após 0024.
-- Local, ainda não aplicada em produção. Reaplicável pelo migrate.ts.
-- As 24 tabelas do levantamento não são uma lista congelada: abranger também
-- tabelas adicionadas depois evita conservar o mesmo grant padrão nelas.
-- Isto não altera default privileges; novas tabelas devem declarar seus grants.
revoke truncate, trigger on all tables in schema public from authenticated;

-- O perfil nasce em handle_new_user() (SECURITY DEFINER, migração 0001).
-- Remover o grant de tabela e qualquer grant de INSERT por coluna. SELECT e
-- UPDATE permitidos por 0024, políticas RLS e grants de service_role permanecem.
revoke insert on public.profiles from authenticated;

do $$
declare
  profile_columns text;
begin
  select string_agg(format('%I', attname), ', ' order by attnum)
    into profile_columns
    from pg_catalog.pg_attribute
   where attrelid = 'public.profiles'::regclass
     and attnum > 0
     and not attisdropped;

  execute format(
    'revoke insert (%s) on public.profiles from authenticated',
    profile_columns
  );
end;
$$;

-- Verificação efetiva (não só ACL direta), em BEGIN/ROLLBACK isolado:
-- select c.oid::regclass
-- from pg_catalog.pg_class c
-- join pg_catalog.pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind in ('r', 'p', 'f')
--   and (has_table_privilege('authenticated', c.oid, 'TRUNCATE')
--        or has_table_privilege('authenticated', c.oid, 'TRIGGER'));
-- Deve retornar zero linhas. Se houver grants herdados/PUBLIC, investigar
-- antes de aplicar; esta migração só retira os grants diretos de authenticated.
-- select has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
--        has_any_column_privilege('authenticated', 'public.profiles', 'INSERT');
-- Ambos devem ser false. Conferir também UPDATE(name)=true, UPDATE(role)=false
-- e INSERT de reports/web_reports/user_feedback conforme 0024.
--
-- Rollback: no ensaio, ROLLBACK. Após aplicação, restaurar SOMENTE os grants
-- removidos, usando o snapshot de relacl/attacl anterior aprovado por Zelador.
-- Não usar GRANT ALL nem conceder INSERT de tabela se antes só havia colunas.
