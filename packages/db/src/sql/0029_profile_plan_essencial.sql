-- 0029_profile_plan_essencial.sql
--
-- Garante o valor 'essencial' no enum profile_plan (o tier Apple de baixo).
-- Já existe em produção (free/pro/clinic/essencial), então aqui é no-op; num
-- ambiente novo passa a existir.
--
-- Fica em arquivo PRÓPRIO por uma regra do Postgres: um valor novo de enum não
-- pode ser usado na mesma transação em que foi adicionado, e o migrate.ts
-- executa cada arquivo como uma única transação implícita. A tabela que
-- referencia 'essencial' num CHECK vem no arquivo seguinte (0030).
alter type public.profile_plan
  add value if not exists 'essencial' after 'free';
